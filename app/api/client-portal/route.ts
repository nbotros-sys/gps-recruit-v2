import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sendStaffFeedbackAlert, sendStaffInterviewRequest, sendCandidateNotSelected } from "@/lib/emails"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

// GET — fetch portal data for the logged-in client
export async function GET(req: NextRequest) {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()

  // Staff preview — ?mandate=<id> lets an active staff member view a specific
  // mandate's portal exactly as that mandate's client sees it. Without the
  // param, behaviour is unchanged: the portal resolves from the logged-in
  // client account.
  const previewMandateId = req.nextUrl.searchParams.get("mandate")
  let clientUser: any = null
  let preview = false

  if (previewMandateId) {
    const { data: staff } = await admin
      .from("staff_users")
      .select("id")
      .eq("email", user.email)
      .eq("is_active", true)
      .maybeSingle()
    if (!staff) return NextResponse.json({ error: "Unauthorised" }, { status: 403 })

    const { data: previewClients } = await admin
      .from("client_users")
      .select("*")
      .eq("mandate_id", previewMandateId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
    clientUser = previewClients?.[0] || null
    if (!clientUser) return NextResponse.json({ error: "No active client is linked to this mandate" }, { status: 404 })
    preview = true
  } else {
    const { data: cu } = await admin
      .from("client_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
    clientUser = cu
  }

  if (!clientUser) return NextResponse.json({ error: "No client account found" }, { status: 403 })

  const mandateId = clientUser.mandate_id
  if (!mandateId) return NextResponse.json({ error: "No mandate linked" }, { status: 404 })

  // Get mandate
  const { data: mandate } = await admin
    .from("mandates")
    .select("id, title, client_name, location, status, job_description")
    .eq("id", mandateId)
    .maybeSingle()

  // Get shortlisted+ applications with candidate data
  const VISIBLE_STAGES = ["shortlisted", "interview", "offered", "placed"]
  const { data: applications } = await admin
    .from("applications")
    .select("id, stage, ai_score, ai_summary, ai_strengths, ai_concerns, candidate:candidates(id, name, current_title, current_company, email, phone, cv_pdf_url, cv_file_url, cv_file_type, location)")
    .eq("mandate_id", mandateId)
    .in("stage", VISIBLE_STAGES)
    .order("ai_score", { ascending: false, nullsFirst: false })

  // Get commentary
  const { data: commentary } = await admin
    .from("mandate_commentary")
    .select("id, commentary_text, pdf_url, created_at, email_sent")
    .eq("mandate_id", mandateId)
    .order("created_at", { ascending: false })

  // Get feedback this client has left
  const { data: feedback } = await admin
    .from("client_feedback")
    .select("id, application_id, feedback_text, sentiment, created_at")
    .eq("mandate_id", mandateId)
    .eq("client_user_id", clientUser.id)

  // Get interview requests
  const { data: interviews } = await admin
    .from("client_interview_requests")
    .select("id, application_id, preferred_dates, notes, status, confirmed_date, confirmed_time, format, interviewer, created_at, application:applications(candidate:candidates(name, current_title))")
    .eq("mandate_id", mandateId)
    .eq("client_user_id", clientUser.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({
    preview,
    clientUser,
    mandate,
    applications: applications || [],
    commentary: commentary || [],
    feedback: feedback || [],
    interviews: interviews || [],
  })
}

// POST — submit feedback or interview request
export async function POST(req: NextRequest) {
  try {
    const sc = createServerSupabaseClient()
    const { data: { user } } = await sc.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

    const admin = getAdmin()
    const body = await req.json()
    const { action, application_id, mandate_id, client_user_id } = body

    if (action === "feedback") {
      const { rating, comment } = body
      const sentiment = !rating ? "neutral"
        : /strong yes|^yes$/i.test(rating) ? "positive"
        : /^no$/i.test(rating) ? "negative"
        : "neutral"
      const feedback_text = rating ? `${rating}: ${comment}` : comment
      const { error } = await admin.from("client_feedback").insert([{
        mandate_id, application_id, client_user_id, feedback_text, sentiment
      }])
      if (error) {
        console.error("client_feedback insert error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Best-effort notification — never lets a failure here undo the save above
      notifyBestEffort(admin, async () => {
        const candidateName = await getCandidateName(admin, application_id)
        const mandateTitle = await getMandateTitle(admin, mandate_id)
        await admin.from("notifications").insert([{
          type: "client_feedback",
          title: "Client feedback received",
          message: `Feedback on ${candidateName} — ${mandateTitle}`,
          link: `/internal/clients?client=${client_user_id}&tab=feedback`,
        }])
        await sendStaffFeedbackAlert({
          candidateName, mandateTitle, sentiment, feedbackText: feedback_text,
          link: `/internal/clients?client=${client_user_id}&tab=feedback`,
        })
      })

      return NextResponse.json({ success: true })
    }

    if (action === "interview_request") {
      const { preferred_dates, notes } = body

      // One editable request per application: reuse the active one if it exists.
      const { data: existing } = await admin
        .from("client_interview_requests")
        .select("id")
        .eq("application_id", application_id)
        .in("status", ["new", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const isEdit = !!existing?.id
      let requestId: string | null = existing?.id || null

      if (isEdit) {
        const { error } = await admin.from("client_interview_requests")
          .update({ preferred_dates, notes, updated_at: new Date().toISOString() })
          .eq("id", requestId)
        if (error) {
          console.error("client_interview_requests update error:", error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      } else {
        const { data: inserted, error } = await admin.from("client_interview_requests").insert([{
          mandate_id, application_id, client_user_id, preferred_dates, notes, status: "new"
        }]).select("id").single()
        if (error) {
          console.error("client_interview_requests insert error:", error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        requestId = inserted?.id || null
      }

      // Best-effort notification + task — never lets a failure here undo the save above
      notifyBestEffort(admin, async () => {
        const candidateName = await getCandidateName(admin, application_id)
        const mandateTitle = await getMandateTitle(admin, mandate_id)
        const link = `/internal/clients?client=${client_user_id}&tab=interviews`
        const taskDesc = preferred_dates ? `Client preferred times: ${preferred_dates}` : null

        await admin.from("notifications").insert([{
          type: "interview_requested",
          title: isEdit ? "Interview times updated" : "Interview requested",
          message: `${candidateName} — ${mandateTitle}`,
          link,
        }])

        // Linked task: update the one tied to this request, else create it.
        if (isEdit && requestId) {
          const { data: updated } = await admin.from("tasks")
            .update({ description: taskDesc, done: false })
            .eq("interview_request_id", requestId)
            .select("id")
          if (!updated || updated.length === 0) {
            await admin.from("tasks").insert([{
              title: `Schedule interview: ${candidateName}`,
              description: taskDesc, link, link_label: mandateTitle,
              auto_generated: true, interview_request_id: requestId,
            }])
          }
        } else if (requestId) {
          await admin.from("tasks").insert([{
            title: `Schedule interview: ${candidateName}`,
            description: taskDesc, link, link_label: mandateTitle,
            auto_generated: true, interview_request_id: requestId,
          }])
        }

        await sendStaffInterviewRequest({
          candidateName, mandateTitle, preferredDates: preferred_dates, notes, link,
        })
      })

      return NextResponse.json({ success: true, edited: isEdit })
    }

    if (action === "reject") {
      const { error } = await admin.from("applications").update({ stage: "rejected" }).eq("id", application_id)
      if (error) {
        console.error("application reject error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      notifyBestEffort(admin, async () => {
        const candidateName = await getCandidateName(admin, application_id)
        const mandateTitle = await getMandateTitle(admin, mandate_id)
        // Notify the candidate they weren't selected
        const { data: appRow } = await admin.from("applications").select("candidate_id").eq("id", application_id).maybeSingle()
        if (appRow?.candidate_id) {
          const { data: cand } = await admin.from("candidates").select("email").eq("id", appRow.candidate_id).maybeSingle()
          if (cand?.email) {
            try { await sendCandidateNotSelected({ candidateName, candidateEmail: cand.email, roleTitle: mandateTitle }) } catch (e) { console.error("reject candidate email failed:", e) }
          }
        }
        await admin.from("notifications").insert([{
          type: "client_rejected",
          title: "Client rejected candidate",
          message: `${candidateName} — ${mandateTitle}`,
          link: `/internal/mandates/${mandate_id}`,
        }])
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    console.error("client-portal POST error:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}

async function getCandidateName(admin: ReturnType<typeof getAdmin>, applicationId: string) {
  try {
    const { data } = await admin
      .from("applications")
      .select("candidate:candidates(name)")
      .eq("id", applicationId)
      .maybeSingle()
    return (data as any)?.candidate?.name || "A candidate"
  } catch {
    return "A candidate"
  }
}

async function getMandateTitle(admin: ReturnType<typeof getAdmin>, mandateId: string) {
  try {
    const { data } = await admin.from("mandates").select("title").eq("id", mandateId).maybeSingle()
    return (data as any)?.title || "a mandate"
  } catch {
    return "a mandate"
  }
}

// Fires the given async function without ever letting it reject the caller —
// notification/task creation is a nice-to-have, never a reason to fail the request.
function notifyBestEffort(admin: ReturnType<typeof getAdmin>, fn: () => Promise<void>) {
  fn().catch(err => console.error("client-portal notification side-effect failed:", err))
}
