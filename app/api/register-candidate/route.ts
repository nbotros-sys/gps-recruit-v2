import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

// Service-role (master key) client. Bypasses RLS so the insert + read-back is
// not cancelled by the candidate SELECT policy (an anonymous visitor cannot read
// candidate rows, which was silently rejecting the whole insert when the browser
// did it during self-registration / job application).
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Columns a public caller is allowed to set on a new candidate.
const ALLOWED = [
  "name", "email", "phone", "current_title", "current_company",
  "location", "dob", "cv_text", "tags", "source", "notes", "avatar_url",
]

// Public route: create (or find) a candidate record.
// Returns { id, existing } — existing=true if the email was already registered.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const email = (body?.email || "").trim()
  const name = (body?.name || "").trim()
  if (!email || !name) {
    return NextResponse.json({ error: "Missing name or email" }, { status: 400 })
  }

  const supabase = getAdmin()

  // Already registered? Return the existing record's id.
  const { data: existing, error: findErr } = await supabase
    .from("candidates")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (existing) return NextResponse.json({ id: existing.id, existing: true })

  // Whitelist columns before insert.
  const row: Record<string, any> = {}
  for (const k of ALLOWED) {
    if (body?.[k] !== undefined) row[k] = body[k]
  }
  row.email = email
  row.name = name
  if (!row.source) row.source = "direct"

  const { data: created, error: insErr } = await supabase
    .from("candidates")
    .insert([row])
    .select("id")
    .single()
  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message || "Could not save profile" }, { status: 500 })
  }
  return NextResponse.json({ id: created.id, existing: false })
}
