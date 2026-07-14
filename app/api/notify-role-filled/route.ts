import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sendClientRoleFilled } from "@/lib/emails"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

// POST { mandate_id } — staff only. Emails the mandate's client(s) that the role is filled.
export async function POST(req: NextRequest) {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const admin = getAdmin()
  const { data: staff } = await admin
    .from("staff_users").select("id").eq("email", user.email).eq("is_active", true).maybeSingle()
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { mandate_id } = await req.json()
  if (!mandate_id) return NextResponse.json({ error: "Missing mandate_id" }, { status: 400 })

  const { data: mandate } = await admin.from("mandates").select("title").eq("id", mandate_id).maybeSingle()
  const roleTitle = mandate?.title || "your role"
  const { data: clients } = await admin
    .from("client_users").select("email, full_name").eq("mandate_id", mandate_id).eq("is_active", true)

  const portalUrl = `${BASE_URL}/client/portal`
  let sent = 0
  for (const c of clients || []) {
    if (!c.email) continue
    try { await sendClientRoleFilled({ clientName: c.full_name, clientEmail: c.email, roleTitle, portalUrl }); sent++ }
    catch (e) { console.error("notify-role-filled email failed:", e) }
  }
  return NextResponse.json({ success: true, sent })
}
