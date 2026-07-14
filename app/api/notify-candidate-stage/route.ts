import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sendCandidateShortlisted, sendCandidateNotSelected, sendCandidatePlaced } from "@/lib/emails"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST { application_id, stage } — staff only. Emails the candidate the right
// lifecycle message when their application enters shortlisted / rejected / placed.
export async function POST(req: NextRequest) {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()
  const { data: staff } = await admin
    .from("staff_users").select("id").eq("email", user.email).eq("is_active", true).maybeSingle()
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { application_id, stage } = await req.json()
  if (!application_id || !stage) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  if (!["shortlisted", "rejected", "placed"].includes(stage)) {
    return NextResponse.json({ success: true, skipped: true })
  }

  const { data: app } = await admin
    .from("applications").select("candidate_id, mandate_id").eq("id", application_id).maybeSingle()
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const { data: cand } = await admin
    .from("candidates").select("name, email").eq("id", app.candidate_id).maybeSingle()
  if (!cand?.email) return NextResponse.json({ success: true, skipped: "no candidate email" })

  const { data: mandate } = await admin.from("mandates").select("title").eq("id", app.mandate_id).maybeSingle()
  const roleTitle = mandate?.title || "the role"
  const candidateName = cand.name || "Candidate"

  try {
    if (stage === "shortlisted") await sendCandidateShortlisted({ candidateName, candidateEmail: cand.email, roleTitle })
    else if (stage === "rejected") await sendCandidateNotSelected({ candidateName, candidateEmail: cand.email, roleTitle })
    else if (stage === "placed") await sendCandidatePlaced({ candidateName, candidateEmail: cand.email, roleTitle })
  } catch (e) {
    console.error("notify-candidate-stage email failed:", e)
    return NextResponse.json({ error: "Email failed" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
