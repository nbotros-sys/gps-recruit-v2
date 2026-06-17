import { NextRequest, NextResponse } from "next/server"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return val.split(",").map((s: string) => s.trim()).filter(Boolean)
  return []
}

export async function POST(req: NextRequest) {
  try {
    const { cv_text, filename } = await req.json()
    if (!cv_text?.trim()) {
      return NextResponse.json({ error: "No CV text" }, { status: 400 })
    }

    const prompt = `You are an expert recruitment consultant. Analyse this CV and extract structured information.

CV TEXT:
${cv_text.slice(0, 4000)}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "name": "<full name>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "current_title": "<current or most recent job title>",
  "current_company": "<current or most recent employer>",
  "location": "<city, country>",
  "years_experience": <integer total years of work experience>,
  "summary": "<3-4 sentence professional summary: who they are, what they specialise in, their key achievements, and what level/type of role suits them>",
  "function": "<primary job function e.g. Finance, HR, Sales, Marketing, Operations, Technology, Legal, Supply Chain>",
  "seniority": "<Junior|Mid|Senior|Manager|Director|VP|C-Level>",
  "industry": "<primary industry e.g. Banking, FMCG, Manufacturing, Retail, Healthcare, Consulting, Real Estate>",
  "skills": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>"],
  "languages": ["<language 1>"],
  "education": "<highest degree and institution>",
  "nationality": "<nationality if mentioned or null>"
}`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      name: parsed.name || filename?.replace(/\.[^.]+$/, "") || "Unknown",
      email: parsed.email || null,
      phone: parsed.phone || null,
      current_title: parsed.current_title || null,
      current_company: parsed.current_company || null,
      location: parsed.location || null,
      years_experience: parsed.years_experience || null,
      summary: parsed.summary || "",
      tags: [
        parsed.function,
        parsed.seniority,
        parsed.industry,
        ...(toArray(parsed.skills)),
        ...(toArray(parsed.languages)),
      ].filter(Boolean),
      function: parsed.function || null,
      seniority: parsed.seniority || null,
      industry: parsed.industry || null,
      skills: toArray(parsed.skills),
      languages: toArray(parsed.languages),
      education: parsed.education || null,
      nationality: parsed.nationality || null,
    })
  } catch (err) {
    console.error("Build profile error:", err)
    return NextResponse.json({ error: "Failed to build profile" }, { status: 500 })
  }
}
