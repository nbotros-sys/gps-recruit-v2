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

async function getUser() {
  const sc = createServerSupabaseClient()
  const { data: { user } } = await sc.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const supabase = getAdmin()
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  return NextResponse.json({ tasks: data || [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const body = await req.json()
  const { title, description, assigned_to, due_date, link, link_label, auto_generated } = body
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })
  const supabase = getAdmin()
  const { data, error } = await supabase
    .from("tasks")
    .insert([{ title, description, assigned_to, due_date, link, link_label, auto_generated: auto_generated || false }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const body = await req.json()
  const { id, done, done_by_email, done_by_name } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const supabase = getAdmin()
  const update: any = { done }
  if (done) {
    update.done_by_email = done_by_email
    update.done_by_name = done_by_name
    update.done_at = new Date().toISOString()
  } else {
    update.done_by_email = null
    update.done_by_name = null
    update.done_at = null
  }
  const { error } = await supabase.from("tasks").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const supabase = getAdmin()
  await supabase.from("tasks").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
