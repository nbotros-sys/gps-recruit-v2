import { recordUsage } from "@/lib/ai-usage"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { setSentryUser, withSpan, captureError } from "@/lib/sentry"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

// Parse JD to extract hard requirements vs soft preferences
async function parseJD(mandate_title: string, job_description: string) {
  const prompt = `Read this job description and extract two things:

1. A 150-word paragraph describing the ideal candidate — what they would actually DO day-to-day, their real responsibilities, scope, team sizes, industries, alternative titles they might hold. Write as a candidate description, not a job spec.

2. A structured list of requirements split into HARD (mandatory, non-negotiable) and SOFT (preferred, advantageous).

JOB TITLE: ${mandate_title}
JOB DESCRIPTION: ${job_description.slice(0, 3000)}

Return ONLY valid JSON (no markdown):
{
  "candidate_description": "<150 word paragraph>",
  "hard_requirements": {
    "certifications": ["<cert required>"],
    "education": ["<degree required>"],
    "languages": ["<language required>"],
    "min_years_experience": <number or null>,
    "industries": ["<sector required>"],
    "skills": ["<must-have skill>"],
    "other": ["<any other hard requirement>"]
  },
  "soft_preferences": {
    "certifications": ["<cert preferred>"],
    "education": ["<degree preferred>"],
    "languages": ["<language preferred>"],
    "industries": ["<sector preferred>"],
    "skills": ["<nice-to-have skill>"],
    "other": ["<any other preference>"]
  }
}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
    })
    const data = await res.json()
    await recordUsage("anthropic", "claude-haiku-4-5-20251001", "mandate-insight", data?.usage)
    const text = data.content?.[0]?.text || "{}"
    return JSON.parse(text.replace(/```json|```/g, "").trim())
  } catch { return { candidate_description: job_description.slice(0, 500), hard_requirements: {}, soft_preferences: {} } }
}

// Deep gap analysis for a single candidate against JD requirements
function analyseGaps(structured: any, hard: any, soft: any) {
  const present: string[] = []
  const partial: string[] = []
  const missing_hard: string[] = []
  const missing_soft: string[] = []

  const allSkills = toArray(structured?.all_skills).map((s: string) => s.toLowerCase())
  const certs = toArray(structured?.certifications).map((s: string) => s.toLowerCase())
  const langs = toArray(structured?.languages).map((l: any) => (l.language || l).toLowerCase())
  const industries = toArray(structured?.industries).map((s: string) => s.toLowerCase())
  const edu = toArray(structured?.education).map((e: any) => `${e.degree || ""} ${e.field || ""}`.toLowerCase())

  function check(items: string[], pool: string[], label: string, isSoft = false) {
    for (const item of items) {
      const itemL = item.toLowerCase()
      const exact = pool.some(p => p.includes(itemL) || itemL.includes(p))
      const partial_match = !exact && pool.some(p => {
        const words = itemL.split(" ").filter(w => w.length > 3)
        return words.some(w => p.includes(w))
      })
      if (exact) present.push(item)
      else if (partial_match) partial.push(`${item} (partial)`)
      else if (isSoft) missing_soft.push(item)
      else missing_hard.push(item)
    }
  }

  check(toArray(hard.skills), allSkills, "skill")
  check(toArray(hard.certifications), certs, "cert")
  check(toArray(hard.languages), langs, "language")
  check(toArray(hard.industries), industries, "industry")
  check(toArray(hard.education), edu, "education")
  if (hard.min_years_experience && structured?.total_years_experience) {
    if (structured.total_years_experience >= hard.min_years_experience) present.push(`${structured.total_years_experience}yrs experience`)
    else missing_hard.push(`Min ${hard.min_years_experience}yrs (has ${structured.total_years_experience})`)
  }
  check(toArray(soft.skills), allSkills, "skill", true)
  check(toArray(soft.certifications), certs, "cert", true)
  check(toArray(soft.industries), industries, "industry", true)

  return { present, partial, missing_hard, missing_soft }
}

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  try {
    const { mandate_id, job_description, mandate_title, deeper_search } = await req.json()
    if (!job_description) return NextResponse.json({ error: "No JD" }, { status: 400 })

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const adminSupabase = supabase

    const { data: existing } = await supabase.from("applications").select("candidate_id").eq("mandate_id", mandate_id)
    const existingIds = (existing || []).map((a: any) => a.candidate_id)

    // ── Parse JD into candidate description + structured requirements ──────────
    const jdParsed = await withSpan("parseJD", () => parseJD(mandate_title, job_description), { mandate_title })
    const searchText = `${mandate_title}\n${jdParsed.candidate_description}`

    // ── Vector search ─────────────────────────────────────────────────────────
    const vectorThreshold = deeper_search ? 0.0 : 0.0
    const vectorLimit = deeper_search ? 100 : 60
    let vectorIds: string[] = []

    try {
      const embRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "text-embedding-3-small", input: searchText.slice(0, 8000) }),
      })
      if (embRes.ok) {
        const embData = await embRes.json()
        await recordUsage("openai", "text-embedding-3-small", "embedding", embData.usage)
        const { data: vecResults } = await adminSupabase.rpc("match_candidates", {
          query_embedding: embData.data[0].embedding,
          match_threshold: vectorThreshold,
          match_count: vectorLimit,
        })
        if (vecResults?.length) {
          vectorIds = vecResults.filter((r: any) => !existingIds.includes(r.candidate_id)).map((r: any) => r.candidate_id)
        }
      }
    } catch (err) { console.error("Vector error:", err) }

    // ── Fetch candidates — vector-first, scalable to 3-4K candidates ──────────
    // Vector search filters the pool first (fast, cheap, scalable)
    // If vector finds candidates, only fetch those + recent non-embedded candidates
    // If no vector results, fall back to recent 100 candidates
    let available: any[] = []

    if (vectorIds.length) {
      // Fetch vector matches (already ranked by similarity)
      let vectorQuery = supabase.from("candidates")
        .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes")
        .in("id", vectorIds)
      if (existingIds.length) vectorQuery = vectorQuery.not("id", "in", `(${existingIds.join(",")})`)
      const { data: vectorCands } = await vectorQuery

      // Also fetch recent candidates without embeddings (just uploaded, not yet embedded)
      const allKnownIds = [...vectorIds, ...existingIds]
      let recentQuery = supabase.from("candidates")
        .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes")
        .order("created_at", { ascending: false })
        .limit(20)
      if (allKnownIds.length) recentQuery = recentQuery.not("id", "in", `(${allKnownIds.join(",")})`)
      const { data: recentNoEmbed } = await recentQuery

      // Vector results first (ranked by similarity), then recent unembedded
      const vectorRanked = vectorIds
        .map((id: string) => (vectorCands || []).find((c: any) => c.id === id))
        .filter(Boolean)
      available = [...vectorRanked, ...(recentNoEmbed || [])]
    } else {
      // No embeddings yet — fall back to most recent 100 candidates
      let fallbackQuery = supabase.from("candidates")
        .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes")
        .order("created_at", { ascending: false })
        .limit(100)
      if (existingIds.length) fallbackQuery = fallbackQuery.not("id", "in", `(${existingIds.join(",")})`)
      const { data: fallback } = await fallbackQuery
      available = fallback || []
    }

    console.log(`[insight] available=${available.length} vectorIds=${vectorIds.length} existingIds=${existingIds.length}`)
    if (!available.length) return NextResponse.json({ total_available: 0, strong_matches: [], possible_matches: [], summary: "No candidates available yet." })

    // ── PHASE 1: AI scoring using structured cards (fast) ─────────────────────
    const BATCH_SIZE = 10
    const phase1Scores: any[] = []

    for (let i = 0; i < available.length; i += BATCH_SIZE) {
      const batch = available.slice(i, i + BATCH_SIZE)
      const summaries = batch.map((c: any) => {
        const s = c.cv_structured
        return {
          id: c.id,
          title: c.current_title,
          company: c.current_company,
          // Use structured summary if available, fall back to CV snippet
          summary: s?.summary_paragraph || (c.cv_text || c.notes || "").slice(200, 1200),
          skills: s ? toArray(s.all_skills).slice(0, 15) : toArray(c.tags),
          seniority: s?.seniority_level,
          years: s?.total_years_experience,
          certifications: s ? toArray(s.certifications) : [],
          industries: s ? toArray(s.industries) : [],
          trajectory: s?.career_trajectory,
        }
      })

      const prompt = `You are a senior recruitment consultant. Score candidates for this role.

ROLE: ${mandate_title}
WHAT WE NEED: ${jdParsed.candidate_description}

CANDIDATES:
${JSON.stringify(summaries)}

Score each 0-100 combining:
- SUITABILITY (0-50): Does their actual work experience match what this role needs? Read what they DO, ignore title differences.
- SENIORITY (0-50): Is their level right? Too junior or overqualified both score lower.

Score generously. Read what each candidate actually DOES, not just their title.
- A Group CEO or CEO of any company scores 70+ for a CEO role
- A CFO at any company scores 70+ for a CFO role  
- A VP Engineering or Head of Engineering scores 70+ for a CTO role
- A VP Sales at any company scores 70+ for a VP Sales role
- Only score below 15 if the candidate's entire career is completely unrelated (e.g. a supply chain manager for a CEO role)
- When in doubt score 25-40, never score 0

Return ONLY JSON array:
[{ "id": "<id>", "score": <0-100>, "tier": "strong" | "possible", "reason": "<one sentence on suitability + seniority>" }]`

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
        })
        const data = await res.json()
        await recordUsage("anthropic", "claude-sonnet-4-6", "mandate-insight", data?.usage)
        const text = data.content?.[0]?.text || "[]"
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
        phase1Scores.push(...parsed)
      } catch {}
    }

    // Sort by score, take top 20 for deep read
    console.log(`[insight] phase1 raw scores: ${phase1Scores.length} candidates scored`)
    console.log(`[insight] phase1 sample scores: ${phase1Scores.slice(0,5).map((m:any) => `${m.score}`).join(', ')}`)
    const phase1Sorted = phase1Scores.filter(m => m.score >= 10).sort((a, b) => b.score - a.score)
    console.log(`[insight] phase1 after filter (>=15): ${phase1Sorted.length} candidates`)
    const top20ids = phase1Sorted.slice(0, 15).map((m: any) => m.id)

    // ── PHASE 2: Deep read top candidates — runs in parallel ─────────────────
    console.log(`[insight] top20ids: ${top20ids.length} candidates going to deep read`)
    const top20Candidates = available.filter((c: any) => top20ids.includes(c.id))

    const deepReadResults = await Promise.all(top20Candidates.map(async (c: any) => {
      const phase1Score = phase1Sorted.find((m: any) => m.id === c.id)
      const fullCVText = (c.cv_text || "").slice(0, 4000)
      const structured = c.cv_structured

      let gaps = { present: [] as string[], partial: [] as string[], missing_hard: [] as string[], missing_soft: [] as string[] }
      if (structured) {
        gaps = analyseGaps(structured, jdParsed.hard_requirements || {}, jdParsed.soft_preferences || {})
      }

      let deepScore = phase1Score?.score || 50
      let deepReason = phase1Score?.reason || ""
      let tier = phase1Score?.tier || "possible"

      if (fullCVText.length > 200) {
        try {
          const deepPrompt = `You are a senior recruitment consultant doing a thorough final assessment.

ROLE: ${mandate_title}
REQUIREMENTS: ${job_description.slice(0, 1500)}

CANDIDATE FULL CV:
${fullCVText}

Give a final score 0-100 (suitability 0-50 + seniority 0-50), a specific 1-sentence reason, and 2-3 strengths and 1-2 areas to probe — all specific to THIS role, not generic.
Be generous — score 25+ for any candidate with adjacent or partial relevance.

Return ONLY JSON:
{
  "score": <0-100>,
  "tier": "strong" | "possible",
  "reason": "<specific 1-sentence reason referencing CV content>",
  "strengths": ["<strength specific to this role>", "<strength 2>", "<strength 3>"],
  "concerns": ["<area to probe specific to this role>", "<area 2>"]
}`

          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: deepPrompt }] }),
          })
          const data = await res.json()
          await recordUsage("anthropic", "claude-sonnet-4-6", "mandate-insight", data?.usage)
          const parsed = JSON.parse((data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim())
          if (parsed.score) {
            deepScore = parsed.score
            deepReason = parsed.reason
            tier = parsed.tier
            if (parsed.strengths) c.ai_strengths = parsed.strengths
            if (parsed.concerns) c.ai_concerns = parsed.concerns
          }
        } catch {}
      }

      if (deepScore >= 15) {
        return {
          ...c,
          score: deepScore,
          tier,
          reason: deepReason,
          gaps,
          ai_strengths: c.ai_strengths || [],
          ai_concerns: c.ai_concerns || [],
          trajectory: structured?.career_trajectory || null,
          avg_tenure: structured?.avg_tenure_years || null,
          total_years: structured?.total_years_experience || null,
          seniority_level: structured?.seniority_level || null,
          certifications: structured ? toArray(structured.certifications) : [],
          all_skills: structured ? toArray(structured.all_skills).slice(0, 12) : toArray(c.tags),
        }
      }
      return null
    }))

    const finalMatches = deepReadResults.filter(Boolean)
    console.log(`[insight] finalMatches: ${finalMatches.length} after deep read`)

    // Include phase1 matches not in top 20 (possible matches without deep read)
    const remaining = phase1Sorted.slice(15).filter(m => m.score >= 10).map((m: any) => {
      const c = available.find((c: any) => c.id === m.id)
      return c ? { ...c, score: m.score, tier: "possible", reason: m.reason, gaps: null } : null
    }).filter(Boolean)

    const allMatches = [...finalMatches, ...remaining].sort((a, b) => b.score - a.score)
    const strong_matches = allMatches.filter((m: any) => m.tier === "strong" || m.score >= 70)
    const possible_matches = allMatches.filter((m: any) => m.tier !== "strong" && m.score < 70)

    // Executive summary
    let summary = ""
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 120,
          messages: [{ role: "user", content: `Summarise in 2 sentences for a recruiter: Role "${mandate_title}", ${available.length} candidates reviewed, ${strong_matches.length} strong matches, ${possible_matches.length} possible. Top candidates: ${strong_matches.slice(0,3).map((m:any)=>m.name).join(", ")}. Be direct about the talent availability.` }]
        })
      })
      const data = await res.json()
      await recordUsage("anthropic", "claude-sonnet-4-6", "mandate-insight", data?.usage)
      summary = data.content?.[0]?.text?.trim() || ""
    } catch {}

    return NextResponse.json({
      total_available: available.length,
      summary: summary || `Found ${strong_matches.length} strong and ${possible_matches.length} possible matches from ${available.length} candidates.`,
      strong_matches,
      possible_matches,
      deeper_search_available: !deeper_search,
      jd_requirements: jdParsed,
    })

  } catch (err) {
    console.error("Mandate insight error:", err)
    captureError(err, "mandate-insight")
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
