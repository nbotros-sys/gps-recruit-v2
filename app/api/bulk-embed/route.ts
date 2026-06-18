import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get IDs that already have embeddings
  const { data: existing } = await supabase
    .from("cv_embeddings")
    .select("candidate_id")

  const existingIds = (existing || []).map((e: any) => e.candidate_id)

  // Get all candidates
  const { data: allCandidates } = await supabase
    .from("candidates")
    .select("id, name, current_title, current_company, location, tags, cv_text, notes")
    .limit(500)

  // Filter to only those without embeddings
  const candidates = (allCandidates || []).filter(
    (c: any) => !existingIds.includes(c.id)
  ).slice(0, 50)

  if (!candidates.length) {
    return NextResponse.json({ 
      processed: 0, 
      total_existing: existingIds.length,
      message: "All candidates already have embeddings" 
    })
  }

  let processed = 0
  let failed = 0
  const results: any[] = []

  for (const candidate of candidates) {
    try {
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
        const err = await embeddingRes.json()
        failed++
        results.push({ name: candidate.name, status: "failed", error: JSON.stringify(err) })
        continue
      }

      const embeddingData = await embeddingRes.json()
      const embedding = embeddingData.data[0].embedding

      const { error } = await supabase
        .from("cv_embeddings")
        .upsert(
          { candidate_id: candidate.id, embedding },
          { onConflict: "candidate_id" }
        )

      if (error) {
        failed++
        results.push({ name: candidate.name, status: "failed", error: error.message })
      } else {
        processed++
        results.push({ name: candidate.name, status: "done" })
      }

      await new Promise(r => setTimeout(r, 100))

    } catch (err: any) {
      failed++
      results.push({ name: candidate.name, status: "error", error: err?.message })
    }
  }

  return NextResponse.json({ processed, failed, remaining: candidates.length - processed - failed, results })
}
