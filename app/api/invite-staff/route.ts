import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Resend } from "resend"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const FROM = process.env.FROM_EMAIL || "GPS Recruitment <no-reply@gps4hr.com>"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

export async function POST(req: NextRequest) {
  // Auth guard
  const serverSupabase = createServerSupabaseClient()
  const { data: { user: _authUser } } = await serverSupabase.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    const { email, full_name } = await req.json()
    if (!email || !full_name) {
      return NextResponse.json({ error: "email and full_name are required" }, { status: 400 })
    }

    const supabase = getAdmin()
    const emailNorm = email.toLowerCase().trim()

    // Check if already a staff member
    const { data: existing } = await supabase
      .from("staff_users")
      .select("id, full_name")
      .ilike("email", emailNorm)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "This email is already a team member" }, { status: 409 })
    }

    // Create Supabase Auth user and send invite email (Supabase handles the password set link)
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(emailNorm, {
      redirectTo: `${BASE_URL}/auth/callback`,
      data: { full_name },
    })

    if (authError) {
      // If user already exists in Auth, still add to staff_users
      if (!authError.message?.includes("already been registered")) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    // Add to staff_users table
    const { error: staffError } = await supabase
      .from("staff_users")
      .insert([{ email: emailNorm, full_name, role: "recruiter", is_active: true }])

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    // Send GPS-branded invite email
    try {
      await getResend().emails.send({
        from: FROM,
        to: emailNorm,
        subject: "You've been invited to GPS Recruitment Platform",
        html: buildInviteEmail(full_name, BASE_URL),
      })
    } catch (emailErr) {
      console.error("Invite email failed:", emailErr)
      // Non-blocking — account still created
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("invite-staff error:", err)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Auth guard
  const serverSupabase = createServerSupabaseClient()
  const { data: { user: _authUser } } = await serverSupabase.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const supabase = getAdmin()
  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: true })

  return NextResponse.json({ staff: staff || [] })
}

export async function DELETE(req: NextRequest) {
  // Auth guard
  const serverSupabase = createServerSupabaseClient()
  const { data: { user: _authUser } } = await serverSupabase.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getAdmin()
  await supabase.from("staff_users").update({ is_active: false }).eq("id", id)

  return NextResponse.json({ success: true })
}

function buildInviteEmail(name: string, baseUrl: string) {
  const firstName = name.split(" ")[0] || name
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0;">
      <tr><td style="background:#0a1f24;padding:28px 36px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#028090;border-radius:8px;width:34px;height:34px;text-align:center;vertical-align:middle;"><span style="color:white;font-size:10px;font-weight:700;">GPS</span></td>
          <td style="padding-left:10px;"><div style="color:white;font-size:14px;font-weight:700;">GPS Recruitment</div><div style="color:rgba(168,213,209,0.6);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">Internal Platform</div></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <h1 style="font-size:20px;font-weight:700;color:#0a1f24;margin:0 0 8px;">Hi ${firstName},</h1>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">You've been invited to join the GPS Recruitment internal platform. Click the button below to set your password and get started.</p>
        <a href="${baseUrl}/internal/login" style="display:block;background:#028090;color:white;text-align:center;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Accept invitation →</a>
        <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">You'll receive a separate email from Supabase with your password setup link.</p>
      </td></tr>
      <tr><td style="padding:16px 36px 24px;text-align:center;border-top:1px solid #f0f0f0;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">GPS — Your Trusted HR Partner · Egypt</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
