import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let candidates: any[] = []
  let searchMethod = "fallback"

  // Step 1: Try vector search
  try {
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    })

    if (embeddingRes.ok) {
      const embeddingData = await embeddingRes.json()
      const queryVector = embeddingData.data[0].embedding

      const { data: vectorResults, error: vecError } = await supabase.rpc("match_candidates", {
        query_embedding: queryVector,
        match_threshold: 0.1,
        match_count: 200,
      })

      if (!vecError && vectorResults?.length > 0) {
        searchMethod = "vector"
        const ids = vectorResults.map((r: any) => r.candidate_id)
        const { data: fullData } = await supabase
          .from("candidates")
          .select("id, name, current_title, current_company, location, tags, avatar_url, notes, applications(ai_score, mandate:mandates(title))")
          .in("id", ids)

        candidates = ids
          .map((id: string) => {
            const cand = fullData?.find((c: any) => c.id === id)
            const vecResult = vectorResults.find((r: any) => r.candidate_id === id)
            return cand ? { ...cand, vector_similarity: vecResult?.similarity } : null
          })
          .filter(Boolean)
      }
    }
  } catch (err) {
    console.error("Vector search error:", err)
  }

  // Fallback: load all candidates if vector search failed
  if (!candidates.length) {
    searchMethod = "fallback"
    const { data: allData } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, notes, applications(ai_score, mandate:mandates(title))")
      .limit(200)
    candidates = allData || []
  }

  if (!candidates.length) return NextResponse.json({ results: [], searchMethod })

  // Step 2: AI re-ranks all candidates
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

SEARCH QUERY: "${query}"

CANDIDATES:
${JSON.stringify(summaries)}

Find all candidates that genuinely match. Return empty array if none match.

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

  return NextResponse.json({ 
    results, 
    searchMethod,
    debug: {
      candidatesFound: candidates.length,
      aiMatchesFound: matches.length,
      openaiKeyPresent: !!process.env.OPENAI_API_KEY,
      anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
    }
  })
}
