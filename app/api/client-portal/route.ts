import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — fetch portal data for the logged-in client
export async function GET(req: NextRequest) {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()

  // Get client user record
  const { data: clientUser } = await admin
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

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
    .select("id, stage, ai_score, candidate:candidates(id, name, current_title, current_company, email, phone, cv_pdf_url, cv_file_url, cv_file_type, location)")
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
    .select("id, application_id, rating, comment, created_at")
    .eq("mandate_id", mandateId)
    .eq("client_user_id", clientUser.id)

  // Get interview requests
  const { data: interviews } = await admin
    .from("client_interview_requests")
    .select("id, application_id, preferred_dates, notes, status, created_at, application:applications(candidate:candidates(name, current_title))")
    .eq("mandate_id", mandateId)
    .eq("client_user_id", clientUser.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({
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
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()
  const body = await req.json()
  const { action, application_id, mandate_id, client_user_id } = body

  if (action === "feedback") {
    const { rating, comment } = body
    const { error } = await admin.from("client_feedback").insert([{
      mandate_id, application_id, client_user_id, rating, comment
    }])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "interview_request") {
    const { preferred_dates, notes } = body
    const { error } = await admin.from("client_interview_requests").insert([{
      mandate_id, application_id, client_user_id, preferred_dates, notes, status: "pending"
    }])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
