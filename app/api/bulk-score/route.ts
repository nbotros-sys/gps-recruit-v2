import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { cvs, job_description, mandate_title } = await req.json()
    if (!cvs?.length || !job_description) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    const results = []

    // Process sequentially to avoid overwhelming the API
    for (const cv of cvs) {
      try {
        const prompt = `You are an expert recruitment consultant. Evaluate this candidate for the role.

ROLE: ${mandate_title}

JOB DESCRIPTION:
${job_description.slice(0, 2000)}

CANDIDATE CV:
${(cv.text || "").slice(0, 2500)}

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

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        const text = data.content?.[0]?.text || "{}"
        const clean = text.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(clean)
        results.push({ ...parsed, filename: cv.filename, cv_text: cv.text || "" })

      } catch (err) {
        // If one CV fails, add a placeholder and continue
        console.error(`Failed to score ${cv.filename}:`, err)
        results.push({
          filename: cv.filename,
          cv_text: cv.text || "",
          name: cv.filename.replace(/\.[^.]+$/, ""),
          email: null,
          phone: null,
          current_title: null,
          current_company: null,
          location: null,
          score: 0,
          summary: "Could not process this CV. Please try scoring it individually.",
          strengths: [],
          concerns: ["Processing failed — try the single CV scorer for this file"],
          recommendation: "Pass"
        })
      }
    }

    // Sort by score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0))
    return NextResponse.json({ results })

  } catch (err) {
    console.error("Bulk score error:", err)
    return NextResponse.json({ error: "Bulk scoring failed", results: [] }, { status: 500 })
  }
}
