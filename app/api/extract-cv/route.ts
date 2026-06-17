import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const fileName = file.name.toLowerCase()

  let text = ""

  try {
    if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8")

    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const mammoth = require("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      text = result.value || ""

    } else if (fileName.endsWith(".pdf")) {
      const base64 = buffer.toString("base64")
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 }
              },
              {
                type: "text",
                text: "Extract all text from this CV/resume. Return ONLY the plain text content with no commentary. Include name, contact info, work experience, education, and skills."
              }
            ]
          }]
        })
      })
      const data = await response.json()
      text = data.content?.[0]?.text || ""
    }
  } catch (e) {
    console.error("Extraction error:", e)
    text = ""
  }

  return NextResponse.json({ text: text.trim(), filename: file.name })
}
