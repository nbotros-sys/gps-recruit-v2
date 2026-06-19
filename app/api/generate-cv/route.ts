import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, level, function: fn, experience, skills, location, company, roughBullets, targetWords, isSparse, minBullets, cvText } = body

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    if (type === "summary") {
      const expSummary = (experience || [])
        .filter((e: any) => e.title || e.company)
        .map((e: any) => {
          const bullets = (e.bullets || []).filter((b: string) => b.trim()).join("; ")
          const dates = e.start ? `(${e.start} – ${e.current ? "present" : e.end || "present"})` : ""
          return `${e.title || ""}${e.company ? " at " + e.company : ""} ${dates}${bullets ? ": " + bullets : ""}`
        })
        .join("\n")

      const skillsList = (skills || []).slice(0, 8).join(", ")
      const roleCount = (experience || []).filter((e: any) => e.title).length
      const words = targetWords || (isSparse ? 80 : 55)

      const prompt = `Write a professional CV summary for a ${title}${level ? " at " + level + " level" : ""}${fn ? " in " + fn : ""}${location ? ", based in " + location : ""}, targeting the Egyptian and MENA job market.

Work experience:
${expSummary || "Early career / one role"}

Key skills: ${skillsList || "Not specified"}
Number of roles: ${roleCount}
Target word count: approximately ${words} words${isSparse ? " — this candidate has limited experience so write a fuller, richer summary to balance the page" : ""}

Requirements:
- Exactly ${words <= 60 ? "2-3" : "4-5"} sentences — calibrated to fill the page
- Open with seniority, function and years of experience
- Reference specific companies or sectors from their experience where possible
- Include 1-2 quantified achievements drawn from their bullet points if available
- Professional, confident tone appropriate for senior Egyptian and Gulf recruiters
- Do NOT use buzzwords like "dynamic", "passionate", "results-driven", "seasoned"
- End with the value they bring to a future employer

Return ONLY the summary paragraph. No preamble, no heading, no quotes.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }]
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
      return NextResponse.json({ text })
    }

    // ── BULLETS ───────────────────────────────────────────────────────────────
    if (type === "bullets") {
      const rough = (roughBullets || []).filter((b: string) => b.trim()).join("\n")
      const min = minBullets || 3

      const prompt = `Rewrite these rough job description notes into ${min}-4 powerful CV bullet points for a ${title} at ${company}.

Rough notes:
${rough || "General management and leadership role"}

Requirements:
- Generate EXACTLY ${min} bullet points minimum — never fewer
- Start each bullet with a strong action verb (Led, Managed, Delivered, Grew, Reduced, Built, Launched, Implemented, etc.)
- Include quantified achievements — use plausible numbers if none given (e.g. "team of 8", "30% reduction", "EGP 2M budget")
- Keep each bullet under 20 words
- Professional tone for Egyptian/MENA market CVs
- ATS-friendly phrasing
- If rough notes are sparse, infer likely achievements from the job title and company context

Return ONLY a JSON array of strings. Example: ["bullet 1", "bullet 2", "bullet 3"]
No preamble, no markdown, no code blocks.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      })

      let text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]"
      text = text.replace(/```json|```/g, "").trim()
      const bullets = JSON.parse(text)
      return NextResponse.json({ bullets })
    }

    // ── ACHIEVEMENTS ──────────────────────────────────────────────────────────
    if (type === "achievements") {
      const roleList = (experience || [])
        .filter((e: any) => e.title)
        .map((e: any) => `${e.title} at ${e.company}`)
        .join(", ")

      const prompt = `Generate a concise "Key achievements" string for a ${title}${fn ? " in " + fn : ""}${level ? " at " + level + " level" : ""}.

Their roles: ${roleList || title}

Write 3 short achievement items separated by " · " (middle dot). Each item should be:
- A certification, award, or notable accomplishment relevant to their function
- Specific and credible for the MENA / Egyptian market
- Under 10 words each

Examples of format: "CMA certified · Top performer award Q3 2022 · Launched Arabic content vertical"

Return ONLY the achievement string. No preamble, no quotes.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }]
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
      return NextResponse.json({ text })
    }

    // ── REVIEW ────────────────────────────────────────────────────────────────
    if (type === "review") {
      const prompt = `You are an expert CV reviewer for the Egyptian and MENA recruitment market. Review this CV and return a JSON object.

CV Text:
${cvText || "No CV text provided"}

Return ONLY valid JSON with this exact structure (no markdown, no preamble):
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>", "<concern 3>"],
  "name": "<candidate full name extracted from CV, or null>",
  "email": "<candidate email extracted from CV, or null>",
  "current_title": "<current or most recent job title, or null>",
  "current_company": "<current or most recent employer, or null>"
}

Score guidelines: 80+ = strong, 60-79 = good, 40-59 = needs work, below 40 = major gaps.
Focus on: quantified achievements, MENA market relevance, ATS optimisation, photo presence, summary quality, skills alignment.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }]
      })

      let text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}"
      text = text.replace(/```json|```/g, "").trim()
      const result = JSON.parse(text)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (e: any) {
    console.error("generate-cv error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
