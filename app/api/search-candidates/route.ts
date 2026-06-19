import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const CANDIDATE_FIELDS = "id, name, current_title, current_company, location, tags, avatar_url, email, phone, notes, applications(ai_score, mandate:mandates(title))"

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: "No query" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const q = query.trim()

  // ── FAST PATH 1: Email lookup ─────────────────────────────────────────────
  if (q.includes("@")) {
    const { data } = await supabase
      .from("candidates").select(CANDIDATE_FIELDS)
      .ilike("email", `%${q}%`).limit(20)
    if (data?.length) {
      return NextResponse.json({
        results: data.map((c: any) => ({ ...c, relevance_score: 100, match_reason: `Email matches "${q}"` })),
        searchMethod: "email"
      })
    }
  }

  // ── FAST PATH 2: Phone lookup ─────────────────────────────────────────────
  const digits = q.replace(/[^0-9+]/g, "")
  if (digits.length >= 7) {
    const { data: allCands } = await supabase
      .from("candidates").select(CANDIDATE_FIELDS)
      .not("phone", "is", null).limit(500)
    const phoneMatches = (allCands || []).filter((c: any) => {
      const stored = (c.phone || "").replace(/[^0-9+]/g, "")
      return stored.includes(digits) || digits.includes(stored.slice(-8))
    })
    if (phoneMatches.length) {
      return NextResponse.json({
        results: phoneMatches.map((c: any) => ({ ...c, relevance_score: 100, match_reason: `Phone matches "${q}"` })),
        searchMethod: "phone"
      })
    }
  }

  // ── FAST PATH 3: Name exact/partial match ─────────────────────────────────
  const nameWords = q.split(" ").filter((w: string) => w.length > 1)
  if (nameWords.length >= 2 && nameWords.length <= 4 && !q.includes(" in ") && !q.includes(" with ")) {
    const { data: nameMatches } = await supabase
      .from("candidates").select(CANDIDATE_FIELDS)
      .ilike("name", `%${q}%`).limit(10)
    if (nameMatches?.length) {
      return NextResponse.json({
        results: nameMatches.map((c: any) => ({ ...c, relevance_score: 100, match_reason: `Name matches "${q}"` })),
        searchMethod: "name"
      })
    }
  }

  // ── VECTOR SEARCH ─────────────────────────────────────────────────────────
  // Lower threshold (0.3) = wider net, let AI re-ranker do the filtering
  // Fewer candidates to Claude (25 max) = faster, more accurate
  let candidates: any[] = []
  let searchMethod = "fallback"

  try {
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: q }),
    })

    if (embeddingRes.ok) {
      const embeddingData = await embeddingRes.json()
      const queryVector = embeddingData.data[0].embedding

      const { data: vectorResults, error: vecError } = await supabase.rpc("match_candidates", {
        query_embedding: queryVector,
        match_threshold: 0.3,   // Wider net — was 0.55, too strict
        match_count: 25,         // Top 25 only — was 100, too many for AI
      })

      if (!vecError && vectorResults?.length > 0) {
        searchMethod = "vector"
        const ids = vectorResults.map((r: any) => r.candidate_id)
        const { data: fullData } = await supabase
          .from("candidates").select(CANDIDATE_FIELDS).in("id", ids)

        // Preserve vector similarity order
        candidates = ids
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

  // ── FALLBACK: keyword search (not dump-all) ───────────────────────────────
  // Only used if vector search fails entirely. Search by title/company/tags.
  if (!candidates.length) {
    searchMethod = "keyword"
    const words = q.split(" ").filter((w: string) => w.length > 2)
    const keyword = words[0] || q  // Use first meaningful word

    const { data: kwResults } = await supabase
      .from("candidates").select(CANDIDATE_FIELDS)
      .or(`current_title.ilike.%${keyword}%,current_company.ilike.%${keyword}%,location.ilike.%${keyword}%`)
      .limit(25)

    candidates = kwResults || []
  }

  if (!candidates.length) return NextResponse.json({ results: [], searchMethod })

  // ── AI RE-RANKING ─────────────────────────────────────────────────────────
  // Only 25 candidates max — fast, focused, accurate
  const summaries = candidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    title: c.current_title,
    company: c.current_company,
    location: c.location,
    tags: (c.tags || []).slice(0, 8),
    summary: (c.notes || "").slice(0, 150),
  }))

  const prompt = `You are a recruitment consultant matching candidates to a search query.

QUERY: "${q}"

CANDIDATES:
${JSON.stringify(summaries)}

Score each candidate 0-100 for how well they match the query. Only include candidates with score >= 40. Be generous — partial matches are fine, return them with a lower score rather than excluding them.

Respond ONLY with a JSON array (no markdown):
[{ "id": "<id>", "score": <0-100>, "reason": "<one short sentence why>" }]`

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,  // Was 3000 — 25 candidates needs far less
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const aiData = await aiRes.json()
  const text = aiData.content?.[0]?.text || "[]"
  const clean = text.replace(/```json|```/g, "").trim()
  const matches = JSON.parse(clean)

  const results = matches
    .sort((a: any, b: any) => b.score - a.score)
    .map((m: any) => {
      const c = candidates.find((c: any) => c.id === m.id)
      return c ? { ...c, relevance_score: m.score, match_reason: m.reason } : null
    })
    .filter(Boolean)

  return NextResponse.json({ results, searchMethod })
}
