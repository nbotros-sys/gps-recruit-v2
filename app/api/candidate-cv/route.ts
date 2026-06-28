import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const _authClient = createServerSupabaseClient()
  const { data: { user: _authUser } } = await _authClient.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const ids = req.nextUrl.searchParams.get("ids")
  if (!ids) return NextResponse.json({})

  const supabase = createClient()
  const idList = ids.split(",").filter(Boolean)

  const { data } = await supabase
    .from("candidates")
    .select("id, cv_text")
    .in("id", idList)

  const result: Record<string, string | null> = {}
  for (const row of data || []) {
    result[row.id] = row.cv_text || null
  }

  return NextResponse.json(result)
}
