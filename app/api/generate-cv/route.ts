import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, level, function: fn, experience, skills, location, company, roughBullets } = body

    if (type === "summary") {
      // Build rich context from experience
      const expSummary = (experience || [])
        .filter((e: any) => e.title || e.company)
        .map((e: any) => {
          const bullets = (e.bullets || []).filter((b: string) => b.trim()).join("; ")
          const dates = e.start ? `(${e.start} – ${e.current ? "present" : e.end || "present"})` : ""
          return `${e.title || ""}${e.company ? " at " + e.company : ""} ${dates}${bullets ? ": " + bullets : ""}`
        })
        .join("\n")

      const skillsList = (skills || []).slice(0, 8).join(", ")
      const yearsExp = (experience || []).filter((e: any) => e.title).length > 0
        ? `with ${(experience || []).filter((e: any) => e.title).length} listed role${(experience || []).filter((e: any) => e.title).length > 1 ? "s" : ""}`
        : ""

      const prompt = `Write a professional CV summary for a ${title}${level ? " at " + level + " level" : ""} ${fn ? "in " + fn : ""} ${yearsExp}${location ? ", based in " + location : ""} targeting the Egyptian and MENA job market.

Work experience:
${expSummary || "Not provided"}

Key skills: ${skillsList || "Not specified"}

Requirements:
- 3-4 sentences only — tight and punchy
- Open with seniority, function and years of experience
- Reference specific companies or sectors from their experience where possible
- Include 1-2 quantified achievements drawn from their bullet points
- Professional, confident tone appropriate for senior Egyptian and Gulf recruiters
- Do NOT use buzzwords like "dynamic", "passionate", "results-driven", "seasoned"
- End with the value they bring to a future employer

Return ONLY the summary paragraph. No preamble, no heading, no quotes.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 350,
        messages: [{ role: "user", content: prompt }]
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
      return NextResponse.json({ text })
    }

    if (type === "bullets") {
      const rough = (roughBullets || []).filter((b: string) => b.trim()).join("\n")
      const prompt = `Rewrite these rough job description notes into 3-4 powerful CV bullet points for a ${title} at ${company}.

Rough notes:
${rough || "General management and leadership role"}

Requirements:
- Start each bullet with a strong action verb (Led, Managed, Delivered, Grew, Reduced, Built, Launched, etc.)
- Include quantified achievements — use plausible numbers if none given (e.g. "team of 8", "30% reduction", "EGP 2M budget")
- Keep each bullet under 20 words
- Professional tone for Egyptian/MENA market CVs
- ATS-friendly phrasing

Return ONLY a JSON array of strings. Example: ["bullet 1", "bullet 2", "bullet 3"]
No preamble, no markdown, no code blocks.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }]
      })

      let text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]"
      text = text.replace(/```json|```/g, "").trim()
      const bullets = JSON.parse(text)
      return NextResponse.json({ bullets })
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (e: any) {
    console.error("generate-cv error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
