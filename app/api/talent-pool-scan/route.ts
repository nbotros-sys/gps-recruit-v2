import { recordUsage } from "@/lib/ai-usage"
import { createNotification } from "@/lib/activity"
import { sendSystemErrorAlert } from "@/lib/emails"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

// Allow up to 5 minutes for the scan to complete
export const maxDuration = 300

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return [val]
  return []
}

async function parseJD(mandate_title: string, job_description: string) {
  const prompt = `Read this job description and extract two things:\n\n1. A 150-word paragraph describing the ideal candidate — what they would actually DO day-to-day, their real responsibilities, scope, team sizes, industries, alternative titles they might hold. Write as a candidate description, not a job spec.\n\n2. A structured list of requirements split into HARD (mandatory, non-negotiable) and SOFT (preferred, advantageous).\n\nJOB TITLE: ${mandate_title}\nJOB DESCRIPTION: ${job_description.slice(0, 3000)}\n\nReturn ONLY valid JSON (no markdown):\n{\n  "candidate_description": "<150 word paragraph>",\n  "hard_requirements": {\n    "certifications": ["<cert required>"],\n    "education": ["<degree required>"],\n    "languages": ["<language required>"],\n    "min_years_experience": <number or null>,\n    "industries": ["<sector required>"],\n    "skills": ["<must-have skill>"],\n    "other": ["<any other hard requirement>"]\n  },\n  "soft_preferences": {\n    "certifications": ["<cert preferred>"],\n    "education": ["<degree preferred>"],\n    "languages": ["<language preferred>"],\n    "industries": ["<sector preferred>"],\n    "skills": ["<nice-to-have skill>"],\n    "other": ["<any other preference>"]\n  }\n}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
    })
    const data = await res.json()
    await recordUsage("anthropic", "claude-haiku-4-5-20251001", "talent-pool-scan", data?.usage)
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

  function check(items: string[], pool: string[], _label: string, isSoft = false) {
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

async function runScan(scanId: string, mandateId: string, jobDescription: string, mandateTitle: string, lastScanAt: string | null) {
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  // Reads run server-side inside a staff-gated route (POST enforces requireStaff),
  // so use the service-role client. The anon client returns nothing under RLS.
  const supabase = adminSupabase

  async function updateProgress(msg: string) {
    await adminSupabase.from("talent_pool_scans").update({ progress_message: msg }).eq("id", scanId)
  }

  try {
    await updateProgress("Parsing job description...")

    const { data: existing } = await supabase.from("applications").select("candidate_id").eq("mandate_id", mandateId)
    const existingIds = (existing || []).map((a: any) => a.candidate_id)

    const jdParsed = await parseJD(mandateTitle, jobDescription)
    const searchText = `${mandateTitle}\n${jdParsed.candidate_description}`

    await updateProgress("Running vector search across candidate database...")

    // Vector search
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
          match_threshold: 0.0,
          match_count: 60,
        })
        if (vecResults?.length) {
          vectorIds = vecResults.filter((r: any) => !existingIds.includes(r.candidate_id)).map((r: any) => r.candidate_id)
        }
      }
    } catch (err) { console.error("Vector error:", err) }

    // Fetch candidates
    let available: any[] = []
    if (vectorIds.length) {
      let vectorQuery = supabase.from("candidates")
        .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes, created_at")
        .in("id", vectorIds)
      if (existingIds.length) vectorQuery = vectorQuery.not("id", "in", `(${existingIds.join(",")})`)
      const { data: vectorCands } = await vectorQuery

      const allKnownIds = [...vectorIds, ...existingIds]
      let recentQuery = supabase.from("candidates")
        .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(20)
      if (allKnownIds.length) recentQuery = recentQuery.not("id", "in", `(${allKnownIds.join(",")})`)
      const { data: recentNoEmbed } = await recentQuery

      const vectorRanked = vectorIds
        .map((id: string) => (vectorCands || []).find((c: any) => c.id === id))
        .filter(Boolean)
      available = [...vectorRanked, ...(recentNoEmbed || [])]
    } else {
      let fallbackQuery = supabase.from("candidates")
        .select("id, name, current_title, current_company, location, tags, avatar_url, cv_structured, cv_text, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
      if (existingIds.length) fallbackQuery = fallbackQuery.not("id", "in", `(${existingIds.join(",")})`)
      const { data: fallback } = await fallbackQuery
      available = fallback || []
    }

    // If incremental rescan, filter to only new candidates
    if (lastScanAt) {
      const newCandidates = available.filter((c: any) => c.created_at > lastScanAt)
      if (newCandidates.length > 0) {
        available = newCandidates
        await updateProgress(`Scanning ${newCandidates.length} new candidates since last scan...`)
      } else {
        // No new candidates — return cached result
        await adminSupabase.from("talent_pool_scans")
          .update({ status: "no_new_candidates", progress_message: "No new candidates since last scan" })
          .eq("id", scanId)
        return { status: "no_new_candidates" }
      }
    } else {
      await updateProgress(`Scoring ${available.length} candidates — Phase 1...`)
    }

    if (!available.length) {
      const emptyResult = { total_available: 0, strong_matches: [], possible_matches: [], summary: "No candidates available yet." }
      await adminSupabase.from("talent_pool_scans").update({
        status: "complete",
        progress_message: "No candidates to scan",
        result: emptyResult,
        scanned_at: new Date().toISOString(),
      }).eq("id", scanId)
      return { status: "complete", result: emptyResult }
    }

    // PHASE 1: Parallel batches
    const BATCH_SIZE = 10
    const batches: any[][] = []
    for (let i = 0; i < available.length; i += BATCH_SIZE) {
      batches.push(available.slice(i, i + BATCH_SIZE))
    }

    await updateProgress(`Phase 1: scoring ${available.length} candidates across ${batches.length} parallel batches...`)

    const batchResults = await Promise.all(batches.map(async (batch) => {
      const summaries = batch.map((c: any) => {
        const s = c.cv_structured
        const cvFull = (c.cv_text || c.notes || "").slice(0, 3000)
        return {
          id: c.id,
          title: c.current_title,
          company: c.current_company,
          summary: s?.summary_paragraph || cvFull,
          skills: s ? toArray(s.all_skills).slice(0, 20) : toArray(c.tags),
          seniority: s?.seniority_level,
          years: s?.total_years_experience,
          certifications: s ? toArray(s.certifications) : [],
          industries: s ? toArray(s.industries) : [],
          trajectory: s?.career_trajectory,
          all_experience: s?.work_experience || null,
        }
      })

      const prompt = `You are a senior recruitment consultant. Score candidates for this role.\n\nROLE: ${mandateTitle}\nWHAT WE NEED: ${jdParsed.candidate_description}\n\nCANDIDATES:\n${JSON.stringify(summaries)}\n\nScore each 0-100 combining:\n- SUITABILITY (0-50): Does their actual work experience match what this role needs? Read what they DO, ignore title differences.\n- SENIORITY (0-50): Is their level right? Too junior or overqualified both score lower.\n\nScore generously. Read what each candidate actually DOES, not just their title.\n- A Group CEO or CEO of any company scores 70+ for a CEO role\n- A CFO at any company scores 70+ for a CFO role\n- A VP Engineering or Head of Engineering scores 70+ for a CTO role\n- A VP Sales at any company scores 70+ for a VP Sales role\n- Only score below 15 if the candidate's entire career is completely unrelated\n- When in doubt score 25-40, never score 0\n\nReturn ONLY JSON array:\n[{ "id": "<id>", "score": <0-100>, "tier": "strong" | "possible", "reason": "<one sentence on suitability + seniority>" }]`

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
        })
        const data = await res.json()
        await recordUsage("anthropic", "claude-sonnet-4-6", "talent-pool-scan", data?.usage)
        const text = data.content?.[0]?.text || "[]"
        return JSON.parse(text.replace(/```json|```/g, "").trim())
      } catch { return [] }
    }))

    const phase1Scores = batchResults.flat()
    const phase1Sorted = phase1Scores.filter((m: any) => m.score >= 10).sort((a: any, b: any) => b.score - a.score)
    const top15ids = phase1Sorted.slice(0, 15).map((m: any) => m.id)

    await updateProgress(`Phase 2: deep reading top ${top15ids.length} candidates...`)

    // PHASE 2: Deep read top candidates in parallel
    const top15Candidates = available.filter((c: any) => top15ids.includes(c.id))

    const deepReadResults = await Promise.all(top15Candidates.map(async (c: any) => {
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
          const deepPrompt = `You are a senior recruitment consultant doing a thorough final assessment.\n\nROLE: ${mandateTitle}\nREQUIREMENTS: ${jobDescription.slice(0, 1500)}\n\nCANDIDATE FULL CV:\n${fullCVText}\n\nGive a final score 0-100 (suitability 0-50 + seniority 0-50), a specific 1-sentence reason, and 2-3 strengths and 1-2 areas to probe — all specific to THIS role, not generic.\nBe generous — score 25+ for any candidate with adjacent or partial relevance.\n\nReturn ONLY JSON:\n{\n  "score": <0-100>,\n  "tier": "strong" | "possible",\n  "reason": "<specific 1-sentence reason referencing CV content>",\n  "strengths": ["<strength specific to this role>", "<strength 2>", "<strength 3>"],\n  "concerns": ["<area to probe specific to this role>", "<area 2>"]\n}`

          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: deepPrompt }] }),
          })
          const data = await res.json()
          await recordUsage("anthropic", "claude-sonnet-4-6", "talent-pool-scan", data?.usage)
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

    const remaining = phase1Sorted.slice(15).filter((m: any) => m.score >= 10).map((m: any) => {
      const c = available.find((c: any) => c.id === m.id)
      return c ? { ...c, score: m.score, tier: "possible", reason: m.reason, gaps: null } : null
    }).filter(Boolean)

    const allMatches = [...finalMatches, ...remaining].sort((a: any, b: any) => b.score - a.score)
    const strong_matches = allMatches.filter((m: any) => m.tier === "strong" || m.score >= 70)
    const possible_matches = allMatches.filter((m: any) => m.tier !== "strong" && m.score < 70)

    await updateProgress("Generating summary...")

    let summary = ""
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 120,
          messages: [{ role: "user", content: `Summarise in 2 sentences for a recruiter: Role "${mandateTitle}", ${available.length} candidates reviewed, ${strong_matches.length} strong matches, ${possible_matches.length} possible. Top candidates: ${strong_matches.slice(0,3).map((m:any)=>m.name).join(", ")}. Be direct about the talent availability.` }]
        })
      })
      const data = await res.json()
      await recordUsage("anthropic", "claude-sonnet-4-6", "talent-pool-scan", data?.usage)
      summary = data.content?.[0]?.text?.trim() || ""
    } catch {}

    const result = {
      total_available: available.length,
      summary: summary || `Found ${strong_matches.length} strong and ${possible_matches.length} possible matches from ${available.length} candidates.`,
      strong_matches,
      possible_matches,
      deeper_search_available: true,
      jd_requirements: jdParsed,
    }

    await adminSupabase.from("talent_pool_scans").update({
      status: "complete",
      progress_message: `Complete — ${strong_matches.length} strong, ${possible_matches.length} possible matches`,
      result,
      scanned_at: new Date().toISOString(),
    }).eq("id", scanId)
    // Fire notification
    try {
      await createNotification({
        type: "scan_complete",
        title: "Talent pool scan complete",
        message: `${strong_matches.length} strong match${strong_matches.length !== 1 ? "es" : ""}, ${possible_matches.length} possible — scan finished`,
      })
    } catch {}

    return { status: "complete", result }

  } catch (err) {
    console.error("Scan error:", err)
    await adminSupabase.from("talent_pool_scans").update({
      status: "error",
      progress_message: "Scan failed — please try again",
    }).eq("id", scanId)
    return { status: "error" }
  }
}

// POST /api/talent-pool-scan — run scan synchronously, return result directly
export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  try {
    const { mandate_id, job_description, mandate_title, incremental } = await req.json()
    if (!job_description || !mandate_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get last scan timestamp for incremental mode
    let lastScanAt: string | null = null
    if (incremental) {
      const { data: lastScan } = await adminSupabase
        .from("talent_pool_scans")
        .select("scanned_at")
        .eq("mandate_id", mandate_id)
        .eq("status", "complete")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      lastScanAt = lastScan?.scanned_at || null
    }

    // Create scan record
    const { data: scan, error } = await adminSupabase
      .from("talent_pool_scans")
      .insert([{
        mandate_id,
        status: "pending",
        progress_message: "Starting scan...",
      }])
      .select("id")
      .single()

    if (error || !scan) return NextResponse.json({ error: "Failed to create scan" }, { status: 500 })

    // Run scan synchronously — Vercel will keep the function alive for up to maxDuration seconds
    const scanResult = await runScan(scan.id, mandate_id, job_description, mandate_title, lastScanAt)

    // Return the result directly — no polling needed
    if (scanResult?.status === "complete" && scanResult.result) {
      return NextResponse.json({
        scan_id: scan.id,
        status: "complete",
        result: scanResult.result,
        scanned_at: new Date().toISOString(),
      })
    }

    if (scanResult?.status === "no_new_candidates") {
      // Return the last completed scan result
      const { data: lastComplete } = await adminSupabase
        .from("talent_pool_scans")
        .select("result, scanned_at")
        .eq("mandate_id", mandate_id)
        .eq("status", "complete")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      return NextResponse.json({
        scan_id: scan.id,
        status: "no_new_candidates",
        result: lastComplete?.result || null,
        scanned_at: lastComplete?.scanned_at || null,
      })
    }

    return NextResponse.json({ scan_id: scan.id, status: "error", error: "Scan failed" }, { status: 500 })

  } catch (err) {
    console.error("POST scan error:", err)
    try {
      await sendSystemErrorAlert({
        context: "Talent pool scan",
        message: "A talent-pool scan failed to complete.",
        detail: (err as any)?.message || String(err),
      })
    } catch {}
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

// GET /api/talent-pool-scan?mandate_id=xxx — get latest scan status/result
export async function GET(req: NextRequest) {
  // Auth guard — scan results are staff-only (belt-and-braces; middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const mandate_id = req.nextUrl.searchParams.get("mandate_id")
  if (!mandate_id) return NextResponse.json({ error: "Missing mandate_id" }, { status: 400 })

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: scan } = await adminSupabase
    .from("talent_pool_scans")
    .select("id, status, progress_message, result, scanned_at")
    .eq("mandate_id", mandate_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(scan || { status: "none" })
}
