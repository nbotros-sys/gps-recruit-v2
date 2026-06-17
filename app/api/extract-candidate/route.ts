import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { cv_text } = await req.json()
  if (!cv_text) return NextResponse.json({ error: "No CV text" }, { status: 400 })

  const prompt = `Extract structured candidate information from this CV. 

CV TEXT:
${cv_text.slice(0, 4000)}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "name": "<full name or null>",
  "email": "<email address or null>",
  "phone": "<phone number or null>",
  "current_title": "<current or most recent job title or null>",
  "current_company": "<current or most recent employer or null>",
  "location": "<city/country or null>",
  "years_experience": <integer years of total experience or null>,
  "age": <integer age if DOB found, calculate from DOB to today 2026, or null>
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
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || "{}"
  try {
    const clean = text.replace(/```json|```/g, "").trim()
    return NextResponse.json(JSON.parse(clean))
  } catch {
    return NextResponse.json({ name: null, email: null, phone: null, current_title: null, current_company: null, location: null })
  }
}
