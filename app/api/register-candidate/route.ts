import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { buildProfileFromCV } from "@/lib/build-profile-core"

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

// Public route: create (or find) a candidate record. If cv_text is provided, the
// CV is read server-side (title/company/summary/tags) — the AI reader is never
// exposed directly to anonymous callers.
// Returns { id, existing } — existing=true if the email was already registered.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const email = (body?.email || "").trim()
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const supabase = getAdmin()

  // Already registered? Return the existing record's id (skip the CV read).
  const { data: existing, error: findErr } = await supabase
    .from("candidates")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (existing) return NextResponse.json({ id: existing.id, existing: true })

  // Read the CV server-side (never throws — returns a minimal profile on failure).
  const cvText: string = body?.cv_text || ""
  const profile = await buildProfileFromCV(cvText, body?.filename)

  // Form values take precedence over parsed values where the user typed something.
  const jobFunction: string = (body?.job_function || "").trim()
  const level: string = (body?.level || "").trim()
  const formPhone: string = (body?.phone && body.phone.trim() !== "+20") ? body.phone.trim() : ""

  const name = (body?.name || "").trim() || profile.name || "Unknown"
  const tags = [...(profile.tags || []), jobFunction, level].filter(Boolean)
  const notes = [
    profile.summary,
    jobFunction ? `Function: ${jobFunction}` : "",
    level ? `Level: ${level}` : "",
  ].filter(Boolean).join(" | ")

  const row: Record<string, any> = {
    name,
    email,
    phone: formPhone || profile.phone || null,
    current_title: profile.current_title,
    current_company: profile.current_company,
    location: (body?.location || "").trim() || profile.location || null,
    dob: profile.dob || null,
    cv_text: cvText,
    tags,
    notes,
    source: body?.source || "direct",
  }

  const { data: created, error: insErr } = await supabase
    .from("candidates")
    .insert([row])
    .select("id")
    .single()
  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message || "Could not save profile" }, { status: 500 })
  }
  return NextResponse.json({ id: created.id, existing: false, is_cv: profile.is_cv })
}
