import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { candidate_background, mandate_context, platform, tone } = await req.json()

  const toneGuide = {
    professional: "formal, respectful, concise — appropriate for executive-level outreach",
    friendly: "warm, personable, conversational — feels human not template-like",
    direct: "brief and to the point — 3-4 sentences max, no fluff"
  }[tone] || "professional"

  const platformGuide = {
    linkedin: "LinkedIn InMail (300 word limit, starts with a connection observation)",
    email: "email (subject line + body, can be longer, more context)",
    whatsapp: "WhatsApp message (very short, casual, ends with a question)"
  }[platform] || "LinkedIn InMail"

  const prompt = `You are a senior recruitment consultant at GPS, a respected Egyptian executive search firm. Write 3 distinct outreach messages to approach a passive candidate.

CANDIDATE BACKGROUND:
${candidate_background}

${mandate_context ? `OPPORTUNITY CONTEXT:
${mandate_context}
` : "Keep the opportunity vague/confidential — just gauge interest in a conversation."}

FORMAT: ${platformGuide}
TONE: ${toneGuide}

Rules:
- Never be pushy or salesy
- Personalise each message to the candidate's specific background
- Do NOT reveal the client name — say "a leading organisation" or similar
- Each variation should feel genuinely different in approach
- In Egypt/MENA context — be culturally aware and respectful

Respond ONLY with valid JSON (no markdown):
{"messages": ["<message 1>", "<message 2>", "<message 3>"]}`

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
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
    return NextResponse.json({ messages: [text] })
  }
}
