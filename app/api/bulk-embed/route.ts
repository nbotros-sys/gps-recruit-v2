import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all candidates without embeddings
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, current_title, current_company, location, tags, cv_text, notes")
    .not("id", "in", 
      `(SELECT candidate_id FROM cv_embeddings)`
    )
    .limit(50)

  if (!candidates?.length) return NextResponse.json({ processed: 0, message: "All candidates already have embeddings" })

  let processed = 0
  let failed = 0
  const results: any[] = []

  for (const candidate of candidates) {
    try {
      // Build rich text for embedding — combine all meaningful fields
      const text = [
        candidate.name,
        candidate.current_title,
        candidate.current_company,
        candidate.location,
        (candidate.tags || []).join(", "),
        candidate.notes || "",
        (candidate.cv_text || "").slice(0, 6000),
      ].filter(Boolean).join("\n")

      const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.slice(0, 8000),
        }),
      })

      if (!embeddingRes.ok) {
        failed++
        results.push({ id: candidate.id, name: candidate.name, status: "failed" })
        continue
      }

      const embeddingData = await embeddingRes.json()
      const embedding = embeddingData.data[0].embedding

      const { error } = await supabase
        .from("cv_embeddings")
        .upsert({ candidate_id: candidate.id, embedding }, { onConflict: "candidate_id" })

      if (error) {
        failed++
        results.push({ id: candidate.id, name: candidate.name, status: "failed", error: error.message })
      } else {
        processed++
        results.push({ id: candidate.id, name: candidate.name, status: "done" })
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100))

    } catch (err: any) {
      failed++
      results.push({ id: candidate.id, name: candidate.name, status: "error", error: err?.message })
    }
  }

  return NextResponse.json({ processed, failed, results })
}
