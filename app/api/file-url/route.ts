import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Returns a short-lived signed URL for a private storage object, but ONLY after
// verifying the caller is allowed to see it. Buckets are private; nothing is
// publicly downloadable. Authorised viewers:
//   - active staff (see everything)
//   - the owning candidate (their own files; paths are `${candidateId}/...`)
//   - a client whose mandate includes that candidate (shortlisted+)
// The first path segment is always the candidate id (see upload routes).

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ALLOWED_BUCKETS = new Set(["avatars", "cv-files", "cv-pdfs"])
const SIGNED_URL_TTL = 600 // 10 minutes

export async function POST(req: NextRequest) {
  const authClient = createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  let bucket: string, path: string
  try {
    const body = await req.json()
    bucket = String(body.bucket || "")
    path = String(body.path || "")
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  if (!ALLOWED_BUCKETS.has(bucket) || !path || path.includes("..")) {
    return NextResponse.json({ error: "Invalid file reference" }, { status: 400 })
  }

  const db = admin()

  // The candidate id is the first segment of the object path.
  const candidateId = path.split("/")[0]
  if (!candidateId) {
    return NextResponse.json({ error: "Invalid file reference" }, { status: 400 })
  }

  // 1) Staff — full access.
  const staff = await db
    .from("staff_users")
    .select("id")
    .eq("email", user.email)
    .eq("is_active", true)
    .maybeSingle()

  let authorised = !!staff.data

  // 2) The owning candidate (matched by email → candidate id).
  if (!authorised) {
    const ownCand = await db
      .from("candidates")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()
    if (ownCand.data && ownCand.data.id === candidateId) authorised = true
  }

  // 3) A client whose mandate includes this candidate (shortlisted+ stage).
  if (!authorised) {
    const clientUser = await db
      .from("client_users")
      .select("mandate_id")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
    if (clientUser.data?.mandate_id) {
      const app = await db
        .from("applications")
        .select("id")
        .eq("mandate_id", clientUser.data.mandate_id)
        .eq("candidate_id", candidateId)
        .limit(1)
        .maybeSingle()
      if (app.data) authorised = true
    }
  }

  if (!authorised) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not sign file" }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL })
}
