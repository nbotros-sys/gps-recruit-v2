import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { createClient as createAdminClient } from "@supabase/supabase-js"

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
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
    })
    const data = await res.json()
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
  try {
    const { mandate_id, job_description, mandate_title, deeper_search } = await req.json()
    if (!job_description) return NextResponse.json({ error: "No JD" }, { status: 400 })

    const supabase = createClient()
    const adminSupabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data: existing } = await supabase.from("applications").select("candidate_id").eq("mandate_id", mandate_id)
    const existingIds = (existing || []).map((a: any) => a.candidate_id)

    // ── Parse JD into candidate description + structured requirements ──────────
    const jdParsed = await parseJD(mandate_title, job_description)
    const searchText = `${mandate_title}\n${jdParsed.candidate_description}`

    // ── Vector search ─────────────────────────────────────────────────────────
    const vectorThreshold = deeper_search ? 0.05 : 0.10
    const vectorLimit = deeper_search ? 200 : 150
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
          match_count: vectorLimit,
        })
        if (vecResults?.length) {
          vectorIds = vecResults.filter((r: any) => !existingIds.includes(r.candidate_id)).map((r: any) => r.candidate_id)
        }
      }
    } catch (err) { console.error("Vector error:", err) }

    // ── Fetch ALL candidates not already in pipeline ──────────────────────────
    // With small pools (<500) always scan everyone — vector search used for ranking only
    const { data: allCandidates } = await supabase.from("candidates")
      .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes")
      .order("created_at", { ascending: false })
    
    // Rank by vector similarity if we have results, otherwise use full pool
    let available: any[] = (allCandidates || []).filter((c: any) => !existingIds.includes(c.id))
    
    if (vectorIds.length) {
      // Sort by vector similarity first, then append any candidates not in vector results
      const vectorRanked = vectorIds
        .map((id: string) => available.find((c: any) => c.id === id))
        .filter(Boolean)
      const notInVector = available.filter((c: any) => !vectorIds.includes(c.id))
      available = [...vectorRanked, ...notInVector]
    }

    if (!available.length) return NextResponse.json({ total_available: 0, strong_matches: [], possible_matches: [], summary: "No candidates available yet." })

    // ── PHASE 1: Parallel batch scoring (fast pre-filter) ────────────────────
    const BATCH_SIZE = 26
    const phase1Batches: any[][] = []
    for (let i = 0; i < available.length; i += BATCH_SIZE) {
      phase1Batches.push(available.slice(i, i + BATCH_SIZE))
    }

    const scorePhase1Batch = async (batch: any[]): Promise<any[]> => {
      const summaries = batch.map((c: any) => ({
        id: c.id,
        title: c.current_title || "Unknown",
        company: c.current_company || "Unknown",
        cv: (c.cv_text || c.notes || "").replace(/[^\x00-\x7F]/g, " ").slice(0, 1500),
      }))

      const prompt = `You are a recruitment consultant. Quickly score these candidates for the role below.

ROLE: ${mandate_title}
WHAT THE ROLE NEEDS: ${jdParsed.candidate_description}

CANDIDATES (read their CV content):
${JSON.stringify(summaries)}

Score each 0-100:
- 70-100: Strong functional match, right seniority level
- 40-69: Partial match or adjacent background  
- 15-39: Some relevance but significant gaps
- 0-14: Completely unrelated function

CRITICAL RULES:
- Read the CV content carefully, not just the job title
- A VP Engineering scores high for a CTO role
- A CFO at any sector scores high for a CFO role  
- Only score 0-14 if the candidate's entire function is unrelated (e.g. a sales person for a tech role)
- When in doubt, score higher not lower

Return ONLY a JSON array, no markdown:
[{"id":"<id>","score":<number>,"reason":"<10 words max>"}]`

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || "[]"
        return JSON.parse(text.replace(/```json|```/g, "").trim())
      } catch { return [] }
    }

    // Run ALL batches in parallel — much faster than sequential
    const phase1Results = await Promise.all(phase1Batches.map(scorePhase1Batch))
    const phase1Scores = phase1Results.flat()
    const phase1Sorted = phase1Scores.filter((m: any) => m.score >= 15).sort((a: any, b: any) => b.score - a.score)
    const top20ids = phase1Sorted.slice(0, 20).map((m: any) => m.id)

    // ── PHASE 2: Deep read full CV for top 20 + gap analysis ──────────────────
    const top20Candidates = available.filter((c: any) => top20ids.includes(c.id))
    const finalMatches: any[] = []

    for (const c of top20Candidates) {
      const phase1Score = phase1Sorted.find((m: any) => m.id === c.id)
      const fullCVText = (c.cv_text || "").slice(0, 8000)
      const structured = c.cv_structured

      // Gap analysis — use structured data if available, otherwise skip
      let gaps = { present: [] as string[], partial: [] as string[], missing_hard: [] as string[], missing_soft: [] as string[] }
      if (structured) {
        gaps = analyseGaps(structured, jdParsed.hard_requirements || {}, jdParsed.soft_preferences || {})
      }

      // Deep score with full CV
      let deepScore = phase1Score?.score || 50
      let deepReason = phase1Score?.reason || ""
      let tier = phase1Score?.tier || "possible"

      if (fullCVText.length > 200) {
        try {
          const deepPrompt = `You are a senior recruitment consultant doing a thorough final assessment.

ROLE: ${mandate_title}
REQUIREMENTS: ${job_description.slice(0, 2000)}

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
            body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, messages: [{ role: "user", content: deepPrompt }] }),
          })
          const data = await res.json()
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
        finalMatches.push({
          ...c,
          score: deepScore,
          tier,
          reason: deepReason,
          gaps,
          ai_strengths: c.ai_strengths || [],
          ai_concerns: c.ai_concerns || [],
          // Enrichment signals
          trajectory: structured?.career_trajectory || null,
          avg_tenure: structured?.avg_tenure_years || null,
          total_years: structured?.total_years_experience || null,
          seniority_level: structured?.seniority_level || null,
          certifications: structured ? toArray(structured.certifications) : [],
          all_skills: structured ? toArray(structured.all_skills).slice(0, 12) : toArray(c.tags),
        })
      }
    }

    // Include phase1 matches not in top 20 (possible matches without deep read)
    const remaining = phase1Sorted.slice(30).filter(m => m.score >= 10).map((m: any) => {
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
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
