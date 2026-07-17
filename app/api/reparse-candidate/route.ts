import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"
import { buildProfileFromCV } from "@/lib/build-profile-core"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Staff-only: re-read a candidate's stored CV and backfill any empty profile
// fields (title, company, location, dob, tags, summary). Used to retroactively
// enrich records that were created before CV parsing worked. Does not overwrite
// fields a human has already filled in.
export async function POST(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const { id } = await req.json().catch(() => ({} as any))
  if (!id) return NextResponse.json({ error: "Missing candidate id" }, { status: 400 })

  const supabase = getAdmin()
  const { data: cand, error: loadErr } = await supabase
    .from("candidates").select("*").eq("id", id).maybeSingle()
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
  if (!cand) return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
  if (!cand.cv_text?.trim()) return NextResponse.json({ error: "No CV on file to re-read" }, { status: 400 })

  const profile = await buildProfileFromCV(cand.cv_text, cand.name || "profile")

  // Only fill fields that are currently empty — never clobber human edits.
  const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "")
  const upd: Record<string, any> = {}
  if (isEmpty(cand.current_title) && profile.current_title) upd.current_title = profile.current_title
  if (isEmpty(cand.current_company) && profile.current_company) upd.current_company = profile.current_company
  if (isEmpty(cand.location) && profile.location) upd.location = profile.location
  if (isEmpty(cand.dob) && profile.dob) upd.dob = profile.dob

  // Merge tags (union), keeping any existing ones.
  const existingTags: string[] = Array.isArray(cand.tags) ? cand.tags : []
  const mergedTags = Array.from(new Set([...existingTags, ...(profile.tags || [])])).filter(Boolean)
  if (mergedTags.length > existingTags.length) upd.tags = mergedTags

  // Add the AI summary into notes only if there are no notes yet.
  if (isEmpty(cand.notes) && profile.summary) upd.notes = profile.summary

  if (Object.keys(upd).length === 0) {
    return NextResponse.json({ updated: false, message: "Nothing to backfill — profile already complete." })
  }

  const { error: updErr } = await supabase.from("candidates").update(upd).eq("id", id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ updated: true, fields: Object.keys(upd), values: upd })
}
