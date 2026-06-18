import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: "No query" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const q = query.trim()

  // ── FAST PATH 1: Email lookup
  if (q.includes("@")) {
    const { data } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, email, phone, applications(ai_score, mandate:mandates(title))")
      .ilike("email", `%${q}%`)
      .limit(20)
    if (data?.length) {
      const results = data.map((c: any) => ({
        ...c,
        relevance_score: 100,
        match_reason: `Email matches "${q}"`,
      }))
      return NextResponse.json({ results, searchMethod: "email" })
    }
  }

  // ── FAST PATH 2: Phone lookup — strip spaces, dashes, brackets
  const digits = q.replace(/[^0-9+]/g, "")
  if (digits.length >= 7) {
    const { data: allCands } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, email, phone, applications(ai_score, mandate:mandates(title))")
      .not("phone", "is", null)
      .limit(500)

    const phoneMatches = (allCands || []).filter((c: any) => {
      const storedDigits = (c.phone || "").replace(/[^0-9+]/g, "")
      return storedDigits.includes(digits) || digits.includes(storedDigits.slice(-8))
    })

    if (phoneMatches.length) {
      const results = phoneMatches.map((c: any) => ({
        ...c,
        relevance_score: 100,
        match_reason: `Phone matches "${q}"`,
      }))
      return NextResponse.json({ results, searchMethod: "phone" })
    }
  }

  // ── FAST PATH 3: Name exact/partial match
  const nameWords = q.split(" ").filter((w: string) => w.length > 1)
  if (nameWords.length >= 2 && nameWords.length <= 4 && !q.includes(" in ") && !q.includes(" with ")) {
    const { data: nameMatches } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, email, phone, applications(ai_score, mandate:mandates(title))")
      .ilike("name", `%${q}%`)
      .limit(10)

    if (nameMatches?.length) {
      const results = nameMatches.map((c: any) => ({
        ...c,
        relevance_score: 100,
        match_reason: `Name matches "${q}"`,
      }))
      return NextResponse.json({ results, searchMethod: "name" })
    }
  }

  // ── AI PATH: Vector search + AI re-ranking for natural language queries
  let candidates: any[] = []
  let searchMethod = "fallback"

  try {
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: q }),
    })

    if (embeddingRes.ok) {
      const embeddingData = await embeddingRes.json()
      const queryVector = embeddingData.data[0].embedding

      const { data: vectorResults, error: vecError } = await supabase.rpc("match_candidates", {
        query_embedding: queryVector,
        match_threshold: 0.55,
        match_count: 100,
      })

      console.log("Vector error:", vecError, "Vector count:", vectorResults?.length)

      if (!vecError && vectorResults?.length > 0) {
        searchMethod = "vector"
        const ids = vectorResults.map((r: any) => r.candidate_id)
        const { data: fullData } = await supabase
          .from("candidates")
          .select("id, name, current_title, current_company, location, tags, avatar_url, email, phone, notes, applications(ai_score, mandate:mandates(title))")
          .in("id", ids)

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

  // Fallback: all candidates
  if (!candidates.length) {
    searchMethod = "fallback"
    const { data } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, email, phone, notes, applications(ai_score, mandate:mandates(title))")
      .limit(200)
    candidates = data || []
  }

  if (!candidates.length) return NextResponse.json({ results: [], searchMethod })

  // AI re-ranking
  const summaries = candidates.slice(0, 150).map((c: any) => ({
    id: c.id,
    name: c.name,
    title: c.current_title,
    company: c.current_company,
    location: c.location,
    tags: (c.tags || []).slice(0, 10),
    summary: (c.notes || "").slice(0, 200),
  }))

  const prompt = `You are an expert recruitment consultant. Find candidates matching this search query.

SEARCH QUERY: "${q}"

CANDIDATES:
${JSON.stringify(summaries)}

Find candidates who genuinely match. Score 70+ for strong matches, 40-69 for partial. Return empty array if none match.

Respond ONLY with valid JSON array (no markdown):
[{ "id": "<id>", "score": <1-100>, "reason": "<concise reason>" }]`

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const aiData = await aiRes.json()
  const text = aiData.content?.[0]?.text || "[]"
  const clean = text.replace(/```json|```/g, "").trim()
  const matches = JSON.parse(clean)

  const results = matches
    .map((m: any) => {
      const c = candidates.find((c: any) => c.id === m.id)
      return c ? { ...c, relevance_score: m.score, match_reason: m.reason } : null
    })
    .filter(Boolean)

  return NextResponse.json({ results, searchMethod })
}
