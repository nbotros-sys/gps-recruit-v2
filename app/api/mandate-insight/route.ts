import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

export async function POST(req: NextRequest) {
  try {
    const { mandate_id, job_description, mandate_title } = await req.json()
    if (!job_description) return NextResponse.json({ error: "No JD" }, { status: 400 })

    const supabase = createClient()

    // Get all candidates with cv_text or tags, not already in this mandate
    const { data: existing } = await supabase
      .from("applications")
      .select("candidate_id")
      .eq("mandate_id", mandate_id)

    const existingIds = (existing || []).map((a: any) => a.candidate_id)

    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, name, current_title, current_company, location, tags, notes, cv_text")
      .order("created_at", { ascending: false })

    const available = (candidates || []).filter((c: any) => !existingIds.includes(c.id))

    if (!available.length) {
      return NextResponse.json({
        total_available: 0,
        strong_matches: [],
        possible_matches: [],
        summary: "No candidates in your database yet outside this pipeline. Import CVs to build your talent pool.",
      })
    }

    // Build compact summaries for AI to reason over
    const summaries = available.map((c: any) => ({
      id: c.id,
      name: c.name,
      title: c.current_title,
      company: c.current_company,
      location: c.location,
      tags: toArray(c.tags),
      cv_snippet: (c.cv_text || c.notes || "").slice(0, 600),
    }))

    const prompt = `You are a senior recruitment consultant. Review this talent pool and identify candidates suitable for this mandate.

MANDATE: ${mandate_title}

JOB DESCRIPTION:
${job_description.slice(0, 2000)}

TALENT POOL (${summaries.length} candidates):
${JSON.stringify(summaries, null, 1)}

Identify which candidates are a good fit. Be selective — only include genuinely relevant people.

Respond ONLY with valid JSON (no markdown):
{
  "summary": "<2-3 sentence executive summary: how many strong matches, what gaps exist, any observations>",
  "strong_matches": [
    { "id": "<candidate id>", "score": <integer 60-100>, "reason": "<one sentence why they fit>" }
  ],
  "possible_matches": [
    { "id": "<candidate id>", "score": <integer 30-60>, "reason": "<one sentence why they might fit>" }
  ]
}

Strong matches: clearly qualified, title/skills/experience align well.
Possible matches: worth a conversation, some gaps but transferable skills.
Omit anyone who clearly does not fit.`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await response.json()
    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    // Hydrate with full candidate data
    const hydrate = (matches: any[]) =>
      (matches || []).map((m: any) => {
        const cand = available.find((c: any) => c.id === m.id)
        return cand ? { ...cand, score: m.score, reason: m.reason } : null
      }).filter(Boolean)

    return NextResponse.json({
      total_available: available.length,
      summary: parsed.summary || "",
      strong_matches: hydrate(parsed.strong_matches),
      possible_matches: hydrate(parsed.possible_matches),
    })

  } catch (err) {
    console.error("Mandate insight error:", err)
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 })
  }
}
