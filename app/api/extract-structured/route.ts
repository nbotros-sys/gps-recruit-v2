import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

export async function POST(req: NextRequest) {
  // Access gate. Accepts EITHER the internal shared secret (server-to-server
  // callers such as /api/enrich-from-linkedin) OR a valid staff session
  // (browser callers such as the internal database page). Rejects everyone
  // else before any Anthropic spend happens.
  const secret = process.env.INTERNAL_API_SECRET
  const provided = req.headers.get("x-internal-secret")
  if (!(secret && provided && provided === secret)) {
    const gate = await requireStaff()
    if (!gate.ok) return gate.response
  }

  const { candidateId, cv_text, forceRefresh } = await req.json()
  if (!candidateId || !cv_text) return NextResponse.json({ error: "Missing data" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check if already extracted (skip unless forced)
  if (!forceRefresh) {
    const { data: existing } = await supabase
      .from("candidates").select("cv_structured").eq("id", candidateId).single()
    if (existing?.cv_structured) return NextResponse.json({ cv_structured: existing.cv_structured, cached: true })
  }

  const prompt = `Read this CV carefully and extract a comprehensive structured profile. 
Be thorough — nothing important should be missed. This profile will be used to match this 
candidate against job descriptions, so include everything a senior recruiter would note.

CV TEXT:
${cv_text.slice(0, 12000)}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "name": "<full name>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "location": "<city, country or null>",
  "total_years_experience": <number or null>,
  "seniority_level": "<Junior | Mid | Senior | Manager | Director | VP | C-Level>",
  "career_trajectory": "<Rising | Stable | Lateral | Declining>",
  "avg_tenure_years": <average years per role as number or null>,
  "industries": ["<industry 1>", "<industry 2>"],
  "languages": [{ "language": "<name>", "level": "<Native|Fluent|Advanced|Intermediate|Basic>" }],
  "education": [{ "degree": "<degree>", "field": "<field>", "institution": "<name>", "year": "<year or null>" }],
  "certifications": ["<cert 1>", "<cert 2>"],
  "roles": [
    {
      "title": "<exact job title>",
      "company": "<company name>",
      "start": "<year or month-year>",
      "end": "<year or month-year or Present>",
      "years": <number>,
      "responsibilities": "<2-3 sentences describing what they actually did — specific scope, team sizes, budgets, outcomes>",
      "implicit_skills": ["<skill inferred from responsibilities, not just listed>"]
    }
  ],
  "explicit_skills": ["<skills explicitly listed in CV>"],
  "all_skills": ["<union of explicit + implicit — everything they can do>"],
  "key_achievements": ["<quantified achievement 1>", "<quantified achievement 2>"],
  "largest_team_managed": <number or null>,
  "largest_budget_owned": "<e.g. EGP 50M or null>",
  "most_senior_stakeholder": "<e.g. Board, CEO, CFO or null>",
  "salary_last_known": "<if mentioned, else null>",
  "geography_worked": ["<country or city>"],
  "summary_paragraph": "<150 words describing what this person actually does professionally — their real work, not their titles>"
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
    recordUsage("anthropic", "claude-sonnet-4-6", "extract-structured", data?.usage).catch(() => {})
    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    const cv_structured = JSON.parse(clean)

    // Save to candidates table
    await supabase.from("candidates")
      .update({ cv_structured })
      .eq("id", candidateId)

    return NextResponse.json({ cv_structured })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
