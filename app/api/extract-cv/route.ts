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
    } else if (fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      // Use Claude vision to extract text from the file
      const base64 = buffer.toString("base64")
      const mediaType = fileName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

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
                text: "Extract all text content from this CV/resume document. Return ONLY the raw text, preserving structure but no formatting marks. Include all sections: contact info, experience, education, skills."
              }
            ]
          }]
        })
      })
      const data = await response.json()
      text = data.content?.[0]?.text || ""
    } else {
      text = buffer.toString("utf-8")
    }
  } catch (e) {
    text = buffer.toString("utf-8")
  }

  return NextResponse.json({ text, filename: file.name })
}
