import { recordUsage, computeCost } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

// ============================================================================
// v2 talent-pool scan — QUALITY MODE: v1's exact Sonnet scoring, whole pool, no cap.
// "v1's brain, v2's reach." Same prompts/rubric as the live scan, but every
// candidate is retrieved (no top-60 cap) and Sonnet-scored, so the scores match
// v1's scale AND nobody falls through. Standalone; does not modify the live scan.
// (Haiku cost-cascade preserved in git history for the later cost-optimisation phase.)
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
    const mandateTitle = body?.mandate_title || ""
    const job_description = body?.job_description || ""
    const WIDE_LIMIT = Number(body?.wide_limit ?? 2000)  // effectively the whole pool
    const DEEP_TOP = Number(body?.deep_top ?? 20)        // how many top get the phase-2 deep read (v1 uses 15)
    if (!mandate_id || !job_description) return NextResponse.json({ error: "Missing mandate_id / job_description" }, { status: 400 })

    const sb = admin()

    // ---- Parse JD -> ideal-candidate description (Haiku, same as v1) ----
    const jdPrompt = `Read this job description and write a single 150-word paragraph describing the ideal candidate — what they would actually DO day-to-day, their real responsibilities, scope, team sizes, industries, and the alternative job titles they might hold. Write it as a candidate description, not a job spec.\n\nJOB TITLE: ${mandateTitle}\nJOB DESCRIPTION: ${job_description.slice(0, 3000)}\n\nReturn ONLY the paragraph.`
    let candidateDescription = job_description.slice(0, 500)
    try { const p = await anthropic("claude-haiku-4-5-20251001", 400, jdPrompt, cost, "scan-v2-jd"); if (p.length > 60) candidateDescription = p } catch {}

    // ---- Embed + retrieve the ENTIRE pool (no cap) ----
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
      match_threshold: 0.0,
      match_count: WIDE_LIMIT,
    })
    const ranked: { candidate_id: string; similarity: number }[] = (vec as any) || []
    const ids = ranked.map(r => r.candidate_id)
    if (!ids.length) return NextResponse.json({ error: "No embedded candidates found" }, { status: 200 })

    const { data: cands } = await sb.from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes, created_at")
      .in("id", ids)
    const byId: Record<string, any> = {}
    ;(cands || []).forEach((c: any) => { byId[c.id] = c })
    const pool = ids.map((id, i) => byId[id] ? { ...byId[id], vrank: i + 1 } : null).filter(Boolean)

    // ---- PHASE 1: Sonnet scores EVERYONE — v1's exact prompt & rubric ----
    const BATCH = 10
    const batches: any[][] = []
    for (let i = 0; i < pool.length; i += BATCH) batches.push(pool.slice(i, i + BATCH))

    const phase1 = (await Promise.all(batches.map(async (batch) => {
      const summaries = batch.map((c: any) => {
        const s = c.cv_structured
        return {
          id: c.id,
          title: c.current_title || "",
          company: c.current_company || "",
          cv: (c.cv_text || c.notes || "").slice(0, 3000),
          skills: s ? toArray(s.all_skills).slice(0, 20) : toArray(c.tags),
        }
      })
      const prompt = `You are a senior recruitment consultant. Score candidates for this role.\n\nROLE: ${mandateTitle}\nWHAT WE NEED: ${candidateDescription}\n\nCANDIDATES:\n${JSON.stringify(summaries)}\n\nScore each 0-100 combining:\n- SUITABILITY (0-50): Does their actual work experience match what this role needs? Read what they DO, ignore title differences.\n- SENIORITY (0-50): Is their level right? Too junior or overqualified both score lower.\n\nScore generously. Read what each candidate actually DOES, not just their title.\n- A Group CEO or CEO of any company scores 70+ for a CEO role\n- A CFO at any company scores 70+ for a CFO role\n- A VP Engineering or Head of Engineering scores 70+ for a CTO role\n- A VP Sales at any company scores 70+ for a VP Sales role\n- Only score below 15 if the candidate's entire career is completely unrelated\n- When in doubt score 25-40, never score 0\n\nReturn ONLY JSON array:\n[{ "id": "<id>", "score": <0-100>, "tier": "strong" | "possible", "reason": "<one sentence on suitability + seniority>" }]`
      const txt = await anthropic("claude-sonnet-4-6", 1500, prompt, cost, "scan-v2-p1")
      const arr = extractJson(txt)
      return Array.isArray(arr) ? arr : []
    }))).flat()

    const p1ById: Record<string, any> = {}
    phase1.forEach((m: any) => { if (m && m.id) p1ById[m.id] = m })
    const p1Sorted = pool
      .map((c: any) => ({ c, s: p1ById[c.id] }))
      .filter((x: any) => x.s && x.s.score >= 10)
      .sort((a: any, b: any) => b.s.score - a.s.score)

    // ---- PHASE 2: Sonnet deep-reads the top DEEP_TOP — v1's exact deep prompt ----
    const topForDeep = p1Sorted.slice(0, DEEP_TOP)
    const deepById: Record<string, any> = {}
    await Promise.all(topForDeep.map(async ({ c }: any) => {
      const fullCV = (c.cv_text || "").slice(0, 4000)
      if (fullCV.length < 80) return
      try {
        const prompt = `You are a senior recruitment consultant doing a thorough final assessment.\n\nROLE: ${mandateTitle}\nREQUIREMENTS: ${job_description.slice(0, 1500)}\n\nCANDIDATE FULL CV:\n${fullCV}\n\nGive a final score 0-100 (suitability 0-50 + seniority 0-50), a specific 1-sentence reason, and 2-3 strengths and 1-2 areas to probe — all specific to THIS role, not generic.\nBe generous — score 25+ for any candidate with adjacent or partial relevance.\n\nReturn ONLY JSON:\n{ "score": <0-100>, "tier": "strong" | "possible", "reason": "<specific 1-sentence reason referencing CV content>", "strengths": ["<strength>", "<strength 2>"], "concerns": ["<area to probe>"] }`
        const txt = await anthropic("claude-sonnet-4-6", 300, prompt, cost, "scan-v2-p2")
        const p = extractJson(txt)
        if (p && typeof p.score === "number") deepById[c.id] = p
      } catch {}
    }))

    // ---- Assemble (same shape/logic as v1) ----
    const matches = p1Sorted.map(({ c, s }: any) => {
      const d = deepById[c.id]
      const score = d?.score ?? s.score
      const tier = d?.tier ?? s.tier
      const reason = d?.reason ?? s.reason
      return {
        id: c.id, name: c.name, current_title: c.current_title, current_company: c.current_company,
        location: c.location, avatar_url: c.avatar_url, vrank: c.vrank,
        score, tier, reason,
        strengths: toArray(d?.strengths), concerns: toArray(d?.concerns),
        deep_read: !!d,
      }
    }).filter((m: any) => m.score >= 15).sort((a: any, b: any) => b.score - a.score)

    const strong = matches.filter((m: any) => m.tier === "strong" || m.score >= 70)
    const possible = matches.filter((m: any) => !(m.tier === "strong" || m.score >= 70))

    return NextResponse.json({
      engine: "v2-quality (v1 rubric, uncapped)",
      mandate_title: mandateTitle,
      pool_size: pool.length,
      scored: p1Sorted.length,
      deep_read: topForDeep.length,
      strong_matches: strong,
      possible_matches: possible,
      surfaced_beyond_top60: matches.filter((m: any) => m.vrank > 60).map((m: any) => ({ name: m.name, vrank: m.vrank, score: m.score, tier: m.tier })),
      cost_usd: Number(cost.usd.toFixed(4)),
      ai_calls: cost.calls,
      ms: Date.now() - t0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "scan v2 failed", cost_usd: Number(cost.usd.toFixed(4)) }, { status: 500 })
  }
}
