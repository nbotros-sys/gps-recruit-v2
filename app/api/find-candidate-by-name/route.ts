import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

export async function GET(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, avatar_url")
    .order("name")
  return NextResponse.json({ candidates: candidates || [] })
}
