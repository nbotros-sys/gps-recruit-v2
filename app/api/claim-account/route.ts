import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyClaimToken } from "@/lib/claim-token"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/claim-account?token=...  -> verify + return prefill details
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || ""
  const v = verifyClaimToken(token)
  if (!v) return NextResponse.json({ valid: false, reason: "invalid" })

  const admin = getAdmin()
  const { data: cand } = await admin
    .from("candidates").select("name, email, phone").eq("id", v.cid).maybeSingle()
  if (!cand) return NextResponse.json({ valid: false, reason: "notfound" })

  return NextResponse.json({
    valid: true,
    name: cand.name || "",
    email: cand.email || v.email,
    phone: cand.phone || "",
  })
}

// POST /api/claim-account  { token, password, name?, phone? } -> create the account
export async function POST(req: NextRequest) {
  const { token, password, name, phone } = await req.json()
  const v = verifyClaimToken(token)
  if (!v) return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 400 })
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const admin = getAdmin()

  // Email is already proven by the signed token, so mark it confirmed.
  const { error: cErr } = await admin.auth.admin.createUser({
    email: v.email,
    password,
    email_confirm: true,
  })
  if (cErr) {
    if (/registered|already/i.test(cErr.message)) {
      return NextResponse.json({ alreadyExists: true })
    }
    console.error("claim createUser error:", cErr.message)
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 })
  }

  // Apply any edits they made on the claim screen.
  const patch: Record<string, any> = {}
  if (name) patch.name = name
  if (phone) patch.phone = phone
  if (Object.keys(patch).length) {
    await admin.from("candidates").update(patch).eq("id", v.cid)
  }

  return NextResponse.json({ success: true, email: v.email })
}
