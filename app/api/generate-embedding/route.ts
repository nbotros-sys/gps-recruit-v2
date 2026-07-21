import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"
import { rateLimit, clientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    // Access gate. Accepts EITHER:
    //   1. the internal shared secret - for server-to-server callers such as
    //      /api/enrich-from-linkedin, which cannot carry a user session
    //   2. a valid staff session - for browser callers such as the
    //      internal database page's re-analyse/re-embed action
    // Everyone else is rejected before any OpenAI spend happens.
    //
    // NOTE: candidate (non-staff) sessions are deliberately NOT accepted.
    // When the CV Builder relaunches, its browser-side calls must go through a
    // server route that supplies the secret rather than calling this directly.
    const secret = process.env.INTERNAL_API_SECRET
    const provided = req.headers.get("x-internal-secret")
    const viaSecret = Boolean(secret && provided && provided === secret)

    if (!viaSecret) {
      const gate = await requireStaff()
      if (!gate.ok) return gate.response
    }

    // Backstop against runaway cost from a compromised session or a looping
    // client. Set high enough not to interfere with normal bulk staff work.
    const ip = clientIp(req)
    const allowed = await rateLimit(`generate-embedding:${ip}`, { windowSeconds: 3600, limit: 1000 })
    if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

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
    recordUsage("openai", "text-embedding-3-small", "embedding", embeddingData.usage, { candidateId }).catch(() => {})

    // Store in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Upsert - replace if exists
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
