import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

function cleanText(text: string): string {
  return (text || "").replace(/[^\x00-\x7F]/g, " ").trim()
}

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
    const text = data.content?.[0]?.text || "{}"
    return JSON.parse(text.replace(/```json|```/g, "").trim())
  } catch { return { candidate_description: job_description.slice(0, 500), hard_requirements: {}, soft_preferences: {} } }
}

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
  try {
    const { mandate_id, job_description, mandate_title, deeper_search } = await req.json()
    if (!job_description) return NextResponse.json({ error: "No JD" }, { status: 400 })

    const supabase = createClient()
    const adminSupabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data: existing } = await supabase.from("applications").select("candidate_id").eq("mandate_id", mandate_id)
    const existingIds = (existing || []).map((a: any) => a.candidate_id)

    // ── Parse JD (use Haiku — fast) ───────────────────────────────────────────
    const jdParsed = await parseJD(mandate_title, job_description)
    const searchText = `${mandate_title}\n${jdParsed.candidate_description}`

    // ── Vector search for ranking order ───────────────────────────────────────
    const vectorThreshold = deeper_search ? 0.05 : 0.10
    let vectorIds: string[] = []

    try {
      const embRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "text-embedding-3-small", input: searchText.slice(0, 8000) }),
      })
      if (embRes.ok) {
        const embData = await embRes.json()
        const { data: vecResults } = await adminSupabase.rpc("match_candidates", {
          query_embedding: embData.data[0].embedding,
          match_threshold: vectorThreshold,
          match_count: 200,
        })
        if (vecResults?.length) {
          vectorIds = vecResults
            .filter((r: any) => !existingIds.includes(r.candidate_id))
            .map((r: any) => r.candidate_id)
        }
      }
    } catch (err) { console.error("Vector error:", err) }

    // ── Fetch ALL candidates ──────────────────────────────────────────────────
    const { data: allCandidates } = await supabase.from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes")
      .order("created_at", { ascending: false })

    let available: any[] = (allCandidates || []).filter((c: any) => !existingIds.includes(c.id))

    // Sort vector matches first, then append the rest
    if (vectorIds.length) {
      const vectorRanked = vectorIds.map((id: string) => available.find((c: any) => c.id === id)).filter(Boolean)
      const notInVector = available.filter((c: any) => !vectorIds.includes(c.id))
      available = [...vectorRanked, ...notInVector]
    }

    if (!available.length) return NextResponse.json({ total_available: 0, strong_matches: [], possible_matches: [], summary: "No candidates available yet." })

    // ── PHASE 1: Parallel Haiku pre-screen (all batches at once) ─────────────
    const BATCH_SIZE = 26
    const batches: any[][] = []
    for (let i = 0; i < available.length; i += BATCH_SIZE) {
      batches.push(available.slice(i, i + BATCH_SIZE))
    }

    const phase1Results = await Promise.all(batches.map(async (batch) => {
      const summaries = batch.map((c: any) => ({
        id: c.id,
        title: c.current_title || "Unknown",
        company: c.current_company || "Unknown",
        cv: cleanText(c.cv_text || c.notes || "").slice(0, 1500),
      }))

      const prompt = `You are a recruitment consultant. Score these candidates for the role.

ROLE: ${mandate_title}
WHAT WE NEED: ${jdParsed.candidate_description}

CANDIDATES:
${JSON.stringify(summaries)}

Score each 0-100. Rules:
- 70-100: Strong match — right function AND right seniority
- 40-69: Partial match — right function, wrong sector OR slightly wrong level  
- 15-39: Adjacent — some transferable skills
- 0-14: Completely different function (e.g. marketer for CTO role)

Read the CV content carefully. A VP Engineering scores 70+ for CTO. A CFO scores 70+ for CFO regardless of sector. Never score below 15 based on sector alone.

Return ONLY JSON array, no markdown:
[{"id":"<id>","score":<0-100>}]`

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || "[]"
        return JSON.parse(text.replace(/```json|```/g, "").trim())
      } catch { return [] }
    }))

    const phase1Scores = phase1Results.flat()
    const top20 = phase1Scores
      .filter((m: any) => m.score >= 15)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 20)
    const top20ids = top20.map((m: any) => m.id)

    // ── PHASE 2: Parallel Sonnet deep read (all top 20 at once) ──────────────
    const top20Candidates = available.filter((c: any) => top20ids.includes(c.id))

    const deepResults = await Promise.all(top20Candidates.map(async (c: any) => {
      const p1 = top20.find((m: any) => m.id === c.id)
      const fullCV = cleanText(c.cv_text || "").slice(0, 6000)
      const structured = c.cv_structured

      const gaps = structured
        ? analyseGaps(structured, jdParsed.hard_requirements || {}, jdParsed.soft_preferences || {})
        : { present: [], partial: [], missing_hard: [], missing_soft: [] }

      let score = p1?.score || 50
      let reason = ""
      let tier = score >= 70 ? "strong" : "possible"
      let strengths: string[] = []
      let concerns: string[] = []

      if (fullCV.length > 100) {
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
              model: "claude-sonnet-4-6", max_tokens: 400,
              messages: [{ role: "user", content: `Senior recruiter assessment.

ROLE: ${mandate_title}
JD: ${job_description.slice(0, 1500)}

CANDIDATE CV:
${fullCV}

Score 0-100 (function fit 0-50 + seniority fit 0-50). Be generous — score 25+ for adjacent relevance.

Return ONLY JSON:
{"score":<0-100>,"tier":"strong"|"possible","reason":"<1 sentence referencing actual CV content>","strengths":["<role-specific strength>","<strength 2>"],"concerns":["<probe area>","<concern 2>"]}` }]
            })
          })
          const data = await res.json()
          const parsed = JSON.parse((data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim())
          if (parsed.score != null) {
            score = parsed.score
            tier = parsed.tier || tier
            reason = parsed.reason || ""
            strengths = parsed.strengths || []
            concerns = parsed.concerns || []
          }
        } catch {}
      }

      return score >= 15 ? {
        ...c,
        score,
        tier,
        reason,
        gaps,
        ai_strengths: strengths,
        ai_concerns: concerns,
        trajectory: structured?.career_trajectory || null,
        avg_tenure: structured?.avg_tenure_years || null,
        total_years: structured?.total_years_experience || null,
        seniority_level: structured?.seniority_level || null,
        certifications: structured ? toArray(structured.certifications) : [],
        all_skills: structured ? toArray(structured.all_skills).slice(0, 12) : toArray(c.tags),
      } : null
    }))

    const finalMatches = deepResults.filter(Boolean)

    // Phase 1 candidates not in top 20 — show as possible without deep read
    const remaining = phase1Scores
      .filter((m: any) => m.score >= 15 && !top20ids.includes(m.id))
      .map((m: any) => {
        const c = available.find((c: any) => c.id === m.id)
        return c ? { ...c, score: m.score, tier: "possible", reason: "Identified in initial screening", gaps: null } : null
      })
      .filter(Boolean)

    const allMatches = [...finalMatches, ...remaining].sort((a: any, b: any) => b.score - a.score)
    const strong_matches = allMatches.filter((m: any) => m.tier === "strong" || m.score >= 70)
    const possible_matches = allMatches.filter((m: any) => m.tier !== "strong" && m.score < 70)

    // Summary
    let summary = `Found ${strong_matches.length} strong and ${possible_matches.length} possible matches from ${available.length} candidates reviewed.`
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 120,
          messages: [{ role: "user", content: `2 sentences for a recruiter: Role "${mandate_title}", ${available.length} candidates reviewed, ${strong_matches.length} strong, ${possible_matches.length} possible. Top: ${strong_matches.slice(0, 3).map((m: any) => m.name).join(", ")}. Be direct.` }]
        })
      })
      const data = await res.json()
      summary = data.content?.[0]?.text?.trim() || summary
    } catch {}

    return NextResponse.json({
      total_available: available.length,
      summary,
      strong_matches,
      possible_matches,
      deeper_search_available: !deeper_search,
      jd_requirements: jdParsed,
    })

  } catch (err) {
    console.error("Mandate insight error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
