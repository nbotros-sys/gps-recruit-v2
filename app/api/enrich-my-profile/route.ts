import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { buildProfileFromCV } from "@/lib/build-profile-core"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Candidate self-heal: the signed-in candidate re-reads their own CV on file to
// backfill empty profile fields. Verifies the caller against their own record
// only, then uses the service role to read + update reliably. Empty fields only —
// never overwrites something the candidate already filled in.
export async function POST() {
  const authClient = createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const supabase = getAdmin()
  const { data: cand } = await supabase
    .from("candidates").select("*").eq("email", user.email).maybeSingle()
  if (!cand) return NextResponse.json({ updated: false, message: "No profile" })
  if (!cand.cv_text?.trim()) return NextResponse.json({ updated: false, message: "No CV on file" })
  // Skip if the key fields are already present (avoid needless AI calls).
  if (cand.current_title && cand.current_company) return NextResponse.json({ updated: false })

  const profile = await buildProfileFromCV(cand.cv_text, cand.name || "profile")

  const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "")
  const upd: Record<string, any> = {}
  if (isEmpty(cand.current_title) && profile.current_title) upd.current_title = profile.current_title
  if (isEmpty(cand.current_company) && profile.current_company) upd.current_company = profile.current_company
  if (isEmpty(cand.location) && profile.location) upd.location = profile.location
  if (isEmpty(cand.dob) && profile.dob) upd.dob = profile.dob

  const existingTags: string[] = Array.isArray(cand.tags) ? cand.tags : []
  const mergedTags = Array.from(new Set([...existingTags, ...(profile.tags || [])])).filter(Boolean)
  if (mergedTags.length > existingTags.length) upd.tags = mergedTags

  if (isEmpty(cand.notes) && profile.summary) upd.notes = profile.summary

  if (Object.keys(upd).length === 0) return NextResponse.json({ updated: false })

  const { error: updErr } = await supabase.from("candidates").update(upd).eq("id", cand.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  return NextResponse.json({ updated: true, fields: Object.keys(upd) })
}
