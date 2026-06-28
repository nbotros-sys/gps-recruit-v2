import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const _authClient = createServerSupabaseClient()
  const { data: { user: _authUser } } = await _authClient.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch candidates with cv_text but no cv_structured yet
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, cv_text")
    .not("cv_text", "is", null)
    .filter("cv_text", "neq", "")
    .limit(100)

  if (!candidates?.length) return NextResponse.json({ processed: 0, skipped: 0, failed: 0, message: "No candidates with CV text found." })

  // Filter to only those without structured profiles
  const toProcess = candidates.filter((c: any) => c.cv_text && c.cv_text.length > 100)

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const candidate of toProcess) {
    // Check if already has structured profile
    const { data: existing } = await supabase
      .from("candidates").select("cv_structured").eq("id", candidate.id).single()

    if (existing?.cv_structured && Object.keys(existing.cv_structured).length > 0) {
      skipped++
      continue
    }

    const prompt = `Read this CV carefully and extract a comprehensive structured profile.
Be thorough — nothing important should be missed.

CV TEXT:
${(candidate.cv_text || "").slice(0, 12000)}

Return ONLY valid JSON (no markdown):
{
  "name": "<full name>",
  "total_years_experience": <number or null>,
  "seniority_level": "<Junior|Mid|Senior|Manager|Director|VP|C-Level>",
  "career_trajectory": "<Rising|Stable|Lateral|Declining>",
  "avg_tenure_years": <number or null>,
  "industries": ["<industry>"],
  "languages": [{ "language": "<name>", "level": "<Native|Fluent|Advanced|Intermediate|Basic>" }],
  "education": [{ "degree": "<degree>", "field": "<field>", "institution": "<name>", "year": "<year>" }],
  "certifications": ["<cert>"],
  "roles": [{
    "title": "<title>",
    "company": "<company>",
    "start": "<year>",
    "end": "<year or Present>",
    "years": <number>,
    "responsibilities": "<2-3 sentences of what they actually did — scope, team sizes, budgets, outcomes>",
    "implicit_skills": ["<skill inferred from responsibilities>"]
  }],
  "explicit_skills": ["<skills listed in CV>"],
  "all_skills": ["<all skills explicit + implicit combined>"],
  "key_achievements": ["<quantified achievement>"],
  "largest_team_managed": <number or null>,
  "largest_budget_owned": "<e.g. EGP 50M or null>",
  "most_senior_stakeholder": "<Board|CEO|CFO|MD|VP or null>",
  "geography_worked": ["<country or city>"],
  "summary_paragraph": "<150 words — what this person actually does professionally, real work not titles>"
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
      const cv_structured = JSON.parse(text.replace(/```json|```/g, "").trim())

      const { error } = await supabase.from("candidates")
        .update({ cv_structured })
        .eq("id", candidate.id)

      if (error) failed++
      else processed++
    } catch { failed++ }

    // Small delay between calls
    await new Promise(r => setTimeout(r, 300))
  }

  return NextResponse.json({ processed, skipped, failed })
}
