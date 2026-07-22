import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { buildProfileFromCV } from "@/lib/build-profile-core"
import { scoreCV } from "@/lib/score-cv-core"

// Service-role (master key) client — bypasses RLS so an anonymous applicant's
// candidate + application rows actually save (a browser insert is blocked by RLS).
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Public route: submit a job application. Reads + scores the CV server-side,
// creates/updates the candidate, and records the application — all with proper
// permissions, so the AI endpoints are never exposed to anonymous callers.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const mandateId = body?.mandate_id
  const cvFilePath = body?.cv_file_path
  const email = (body?.email || "").trim()
  const cvText: string = body?.cv_text || ""
  if (!mandateId || !email || !cvText.trim()) {
    return NextResponse.json({ error: "Missing role, email, or CV" }, { status: 400 })
  }

  const supabase = getAdmin()

  // Score the CV against the role (never throws).
  const score = await scoreCV(cvText, body?.job_description || "", body?.mandate_title)

  // Find or create the candidate.
  const { data: existing } = await supabase
    .from("candidates").select("*").eq("email", email).maybeSingle()

  let candidateId: string
  let cand: any = existing

  if (existing) {
    candidateId = existing.id
    // Refresh their profile only if they uploaded a new CV during this application.
    if (body?.cv_is_new && cvText) {
      const profile = await buildProfileFromCV(cvText, body?.filename)
      const upd = {
        cv_text: cvText,
        tags: (profile.tags && profile.tags.length ? profile.tags : existing.tags) || [],
        notes: profile.summary || existing.notes || "",
        current_title: profile.current_title || existing.current_title,
        current_company: profile.current_company || existing.current_company,
      }
      await supabase.from("candidates").update(upd).eq("id", candidateId)
      cand = { ...existing, ...upd }
    }
  } else {
    const profile = await buildProfileFromCV(cvText, body?.filename)
    const row = {
      name: (body?.name || "").trim() || profile.name || "Unknown",
      email,
      phone: (body?.phone || "").trim() || profile.phone || null,
      current_title: profile.current_title,
      current_company: profile.current_company,
      location: profile.location,
      dob: profile.dob || null,
      cv_text: cvText,
      tags: profile.tags,
      source: "portal",
      notes: profile.summary || "",
    }
    const { data: created, error: insErr } = await supabase
      .from("candidates").insert([row]).select("*").single()
    if (insErr || !created) {
      return NextResponse.json({ error: insErr?.message || "Could not save profile" }, { status: 500 })
    }
    candidateId = created.id
    cand = created
  }

  // Save the original CV file under the candidate folder (for recruiter and client download).
  if (cvFilePath && candidateId) {
    try {
      const safe = String(body?.filename || "cv").replace(/[^a-zA-Z0-9._-]/g, "_")
      const dest = candidateId + "/" + Date.now() + "-" + safe
      const mv = await supabase.storage.from("cv-files").move(cvFilePath, dest)
      if (!mv.error) await supabase.from("candidates").update({ cv_file_url: dest }).eq("id", candidateId)
    } catch {}
  }


  // Index the candidate for semantic + structured search the moment they apply
  // (only when they're new or uploaded a fresh CV), so no online applicant falls
  // through the cracks waiting for a manual re-index.
  if ((!existing || body?.cv_is_new) && cvText && cvText.trim()) {
    const secret = process.env.INTERNAL_API_SECRET || ""
    const hdr = { "Content-Type": "application/json", "x-internal-secret": secret }
    const idxText = cvText.slice(0, 8000)
    try {
      await fetch(new URL("/api/generate-embedding", req.url).toString(),
        { method: "POST", headers: hdr, body: JSON.stringify({ candidateId, text: idxText }) })
    } catch {}
    try {
      await fetch(new URL("/api/extract-structured", req.url).toString(),
        { method: "POST", headers: hdr, body: JSON.stringify({ candidateId, cv_text: idxText }) })
    } catch {}
  }

  // Record the application once.
  const { data: existingApp } = await supabase
    .from("applications").select("id")
    .eq("candidate_id", candidateId).eq("mandate_id", mandateId).maybeSingle()

  const alreadyApplied = !!existingApp
  if (!existingApp) {
    const { error: appErr } = await supabase.from("applications").insert([{
      candidate_id: candidateId,
      mandate_id: mandateId,
      stage: "new",
      ai_score: score.score,
      ai_summary: score.summary,
      ai_strengths: score.strengths,
      ai_concerns: score.concerns,
    }])
    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })
  }

  // Notification emails — never block the application if email fails.
  const candName = (body?.name || "").trim() || cand?.name || "Candidate"
  try {
    const emailUrl = new URL("/api/send-email", req.url).toString()
    await fetch(emailUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "application_confirmation",
        candidateName: candName,
        candidateEmail: email,
        roleTitle: body?.mandate_title,
        clientName: body?.client_name,
        location: body?.mandate_location,
        candidateId,
        hasAccount: !!body?.has_account,
      }),
    })
    await fetch(emailUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "internal_alert",
        candidateName: candName,
        candidateEmail: email,
        candidatePhone: (body?.phone || "").trim() || cand?.phone,
        candidateTitle: cand?.current_title,
        candidateCompany: cand?.current_company,
        candidateLocation: cand?.location || body?.mandate_location,
        aiScore: score.score,
        roleTitle: body?.mandate_title,
        clientName: body?.client_name,
      }),
    })
  } catch (e) { console.error("apply email error:", e) }

  return NextResponse.json({ candidateId, alreadyApplied, score: score.score })
}
