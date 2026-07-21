import { recordUsage } from "@/lib/ai-usage"
// Shared CV-scoring logic used by both the staff score-cv route and the public
// job-application route. Server-side only (uses the Anthropic API key).

export type CVScore = {
  score: number | null
  summary: string
  strengths: string[]
  concerns: string[]
  recommendation: string | null
}

// Scores a CV against a job description. Never throws — returns a null score on
// failure so the application can still be recorded.
export async function scoreCV(cv_text: string, job_description: string, mandate_title?: string): Promise<CVScore> {
  const fallback: CVScore = { score: null, summary: "", strengths: [], concerns: [], recommendation: null }
  if (!cv_text?.trim() || !job_description?.trim()) return fallback

  const prompt = `You are an expert recruitment consultant. Evaluate how well this candidate fits the role.

ROLE: ${mandate_title || ""}

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
  "recommendation": "<Proceed | Maybe | Pass>"
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
    await recordUsage("anthropic", "claude-sonnet-4-6", "score-cv", data?.usage)
    const text = data.content?.[0]?.text || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)
    return {
      score: typeof parsed.score === "number" ? parsed.score : null,
      summary: parsed.summary || "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      recommendation: parsed.recommendation || null,
    }
  } catch (err) {
    console.error("scoreCV error:", err)
    return fallback
  }
}
