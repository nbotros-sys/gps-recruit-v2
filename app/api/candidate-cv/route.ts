import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

export async function GET(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const ids = req.nextUrl.searchParams.get("ids")
  if (!ids) return NextResponse.json({})

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
