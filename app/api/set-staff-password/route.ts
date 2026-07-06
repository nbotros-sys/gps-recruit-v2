import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Find an auth user by email, paginating so members beyond the first page are still
// found (auth.users also holds candidates, so there can be many rows).
async function findAuthUserByEmail(admin: any, email: string) {
  const target = email.toLowerCase().trim()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const users = data?.users || []
    if (users.length === 0) break // ran out of pages
    const match = users.find((u: any) => (u.email || "").toLowerCase() === target)
    if (match) return match
  }
  return null
}

// Admin-only: set (or reset) another team member's password directly. Saved into
// Supabase Auth (the source of truth); the app reads it live on next login.
export async function POST(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const admin = getAdmin()

  // Must be an ADMIN, not just any staff member.
  const { data: me } = await admin
    .from("staff_users")
    .select("role")
    .eq("email", gate.user.email)
    .maybeSingle()
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can set another member's password." }, { status: 403 })
  }

  const { email, password } = await req.json().catch(() => ({} as any))
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const emailNorm = String(email).toLowerCase().trim()

  // Only allow this for actual team members.
  const { data: staffRow } = await admin
    .from("staff_users")
    .select("id")
    .ilike("email", emailNorm)
    .maybeSingle()
  if (!staffRow) {
    return NextResponse.json({ error: "That email is not a team member." }, { status: 404 })
  }

  const authUser = await findAuthUserByEmail(admin, emailNorm)
  if (!authUser) {
    return NextResponse.json({ error: "No login exists for that member yet — invite them first." }, { status: 404 })
  }

  const { error } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
