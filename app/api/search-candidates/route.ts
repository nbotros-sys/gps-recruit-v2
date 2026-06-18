import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 })

  const supabase = createClient()

  // Step 1: Pre-filter with Supabase text search — avoid sending all candidates to AI
  const keywords = query.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w: string) => w.length > 2)
  const searchTerm = keywords[0] || ""

  let candidates: any[] = []

  if (searchTerm) {
    const { data: textResults } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, applications(ai_score, mandate:mandates(title))")
      .or(`name.ilike.%${searchTerm}%,current_title.ilike.%${searchTerm}%,current_company.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      .limit(100)
    candidates = textResults || []
  }

  // Fall back to all candidates if too few text results (capped at 200)
  if (candidates.length < 5) {
    const { data: allData } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, applications(ai_score, mandate:mandates(title))")
      .limit(200)
    candidates = allData || []
  }

  if (!candidates.length) return NextResponse.json({ results: [] })

  // Step 2: Send compact summaries to AI — no cv_text, 10x smaller prompt
  const summaries = candidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    title: c.current_title,
    company: c.current_company,
    location: c.location,
    tags: (c.tags || []).slice(0, 8),
  }))

  const prompt = `You are a recruitment search engine. Find candidates matching this query.

QUERY: "${query}"

CANDIDATES:
${JSON.stringify(summaries)}

Return ONLY a JSON array of matching IDs ordered by best match. Be generous but accurate.
No markdown, no backticks:
[{ "id": "<id>", "score": <1-100>, "reason": "<one short reason>" }]`

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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

  const data = await response.json()
  const text = data.content?.[0]?.text || "[]"
  const clean = text.replace(/```json|```/g, "").trim()
  const matches = JSON.parse(clean)

  const results = matches
    .map((m: any) => {
      const c = candidates.find((c: any) => c.id === m.id)
      return c ? { ...c, relevance_score: m.score, match_reason: m.reason } : null
    })
    .filter(Boolean)
    .slice(0, 20)

  return NextResponse.json({ results })
}
