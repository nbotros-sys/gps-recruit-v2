import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sendCandidateInterviewInvite, sendClientInterviewConfirmed } from "@/lib/emails"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

// POST { interview_request_id } — staff only. Emails the candidate an invitation
// and the client a confirmation once interview details are confirmed.
export async function POST(req: NextRequest) {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()
  const { data: staff } = await admin
    .from("staff_users").select("id").eq("email", user.email).eq("is_active", true).maybeSingle()
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { interview_request_id } = await req.json()
  if (!interview_request_id) return NextResponse.json({ error: "Missing interview_request_id" }, { status: 400 })

  const { data: ir } = await admin
    .from("client_interview_requests")
    .select("confirmed_date, confirmed_time, format, interviewer, location, application_id, mandate_id, client_user_id")
    .eq("id", interview_request_id).maybeSingle()
  if (!ir) return NextResponse.json({ error: "Interview request not found" }, { status: 404 })

  // Candidate
  let candidateName = "Candidate", candidateEmail = ""
  if (ir.application_id) {
    const { data: app } = await admin.from("applications").select("candidate_id").eq("id", ir.application_id).maybeSingle()
    if (app?.candidate_id) {
      const { data: cand } = await admin.from("candidates").select("name, email").eq("id", app.candidate_id).maybeSingle()
      if (cand) { candidateName = cand.name || candidateName; candidateEmail = cand.email || "" }
    }
  }

  // Mandate + client
  const { data: mandate } = await admin.from("mandates").select("title").eq("id", ir.mandate_id).maybeSingle()
  const roleTitle = mandate?.title || "the role"
  let clientName = "", clientEmail = ""
  if (ir.client_user_id) {
    const { data: cu } = await admin.from("client_users").select("email, full_name").eq("id", ir.client_user_id).maybeSingle()
    if (cu) { clientName = cu.full_name || ""; clientEmail = cu.email || "" }
  }

  const dateStr = ir.confirmed_date
    ? new Date(ir.confirmed_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : ""
  const portalUrl = `${BASE_URL}/client/portal`

  let sent = 0
  if (candidateEmail) {
    try {
      await sendCandidateInterviewInvite({
        candidateName, candidateEmail, roleTitle, dateStr,
        time: ir.confirmed_time, format: ir.format, location: ir.location, interviewer: ir.interviewer,
      })
      sent++
    } catch (e) { console.error("candidate interview invite failed:", e) }
  }
  if (clientEmail) {
    try {
      await sendClientInterviewConfirmed({
        clientName, clientEmail, candidateName, roleTitle, dateStr,
        time: ir.confirmed_time, format: ir.format, location: ir.location, interviewer: ir.interviewer, portalUrl,
      })
      sent++
    } catch (e) { console.error("client interview confirmed failed:", e) }
  }

  return NextResponse.json({ success: true, sent })
}
