import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Fallback text recovery for older/odd .doc files that word-extractor can't parse.
// Pulls readable printable runs out of the raw bytes and keeps only the runs that
// are mostly letters/spaces (dropping binary noise). Only used when the normal
// reader fails, so it can never affect .doc files that already read cleanly.
function salvageDocText(buffer: Buffer): string {
  const candidates: string[] = []
  {
    const s = buffer.toString("latin1")
    const runs = s.match(/[\x20-\x7e]{6,}/g) || []
    const kept = runs.filter(r => r.length >= 10 && (r.match(/[A-Za-z ]/g) || []).length / r.length >= 0.8)
    candidates.push(kept.join(" ").replace(/\s+/g, " ").trim())
  }
  {
    const s = buffer.toString("utf16le")
    const runs = s.match(/[\x20-\x7e\u00a0-\u05ff]{6,}/g) || []
    const kept = runs.filter(r => r.length >= 8 && (r.match(/[A-Za-z\u00a0-\u05ff ]/g) || []).length / r.length >= 0.75)
    candidates.push(kept.join(" ").replace(/\s+/g, " ").trim())
  }
  candidates.sort((a, b) => (b.match(/[A-Za-z]{2,}/g) || []).length - (a.match(/[A-Za-z]{2,}/g) || []).length)
  return candidates[0] || ""
}

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

    } else if (fileName.endsWith(".docx")) {
      const mammoth = require("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      text = result.value || ""

    } else if (fileName.endsWith(".doc")) {
      const WordExtractor = require("word-extractor")
      const extractor = new WordExtractor()
      try {
        const doc = await extractor.extract(buffer)
        text = doc.getBody() || ""
      } catch {
        text = ""
      }
      // Older/odd .doc files can make word-extractor throw or return nothing even
      // when readable text is present — salvage it directly as a fallback.
      if (!text || text.trim().length < 40) {
        const salvaged = salvageDocText(buffer)
        if (salvaged.length >= 80) text = salvaged
      }

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
      recordUsage("anthropic", "claude-sonnet-4-6", "extract-cv", data?.usage).catch(() => {})
      text = data.content?.[0]?.text || ""
    }
  } catch (e) {
    console.error("Extraction error:", e)
    text = ""
  }

  let file_path: string | null = null
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const pendingPath = "_incoming/" + Date.now() + "-" + safeName
    const up = await sb.storage.from("cv-files").upload(pendingPath, buffer, { contentType: file.type || "application/octet-stream", upsert: false })
    if (!up.error) file_path = pendingPath
  } catch {}
  return NextResponse.json({ text: text.trim(), filename: file.name, file_path })
}
