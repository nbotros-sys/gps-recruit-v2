import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getUser() {
  const gate = await requireStaff()
  return gate.ok ? gate.user : null
}

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const taskId = req.nextUrl.searchParams.get("task_id")
  if (!taskId) return NextResponse.json({ error: "Missing task_id" }, { status: 400 })
  const supabase = getAdmin()
  const { data, error } = await supabase
    .from("task_notes")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data || [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const body = await req.json()
  const { task_id, note_text, author_email, author_name } = body
  if (!task_id || !note_text?.trim()) {
    return NextResponse.json({ error: "task_id and note_text are required" }, { status: 400 })
  }
  const supabase = getAdmin()
  const { data, error } = await supabase
    .from("task_notes")
    .insert([{ task_id, note_text: note_text.trim(), author_email, author_name }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
