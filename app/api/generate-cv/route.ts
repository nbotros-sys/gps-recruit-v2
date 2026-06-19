import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, level, function: fn, experience, company, roughBullets } = body

    if (type === "summary") {
      const expYears = experience?.length ? `with ${experience.length} listed role${experience.length>1?"s":""}` : ""
      const prompt = `Write a professional CV summary for a ${title}${level ? ` at ${level} level` : ""}${fn ? ` in ${fn}` : ""} ${expYears} targeting the Egyptian and MENA job market.

Requirements:
- 3-4 sentences only
- Start with the professional title and years/level of experience
- Mention sector/function expertise
- Include 1-2 quantified or impactful achievements if possible
- Professional, confident tone appropriate for senior Egyptian and Gulf market recruiters
- Do NOT use buzzwords like "dynamic", "passionate", "results-driven"
- End with what value they bring to future employers

Return ONLY the summary text, no preamble.`

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
      return NextResponse.json({ text })
    }

    if (type === "bullets") {
      const rough = roughBullets?.filter((b: string) => b.trim()).join("\n") || ""
      const prompt = `Rewrite these rough job description notes into 3-4 powerful CV bullet points for a ${title} at ${company}.

Rough notes:
${rough || "General management and leadership role"}

Requirements:
- Start each bullet with a strong action verb (Led, Managed, Delivered, Grew, Reduced, Built, etc.)
- Include quantified achievements where possible — invent plausible numbers if none given (e.g. "team of 8", "30% reduction", "EGP 2M budget")
- Keep each bullet under 20 words
- Professional tone for Egyptian/MENA market CVs
- Make them ATS-friendly

Return ONLY a JSON array of strings like: ["bullet 1", "bullet 2", "bullet 3"]
No preamble, no markdown code blocks.`

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
