import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

// Extract what the JD actually requires as a semantic description —
// not bullet points, but what the person would actually do and be.
async function expandJD(mandate_title: string, job_description: string): Promise<string> {
  const prompt = `Read this job description and write a 150-200 word paragraph describing the ideal candidate — not the job requirements, but what the person would actually look like professionally.

Include:
- What they do day to day in their current or previous roles
- The scale of their experience (team sizes, budgets, scope)
- Industries and sectors they may have worked in
- Alternative job titles this person might hold right now
- Skills and tools they would use routinely
- Seniority level and who they typically report to or manage

Job title: ${mandate_title}
Job description: ${job_description.slice(0, 3000)}

Return ONLY the paragraph. No headings.`

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
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || job_description.slice(0, 2000)
  } catch {
    return job_description.slice(0, 2000)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { mandate_id, job_description, mandate_title } = await req.json()
    if (!job_description) return NextResponse.json({ error: "No JD" }, { status: 400 })

    const supabase = createClient()
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get candidates already in this pipeline
    const { data: existing } = await supabase
      .from("applications").select("candidate_id").eq("mandate_id", mandate_id)
    const existingIds = (existing || []).map((a: any) => a.candidate_id)

    // ── STEP 1: Expand JD into semantic candidate description ─────────────────
    const expandedJD = await expandJD(mandate_title, job_description)
    const searchText = `${mandate_title}\n${expandedJD}`

    // ── STEP 2: Embed the expanded JD and vector search ───────────────────────
    let vectorCandidateIds: string[] = []

    try {
      const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "text-embedding-3-small", input: searchText.slice(0, 8000) }),
      })

      if (embeddingRes.ok) {
        const embeddingData = await embeddingRes.json()
        const queryVector = embeddingData.data[0].embedding

        const { data: vectorResults } = await adminSupabase.rpc("match_candidates", {
          query_embedding: queryVector,
          match_threshold: 0.25,   // Wide net — AI does the real filtering
          match_count: 500,
        })

        if (vectorResults?.length) {
          vectorCandidateIds = vectorResults
            .filter((r: any) => !existingIds.includes(r.candidate_id))
            .map((r: any) => r.candidate_id)
        }
      }
    } catch (err) {
      console.error("Vector search error:", err)
    }

    // ── STEP 3: Fetch candidates — vector results first, then rest ────────────
    let available: any[] = []

    if (vectorCandidateIds.length) {
      const { data: vectorCands } = await supabase
        .from("candidates")
        .select("id, name, current_title, current_company, location, tags, notes, cv_text")
        .in("id", vectorCandidateIds)

      // Also fetch candidates without embeddings (new imports not yet embedded)
      const { data: allCands } = await supabase
        .from("candidates")
        .select("id, name, current_title, current_company, location, tags, notes, cv_text")
        .not("id", "in", `(${[...existingIds, ...vectorCandidateIds].join(",") || "null"})`)
        .limit(100)

      available = [
        ...(vectorCands || []),
        ...(allCands || []).filter((c: any) => !vectorCandidateIds.includes(c.id))
      ].filter((c: any) => !existingIds.includes(c.id))
    } else {
      // No embeddings yet — fall back to all candidates
      const { data: allCands } = await supabase
        .from("candidates")
        .select("id, name, current_title, current_company, location, tags, notes, cv_text")
        .order("created_at", { ascending: false })
      available = (allCands || []).filter((c: any) => !existingIds.includes(c.id))
    }

    if (!available.length) {
      return NextResponse.json({
        total_available: 0,
        strong_matches: [],
        possible_matches: [],
        summary: "No candidates available outside this pipeline yet.",
      })
    }

    // ── STEP 4: AI deep matching — reads actual CV content against JD ─────────
    // Process in batches of 30, give AI real CV text to reason over
    const BATCH_SIZE = 30
    const allMatches: any[] = []

    for (let i = 0; i < available.length; i += BATCH_SIZE) {
      const batch = available.slice(i, i + BATCH_SIZE)

      const summaries = batch.map((c: any) => ({
        id: c.id,
        name: c.name,
        title: c.current_title,
        company: c.current_company,
        location: c.location,
        tags: toArray(c.tags).slice(0, 6),
        // Give AI real CV text — this is where we catch role variations
        cv: (c.cv_text || c.notes || "").slice(0, 600),
      }))

      const prompt = `You are a senior recruitment consultant reviewing candidates for this role.

ROLE: ${mandate_title}

JOB DESCRIPTION (key requirements):
${job_description.slice(0, 1500)}

CANDIDATES TO REVIEW:
${JSON.stringify(summaries)}

Read each candidate's actual CV content carefully. Match based on what they ACTUALLY DO, not just their job title.
A "Financial Controller" may be perfect for a "Finance Director" role if their responsibilities match.
A "Senior HR Business Partner" may fit an "HR Manager" role perfectly.

Score each candidate:
- 70-100: Strong match — their actual experience clearly fits what this role needs
- 40-69: Possible match — relevant background, some gaps but worth a conversation
- Below 40: Not relevant — omit these

Return ONLY valid JSON (no markdown):
{
  "matches": [
    { "id": "<id>", "score": <40-100>, "tier": "strong" or "possible", "reason": "<one sentence — specifically what in their background matches this role>" }
  ]
}`

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
        const text = data.content?.[0]?.text || "{}"
        const clean = text.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(clean)
        if (parsed.matches) allMatches.push(...parsed.matches)
      } catch {}
    }

    // ── STEP 5: Build summary via AI ──────────────────────────────────────────
    const strongMatches = allMatches.filter(m => m.tier === "strong" || m.score >= 70)
      .sort((a, b) => b.score - a.score)
    const possibleMatches = allMatches.filter(m => m.tier === "possible" && m.score < 70)
      .sort((a, b) => b.score - a.score)

    const hydrate = (matches: any[]) =>
      matches.map((m: any) => {
        const cand = available.find((c: any) => c.id === m.id)
        return cand ? { ...cand, score: m.score, reason: m.reason } : null
      }).filter(Boolean)

    // Generate executive summary
    let summary = ""
    try {
      const summaryPrompt = `Summarise these talent pool matching results in 2 sentences for a recruitment consultant.

Role: ${mandate_title}
Total candidates reviewed: ${available.length}
Strong matches: ${strongMatches.length}
Possible matches: ${possibleMatches.length}
Top candidates: ${strongMatches.slice(0,3).map((m:any) => {
  const c = available.find((c:any) => c.id === m.id)
  return c ? \`\${c.name} (\${c.current_title})\` : ""
}).filter(Boolean).join(", ")}

Write 2 concise sentences: first summarise the match landscape, then give a recommendation on next steps.
Return ONLY the sentences.`

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 150,
          messages: [{ role: "user", content: summaryPrompt }],
        }),
      })
      const data = await res.json()
      summary = data.content?.[0]?.text?.trim() || ""
    } catch {}

    if (!summary) {
      summary = `Found ${strongMatches.length} strong match${strongMatches.length !== 1 ? "es" : ""} and ${possibleMatches.length} possible match${possibleMatches.length !== 1 ? "es" : ""} from ${available.length} candidates reviewed.`
    }

    return NextResponse.json({
      total_available: available.length,
      summary,
      strong_matches: hydrate(strongMatches),
      possible_matches: hydrate(possibleMatches),
    })

  } catch (err) {
    console.error("Mandate insight error:", err)
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 })
  }
}
