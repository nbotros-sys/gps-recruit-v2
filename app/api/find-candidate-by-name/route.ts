import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const _authClient = createServerSupabaseClient()
  const { data: { user: _authUser } } = await _authClient.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const supabase = createClient()
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, avatar_url")
    .order("name")
  return NextResponse.json({ candidates: candidates || [] })
}
