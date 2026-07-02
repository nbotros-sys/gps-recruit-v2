import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  // Auth guard — only a signed-in staff user may delete a mandate.
  // Middleware is primary; this is belt-and-braces so the route can never
  // run destructive deletes for an unauthenticated caller.
  const authClient = createServerSupabaseClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const staffCheck = await getAdmin()
    .from("staff_users")
    .select("id")
    .eq("email", authUser.email)
    .eq("is_active", true)
    .maybeSingle()
  if (!staffCheck.data) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { mandate_id } = await req.json()
    if (!mandate_id) {
      return NextResponse.json({ error: "mandate_id is required" }, { status: 400 })
    }

    const admin = getAdmin()

    // Cascade cleanup of all child rows, then the mandate itself.
    // Each child delete is checked; a hard error on any of them aborts before
    // the mandate row is removed, so we never orphan-then-lose the parent.
    const children = [
      "applications",
      "talent_pool_scans",
      "mandate_commentary",
      "client_interview_requests",
      "client_feedback",
      "client_users",
    ] as const

    const failures: { table: string; message: string }[] = []
    for (const table of children) {
      const { error } = await admin.from(table).delete().eq("mandate_id", mandate_id)
      if (error) failures.push({ table, message: error.message })
    }

    if (failures.length > 0) {
      // Report which child deletes failed and do NOT delete the parent,
      // so the mandate can be retried rather than left with orphaned children.
      return NextResponse.json(
        { error: "Child cleanup failed", failures },
        { status: 500 }
      )
    }

    const { error: mandateError } = await admin.from("mandates").delete().eq("id", mandate_id)
    if (mandateError) {
      return NextResponse.json({ error: mandateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 })
  }
}
