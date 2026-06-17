import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { cv_text, job_description, mandate_title } = await req.json()

  if (!cv_text || !job_description) {
    return NextResponse.json({ error: "Missing CV text or job description" }, { status: 400 })
  }

  const prompt = `You are an expert recruitment consultant. Evaluate how well this candidate fits the role.

ROLE: ${mandate_title}

JOB DESCRIPTION:
${job_description}

CANDIDATE CV:
${cv_text}

Respond ONLY with valid JSON in this exact format (no markdown, no backticks):
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendation": "<Proceed" | "Maybe" | "Pass>"
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
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || ""

  try {
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 })
  }
}
