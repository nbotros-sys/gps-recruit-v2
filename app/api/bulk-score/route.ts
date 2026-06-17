import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { cvs, job_description, mandate_title } = await req.json()
  if (!cvs?.length || !job_description) return NextResponse.json({ error: "Missing data" }, { status: 400 })

  const results = await Promise.all(
    cvs.map(async (cv: { filename: string; text: string }) => {
      const prompt = `You are an expert recruitment consultant. Evaluate this candidate for the role.

ROLE: ${mandate_title}

JOB DESCRIPTION:
${job_description}

CANDIDATE CV:
${cv.text.slice(0, 3000)}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "name": "<extract candidate full name from CV, or 'Unknown'>",
  "email": "<extract email from CV or null>",
  "phone": "<extract phone from CV or null>",
  "current_title": "<extract current/most recent job title or null>",
  "current_company": "<extract current/most recent employer or null>",
  "location": "<extract city/country or null>",
  "score": <integer 0-100>,
  "summary": "<2 sentence assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>"],
  "recommendation": "<Proceed|Maybe|Pass>"
}`

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        })
        const data = await response.json()
        const text = data.content?.[0]?.text || "{}"
        const clean = text.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(clean)
        return { ...parsed, filename: cv.filename, cv_text: cv.text }
      } catch {
        return { filename: cv.filename, cv_text: cv.text, name: "Unknown", email: null, phone: null, current_title: null, current_company: null, location: null, score: 0, summary: "Failed to parse", strengths: [], concerns: [], recommendation: "Pass" }
      }
    })
  )

  results.sort((a: any, b: any) => b.score - a.score)
  return NextResponse.json({ results })
}
