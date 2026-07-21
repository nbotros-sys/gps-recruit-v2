import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  try {
    const { cvs, job_description, mandate_title } = await req.json()
    if (!cvs?.length || !job_description) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    const results = []

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
  "name": "<extract candidate full name from CV, or Unknown>",
  "email": "<extract email from CV or null>",
  "phone": "<extract phone from CV or null>",
  "current_title": "<extract current job title or null>",
  "current_company": "<extract current employer or null>",
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

        if (!response.ok) throw new Error(`API ${response.status}`)

        const data = await response.json()
        await recordUsage("anthropic", "claude-sonnet-4-6", "bulk-score", data?.usage)
        const text = data.content?.[0]?.text || "{}"
        const clean = text.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(clean)

        // Always normalise to arrays — AI sometimes returns a string
        results.push({
          filename: cv.filename,
          cv_text: cv.text || "",
          name: parsed.name || cv.filename.replace(/\.[^.]+$/, ""),
          email: parsed.email || null,
          phone: parsed.phone || null,
          current_title: parsed.current_title || null,
          current_company: parsed.current_company || null,
          location: parsed.location || null,
          score: typeof parsed.score === "number" ? parsed.score : 0,
          summary: parsed.summary || "",
          strengths: toArray(parsed.strengths),
          concerns: toArray(parsed.concerns),
          recommendation: parsed.recommendation || "Pass",
        })

      } catch (err) {
        console.error(`Failed scoring ${cv.filename}:`, err)
        results.push({
          filename: cv.filename,
          cv_text: cv.text || "",
          name: cv.filename.replace(/\.[^.]+$/, ""),
          email: null, phone: null, current_title: null,
          current_company: null, location: null,
          score: 0,
          summary: "Could not process this CV. Try scoring it individually.",
          strengths: [],
          concerns: ["Processing failed — try the single CV scorer for this file"],
          recommendation: "Pass",
        })
      }
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0))
    return NextResponse.json({ results })

  } catch (err) {
    console.error("Bulk score error:", err)
    return NextResponse.json({ error: "Bulk scoring failed", results: [] }, { status: 500 })
  }
}
