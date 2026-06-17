import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 })

  const supabase = createClient()
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, current_title, current_company, location, source, cv_text, applications(ai_score, mandate:mandates(title))")
    .order("created_at", { ascending: false })

  if (!candidates?.length) return NextResponse.json({ explanation: "No candidates in database.", matches: [] })

  const summaries = candidates.map(c => ({
    id: c.id,
    name: c.name,
    title: c.current_title,
    company: c.current_company,
    location: c.location,
    cv_snippet: (c.cv_text || "").slice(0, 600),
    best_score: c.applications?.length ? Math.max(...(c.applications as any[]).map((a: any) => a.ai_score || 0)) : null,
  }))

  const prompt = `You are a senior recruitment consultant at GPS. Search this candidate database for: "${query}"

DATABASE (${summaries.length} candidates):
${JSON.stringify(summaries, null, 1)}

Find the best matching candidates. Consider job title, company, skills in CV, location, experience level.

Respond ONLY with valid JSON (no markdown):
{
  "explanation": "<1-2 sentences: what you searched for and how many matches>",
  "matches": [
    { "id": "<candidate id>", "relevance": <integer 0-100>, "reason": "<one sentence why they match>" }
  ]
}

Return up to 10 matches sorted by relevance. Only include genuinely relevant candidates.`

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
  const text = data.content?.[0]?.text || "{}"
  try {
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    const matched = (parsed.matches || [])
      .map((m: any) => {
        const cand = candidates.find((c: any) => c.id === m.id)
        return cand ? { ...cand, relevance: m.relevance, reason: m.reason } : null
      })
      .filter(Boolean)

    return NextResponse.json({ explanation: parsed.explanation, matches: matched })
  } catch {
    return NextResponse.json({ explanation: "Search failed.", matches: [] })
  }
}
