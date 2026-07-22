import { recordUsage, computeCost } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

// ============================================================================
// STANDALONE v2 talent-pool scan — cascade scoring, no coverage cap.
// NOT wired into the app. Built for side-by-side comparison against the current
// scan. Returns the result directly (does NOT write to talent_pool_scans).
//
// Pipeline:
//   1. Vector-rank the ENTIRE pool (no match_count cap)          — free, nobody hidden
//   2. Wide pass: HAIKU scores every retrieved candidate         — cheap volume
//      ensembled with vector similarity (vector rescues Haiku under-scores)
//   3. Deep pass: SONNET deep-reads every finalist over a bar    — precision, NO fixed count
// ============================================================================

export const maxDuration = 300

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// cost accumulator
type Cost = { usd: number; calls: number }
const addCost = (c: Cost, model: string, usage: any) => {
  if (!usage) return
  const inTok = usage.input_tokens || usage.prompt_tokens || 0
  const outTok = usage.output_tokens || 0
  c.usd += computeCost(model, inTok, outTok)
  c.calls += 1
}

async function anthropic(model: string, maxTokens: number, prompt: string, cost: Cost, tag: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  })
  const data = await res.json()
  addCost(cost, model, data?.usage)
  recordUsage("anthropic", model, tag, data?.usage)
  return data?.content?.[0]?.text?.trim() || ""
}

function extractJson(text: string): any {
  try { return JSON.parse(text) } catch {}
  const m = text.match(/[\[{][\s\S]*[\]}]/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}

export async function POST(req: NextRequest) {
  // Auth: staff session OR internal secret (for the comparison harness).
  const secret = process.env.INTERNAL_API_SECRET
  const provided = req.headers.get("x-internal-secret")
  if (!(secret && provided && provided === secret)) {
    const gate = await requireStaff()
    if (!gate.ok) return gate.response
  }

  const t0 = Date.now()
  const cost: Cost = { usd: 0, calls: 0 }

  try {
    const body = await req.json().catch(() => ({} as any))
    const mandate_id = body?.mandate_id
    const mandate_title = body?.mandate_title || ""
    const job_description = body?.job_description || ""
    // tunables (defaults chosen for "consider everyone, deep-read the real contenders")
    const WIDE_LIMIT = Number(body?.wide_limit ?? 2000)   // hard ceiling on retrieval (effectively all)
    const DEEP_BAR = Number(body?.deep_bar ?? 45)          // Haiku score to earn a Sonnet deep read
    const SIM_RESCUE = Number(body?.sim_rescue ?? 0.45)    // vector similarity that rescues a low Haiku score
    if (!mandate_id || !job_description) return NextResponse.json({ error: "Missing mandate_id / job_description" }, { status: 400 })

    const sb = admin()

    // ---- 1. Parse JD into an ideal-candidate description (Haiku) ----
    const jdPrompt = `Read this job description and write a single 150-word paragraph describing the ideal candidate — what they would actually DO day-to-day, their responsibilities, scope, team sizes, industries, and the alternative job titles they might hold. Write it as a candidate description, not a job spec.\n\nJOB TITLE: ${mandate_title}\nJOB DESCRIPTION: ${job_description.slice(0, 3000)}\n\nReturn ONLY the paragraph.`
    let candidateDescription = job_description.slice(0, 500)
    try { const p = await anthropic("claude-haiku-4-5-20251001", 400, jdPrompt, cost, "scan-v2-jd"); if (p.length > 60) candidateDescription = p } catch {}

    // ---- 2. Embed + vector-rank the ENTIRE pool (no cap) ----
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: candidateDescription.slice(0, 8000) }),
    })
    const embData = await embRes.json()
    addCost(cost, "text-embedding-3-small", embData?.usage)
    recordUsage("openai", "text-embedding-3-small", "scan-v2", embData?.usage)

    const { data: vec } = await sb.rpc("match_candidates", {
      query_embedding: embData.data[0].embedding,
      match_threshold: 0.0,   // NO similarity cutoff
      match_count: WIDE_LIMIT, // effectively the whole database
    })
    const ranked: { candidate_id: string; similarity: number }[] = (vec as any) || []
    const simById: Record<string, number> = {}
    ranked.forEach(r => { simById[r.candidate_id] = r.similarity })
    const ids = ranked.map(r => r.candidate_id)

    if (!ids.length) return NextResponse.json({ error: "No embedded candidates found" }, { status: 200 })

    // Fetch candidate detail
    const { data: cands } = await sb.from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes, created_at")
      .in("id", ids)
    const byId: Record<string, any> = {}
    ;(cands || []).forEach((c: any) => { byId[c.id] = c })
    // keep vector order
    const pool = ids.map(id => byId[id]).filter(Boolean).map((c, i) => ({ ...c, similarity: simById[c.id], vrank: i + 1 }))

    // ---- 3. WIDE pass: Haiku scores EVERYONE (batched), ensembled with similarity ----
    const BATCH = 12
    const batches: any[][] = []
    for (let i = 0; i < pool.length; i += BATCH) batches.push(pool.slice(i, i + BATCH))

    const wideResults = (await Promise.all(batches.map(async (batch) => {
      const summaries = batch.map((c: any) => {
        const s = c.cv_structured
        return {
          id: c.id,
          title: c.current_title || "",
          company: c.current_company || "",
          cv: (c.cv_text || c.notes || "").slice(0, 2500),
          skills: s ? toArray(s.all_skills).slice(0, 15) : toArray(c.tags),
        }
      })
      const prompt = `You are a senior recruitment consultant doing a FAST first-pass screen. Score each candidate 0-100 for this role.\n\nROLE: ${mandate_title}\nWHAT WE NEED: ${candidateDescription}\n\nCANDIDATES:\n${JSON.stringify(summaries)}\n\nScore = SUITABILITY (0-50, does their actual work match — read what they DO, ignore title wording) + SENIORITY (0-50, right level).\nScore GENEROUSLY and for RECALL — this is only a first pass, a human reads the top ones later. When unsure, score UP (25-45), never 0. Also return a confidence 0-1.\n\nReturn ONLY a JSON array: [{ "id": "<id>", "score": <0-100>, "confidence": <0-1>, "reason": "<short>" }]`
      const txt = await anthropic("claude-haiku-4-5-20251001", 1500, prompt, cost, "scan-v2-wide")
      const arr = extractJson(txt)
      return Array.isArray(arr) ? arr : []
    }))).flat()

    const wideById: Record<string, any> = {}
    wideResults.forEach((w: any) => { if (w && w.id) wideById[w.id] = w })

    // Ensemble: blend Haiku score with vector similarity so a low Haiku score on a
    // strong semantic match still gets rescued into the deep read.
    const scored = pool.map((c: any) => {
      const w = wideById[c.id] || { score: 0, confidence: 0.5, reason: "" }
      const simPct = Math.round((c.similarity || 0) * 100)
      const ensemble = Math.round(Math.max(w.score, 0.6 * w.score + 0.4 * simPct))
      const lowConfidence = (w.confidence ?? 0.5) < 0.45
      const rescued = (c.similarity || 0) >= SIM_RESCUE && w.score < DEEP_BAR
      const finalist = ensemble >= DEEP_BAR || rescued || (lowConfidence && ensemble >= DEEP_BAR - 15)
      return { ...c, haiku_score: w.score, haiku_reason: w.reason, confidence: w.confidence, sim_pct: simPct, ensemble, finalist, rescued }
    })

    const finalists = scored.filter((c: any) => c.finalist).sort((a: any, b: any) => b.ensemble - a.ensemble)

    // ---- 4. DEEP pass: Sonnet deep-reads EVERY finalist (quality-gated, no count cap) ----
    const deep = await Promise.all(finalists.map(async (c: any) => {
      const fullCV = (c.cv_text || "").slice(0, 4000)
      let score = c.ensemble, reason = c.haiku_reason, tier = "possible", strengths: string[] = [], concerns: string[] = []
      if (fullCV.length > 80) {
        try {
          const prompt = `You are a senior recruitment consultant doing a thorough final assessment.\n\nROLE: ${mandate_title}\nREQUIREMENTS: ${job_description.slice(0, 1500)}\n\nCANDIDATE FULL CV:\n${fullCV}\n\nGive a final score 0-100 (suitability 0-50 + seniority 0-50), a specific 1-sentence reason referencing the CV, 2-3 strengths and 1-2 areas to probe — all specific to THIS role. Be generous: 25+ for any adjacent or partial relevance.\n\nReturn ONLY JSON: { "score": <0-100>, "tier": "strong"|"possible", "reason": "<specific>", "strengths": ["..."], "concerns": ["..."] }`
          const txt = await anthropic("claude-sonnet-4-6", 320, prompt, cost, "scan-v2-deep")
          const p = extractJson(txt)
          if (p && typeof p.score === "number") { score = p.score; reason = p.reason || reason; tier = p.tier || tier; strengths = toArray(p.strengths); concerns = toArray(p.concerns) }
        } catch {}
      }
      return { id: c.id, name: c.name, current_title: c.current_title, current_company: c.current_company, location: c.location, avatar_url: c.avatar_url, similarity: c.sim_pct, haiku_score: c.haiku_score, vrank: c.vrank, rescued: c.rescued, score, tier, reason, strengths, concerns }
    }))

    const matches = deep.filter((m: any) => m.score >= 15).sort((a: any, b: any) => b.score - a.score)
    const strong = matches.filter((m: any) => m.tier === "strong" || m.score >= 70)
    const possible = matches.filter((m: any) => !(m.tier === "strong" || m.score >= 70))

    return NextResponse.json({
      engine: "v2-cascade",
      mandate_title,
      pool_size: pool.length,
      wide_scored: pool.length,        // Haiku scored everyone
      finalists_deep_read: finalists.length,
      strong_matches: strong,
      possible_matches: possible,
      // candidates a top-60 cap (v1) would NOT have retrieved, but v2 surfaced as matches
      surfaced_beyond_top60: matches.filter((m: any) => m.vrank > 60).map((m: any) => ({ name: m.name, vrank: m.vrank, score: m.score, tier: m.tier, rescued: m.rescued })),
      cost_usd: Number(cost.usd.toFixed(4)),
      ai_calls: cost.calls,
      ms: Date.now() - t0,
      tunables: { WIDE_LIMIT, DEEP_BAR, SIM_RESCUE },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "scan v2 failed", cost_usd: Number(cost.usd.toFixed(4)) }, { status: 500 })
  }
}
