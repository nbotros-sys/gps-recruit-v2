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

async function assertStaff() {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  if (!user) return null
  return user
}

export async function GET() {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const supabase = getAdmin()
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60)
  return NextResponse.json({ notifications: data || [] })
}

export async function POST(req: NextRequest) {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const body = await req.json()
  const { type, title, message, link } = body
  if (!type || !title || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  const supabase = getAdmin()
  const { data, error } = await supabase.from("notifications").insert([{ type, title, message, link }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notification: data })
}

export async function PATCH(req: NextRequest) {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const { id, read_all } = await req.json()
  const supabase = getAdmin()
  if (read_all) {
    await supabase.from("notifications").update({ read: true }).eq("read", false)
  } else if (id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id)
  }
  return NextResponse.json({ success: true })
}
