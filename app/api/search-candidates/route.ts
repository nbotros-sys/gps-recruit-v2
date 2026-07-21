import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

const CANDIDATE_FIELDS = "id, name, current_title, current_company, location, tags, avatar_url, email, phone, notes, cv_text, applications(ai_score, mandate:mandates(title))"

// Extract the most relevant parts of a CV for AI scoring.
// CVs start with contact info / headers — the real content (experience, skills)
// is in the middle. We take a generous slice and strip obvious noise.
function extractCVContent(cvText: string | null | undefined, notes: string | null | undefined): string {
  const raw = cvText || notes || ""
  if (!raw) return ""

  // Take up to 4000 chars — enough for 2-3 full job roles + skills section
  // Skip first 200 chars which are usually name/address/contact header noise
  const stripped = raw.length > 300 ? raw.slice(200) : raw
  return stripped.slice(0, 4000).trim()
}

// Expand a short search query into a rich candidate profile description.
// This makes "finance director who reports to the board" match candidates
// whose CVs talk about P&L, stakeholder management, board packs — even if
// their title is "Head of Finance" or "Financial Controller".
async function expandQuery(query: string): Promise<string> {
  const prompt = `A recruiter is searching for candidates with this query: "${query}"

Write a 100-150 word paragraph describing what an ideal matching candidate would look like professionally. Include:
- What they would actually do day-to-day
- What their responsibilities and scope would be
- What skills, tools or experience they would have
- What seniority level and context (team size, budget, industry) they might come from
- Alternative job titles they might hold

Write as a description of a person, not a job spec. Return ONLY the paragraph.`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 250,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    const data = await res.json()
    await recordUsage("anthropic", "claude-sonnet-4-6", "ai-search", data?.usage)
    const expanded = data.content?.[0]?.text?.trim() || ""
    if (expanded.length > 80) return `${query}\n${expanded}`
  } catch {}
  return query
}

// AI re-ranks a batch of candidates against the query.
// Returns scored matches — only those genuinely relevant.
async function aiRankBatch(query: string, candidates: any[]): Promise<any[]> {
  if (!candidates.length) return []

  const summaries = candidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    title: c.current_title,
    company: c.current_company,
    location: c.location,
    tags: (c.tags || []).slice(0, 8),
    // Give AI real CV content to reason over — not just surface fields
    cv: extractCVContent(c.cv_text, c.notes),
  }))

  const prompt = `You are a senior recruitment consultant reviewing candidates for a search.

SEARCH: "${query}"

CANDIDATES (read their full CV content carefully):
${JSON.stringify(summaries)}

For each candidate, score them 0-100 based on TWO factors combined:
1. SUITABILITY (0-50 pts): Does their actual experience match what this search needs? Read what they DO, not just their title. A "Financial Controller" doing P&L, board reporting and team management fits a "Finance Director" search well.
2. SENIORITY (0-50 pts): Is their experience level right for this search? Junior candidates score low for senior searches and vice versa. Look at years of experience, team sizes managed, budget ownership, reporting lines.

Add both scores for the final 0-100.

Include anyone with combined score >= 20. Be generous — it is better to show too many than too few. Do not exclude candidates just because their title differs — read what they actually do.

Return ONLY a JSON array (no markdown):
[{ "id": "<id>", "score": <0-100>, "reason": "<one sentence explaining both suitability and seniority match>" }]`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    const data = await res.json()
    await recordUsage("anthropic", "claude-sonnet-4-6", "ai-search", data?.usage)
    const text = data.content?.[0]?.text || "[]"
    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean)
  } catch { return [] }
}

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: "No query" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const q = query.trim()

  // ── FAST PATH 1: Email ────────────────────────────────────────────────────
  if (q.includes("@")) {
    const { data } = await supabase.from("candidates").select(CANDIDATE_FIELDS)
      .ilike("email", `%${q}%`).limit(20)
    if (data?.length) {
      return NextResponse.json({
        results: data.map((c: any) => ({ ...c, relevance_score: 100, match_reason: `Email matches` })),
        searchMethod: "email"
      })
    }
  }

  // ── FAST PATH 2: Phone ────────────────────────────────────────────────────
  const digits = q.replace(/[^0-9+]/g, "")
  if (digits.length >= 7) {
    const { data: allCands } = await supabase.from("candidates").select(CANDIDATE_FIELDS)
      .not("phone", "is", null).limit(500)
    const phoneMatches = (allCands || []).filter((c: any) => {
      const stored = (c.phone || "").replace(/[^0-9+]/g, "")
      return stored.includes(digits) || digits.includes(stored.slice(-8))
    })
    if (phoneMatches.length) {
      return NextResponse.json({
        results: phoneMatches.map((c: any) => ({ ...c, relevance_score: 100, match_reason: `Phone matches` })),
        searchMethod: "phone"
      })
    }
  }

  // ── FAST PATH 3: Name ─────────────────────────────────────────────────────
  const nameWords = q.split(" ").filter((w: string) => w.length > 1)
  if (nameWords.length >= 2 && nameWords.length <= 4 && !q.includes(" in ") && !q.includes(" with ") && !q.includes(" who ")) {
    const { data: nameMatches } = await supabase.from("candidates").select(CANDIDATE_FIELDS)
      .ilike("name", `%${q}%`).limit(10)
    if (nameMatches?.length) {
      return NextResponse.json({
        results: nameMatches.map((c: any) => ({ ...c, relevance_score: 100, match_reason: `Name matches` })),
        searchMethod: "name"
      })
    }
  }

  // ── SEMANTIC SEARCH: embed query directly, no expansion needed ─────────────
  // Embeddings are rich enough that raw query finds semantically similar candidates
  let vectorCandidates: any[] = []
  let searchMethod = "semantic"

  try {
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: q }),
    })

    if (embeddingRes.ok) {
      const embeddingData = await embeddingRes.json()
      await recordUsage("openai", "text-embedding-3-small", "embedding", embeddingData.usage)
      const queryVector = embeddingData.data[0].embedding

      // Search entire DB — no cap on match_count, threshold 0.25 for maximum recall
      const { data: vectorResults, error: vecError } = await supabase.rpc("match_candidates", {
        query_embedding: queryVector,
        match_threshold: 0.1,  // Very low — let AI do the filtering
        match_count: 500,
      })
      if (vecError) console.error("Vector search error:", vecError)

      if (!vecError && vectorResults?.length > 0) {
        const ids = vectorResults.map((r: any) => r.candidate_id)
        const { data: fullData } = await supabase.from("candidates").select(CANDIDATE_FIELDS).in("id", ids)

        vectorCandidates = ids
          .map((id: string) => {
            const cand = fullData?.find((c: any) => c.id === id)
            const vec = vectorResults.find((r: any) => r.candidate_id === id)
            return cand ? { ...cand, vector_similarity: vec?.similarity } : null
          })
          .filter(Boolean)
      }
    }
  } catch (err) {
    console.error("Vector search error:", err)
  }

  // If vector search found nothing (no embeddings yet), fall back to full DB
  if (!vectorCandidates.length) {
    searchMethod = "full_scan"
    const { data } = await supabase.from("candidates").select(CANDIDATE_FIELDS).limit(500)
    vectorCandidates = data || []
  }

  if (!vectorCandidates.length) return NextResponse.json({ results: [], searchMethod })

  // ── AI RE-RANKING IN PARALLEL BATCHES ────────────────────────────────────
  // All batches run simultaneously — same quality, much faster
  const BATCH_SIZE = 40
  const batches: any[][] = []
  for (let i = 0; i < vectorCandidates.length; i += BATCH_SIZE) {
    batches.push(vectorCandidates.slice(i, i + BATCH_SIZE))
  }

  const batchResults = await Promise.all(batches.map(batch => aiRankBatch(q, batch)))
  const allScored: any[] = batchResults.flat()

  // Sort by score and build final results
  const results = allScored
    .filter((m: any) => m.score >= 20)
    .sort((a: any, b: any) => b.score - a.score)
    .map((m: any) => {
      const c = vectorCandidates.find((c: any) => c.id === m.id)
      return c ? { ...c, relevance_score: m.score, match_reason: m.reason } : null
    })
    .filter(Boolean)

  return NextResponse.json({ results, searchMethod })
}
