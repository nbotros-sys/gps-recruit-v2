import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sendClientNewCandidate } from "@/lib/emails"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

// POST { application_id } — staff only. Emails the mandate's client(s) that a
// new candidate has been shortlisted and is ready to review.
export async function POST(req: NextRequest) {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()
  const { data: staff } = await admin
    .from("staff_users").select("id").eq("email", user.email).eq("is_active", true).maybeSingle()
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { application_id } = await req.json()
  if (!application_id) return NextResponse.json({ error: "Missing application_id" }, { status: 400 })

  const { data: app } = await admin
    .from("applications").select("mandate_id").eq("id", application_id).maybeSingle()
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const { data: mandate } = await admin
    .from("mandates").select("title").eq("id", app.mandate_id).maybeSingle()
  const { data: clients } = await admin
    .from("client_users").select("email, full_name").eq("mandate_id", app.mandate_id).eq("is_active", true)

  const roleTitle = mandate?.title || "your role"
  const portalUrl = `${BASE_URL}/client/portal`

  let sent = 0
  for (const c of clients || []) {
    if (!c.email) continue
    try {
      await sendClientNewCandidate({ clientName: c.full_name, clientEmail: c.email, roleTitle, portalUrl })
      sent++
    } catch (e) { console.error("notify-client-submission email failed:", e) }
  }
  return NextResponse.json({ success: true, sent })
}
