import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const { candidateId, text } = await req.json()
    if (!candidateId || !text) return NextResponse.json({ error: "Missing data" }, { status: 400 })

    // Generate embedding using OpenAI text-embedding-3-small (1536 dims, fast, cheap)
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // max 8k chars
      }),
    })

    if (!embeddingRes.ok) {
      const err = await embeddingRes.json()
      console.error("OpenAI error:", err)
      return NextResponse.json({ error: "Embedding failed" }, { status: 500 })
    }

    const embeddingData = await embeddingRes.json()
    const embedding = embeddingData.data[0].embedding

    // Store in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Upsert — replace if exists
    const { error } = await supabase
      .from("cv_embeddings")
      .upsert({ candidate_id: candidateId, embedding }, { onConflict: "candidate_id" })

    if (error) {
      console.error("Supabase upsert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Embedding error:", err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
