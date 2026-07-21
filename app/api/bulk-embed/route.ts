import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

// Build a rich semantic paragraph describing what the candidate actually does.
// This is what gets embedded — not raw fields. Makes semantic search understand
// "Financial Controller" and "Head of Accounts" as the same kind of person.
async function buildSemanticText(candidate: any): Promise<string> {
  const hasCvText = (candidate.cv_text || "").length > 200

  if (hasCvText) {
    // Ask Claude to distil the CV into a rich semantic paragraph
    const prompt = `Read this CV and write a single 150-200 word paragraph describing what this person actually does professionally. Focus on:
- Their real responsibilities and day-to-day work (not just job titles)
- The scale and scope of their work (team sizes, budgets, geographies)
- Key skills and tools they use
- Industries and sectors they have worked in
- Seniority level and who they report to or manage
- Any specialisms or notable achievements

Do NOT use their name. Do NOT use job title labels alone — describe the actual work.
Write in third person present tense. Return ONLY the paragraph, no heading.

CV:
${(candidate.cv_text || "").slice(0, 6000)}`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      })
      const data = await res.json()
      await recordUsage("anthropic", "claude-sonnet-4-6", "bulk-embed", data?.usage)
      const summary = data.content?.[0]?.text?.trim() || ""
      if (summary.length > 100) {
        // Prepend structured fields so exact lookups still work
        return [
          candidate.current_title,
          candidate.current_company,
          candidate.location,
          (candidate.tags || []).join(", "),
          summary,
        ].filter(Boolean).join("\n")
      }
    } catch {}
  }

  // Fallback: structured fields only (no CV text)
  return [
    candidate.name,
    candidate.current_title,
    candidate.current_company,
    candidate.location,
    (candidate.tags || []).join(", "),
    candidate.notes || "",
    (candidate.cv_text || "").slice(0, 4000),
  ].filter(Boolean).join("\n")
}

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: existing } = await supabase
    .from("cv_embeddings").select("candidate_id")
  const existingIds = (existing || []).map((e: any) => e.candidate_id)

  const { data: allCandidates } = await supabase
    .from("candidates")
    .select("id, name, current_title, current_company, location, tags, cv_text, notes")
    .limit(500)

  const candidates = (allCandidates || [])
    .filter((c: any) => !existingIds.includes(c.id))
    .slice(0, 50)

  if (!candidates.length) {
    return NextResponse.json({
      processed: 0,
      total_existing: existingIds.length,
      message: "All candidates already have embeddings — search is ready."
    })
  }

  let processed = 0
  let failed = 0
  const results: any[] = []

  for (const candidate of candidates) {
    try {
      // Build rich semantic text — Claude summarises what they actually do
      const text = await buildSemanticText(candidate)

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
        results.push({ name: candidate.name, status: "failed" })
        continue
      }

      const embeddingData = await embeddingRes.json()
      const embedding = embeddingData.data[0].embedding
      await recordUsage("openai", "text-embedding-3-small", "embedding", embeddingData.usage, { candidateId: candidate.id })

      const { error } = await supabase
        .from("cv_embeddings")
        .upsert({ candidate_id: candidate.id, embedding }, { onConflict: "candidate_id" })

      if (error) {
        failed++
        results.push({ name: candidate.name, status: "failed", error: error.message })
      } else {
        processed++
        results.push({ name: candidate.name, status: "done" })
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200))

    } catch (err: any) {
      failed++
      results.push({ name: candidate.name, status: "error", error: err?.message })
    }
  }

  return NextResponse.json({ processed, failed, results })
}
