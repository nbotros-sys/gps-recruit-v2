import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Defense-in-depth staff guard for API routes. The middleware already gates
// /api/* by staff role, but sensitive routes must not rely on a single layer —
// if the middleware is ever misconfigured, these routes still protect themselves.
//
// Usage at the top of a route handler:
//   const gate = await requireStaff()
//   if (!gate.ok) return gate.response
//   // ...proceed; gate.user and gate.staffId are available
//
// Returns { ok: true, user, staffId } or { ok: false, response } with 401/403.

type StaffGate =
  | { ok: true; user: { id: string; email: string }; staffId: string }
  | { ok: false; response: NextResponse }

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function requireStaff(): Promise<StaffGate> {
  const authClient = createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || !user.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }),
    }
  }

  const { data: staff } = await admin()
    .from("staff_users")
    .select("id")
    .eq("email", user.email)
    .eq("is_active", true)
    .maybeSingle()

  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authorised as staff" }, { status: 403 }),
    }
  }

  return { ok: true, user: { id: user.id, email: user.email }, staffId: staff.id }
}
