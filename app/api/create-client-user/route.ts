import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { createServerSupabaseClient } from "@/lib/supabase-server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const FROM = process.env.FROM_EMAIL || "GPS Talent <onboarding@resend.dev>"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gps-recruit-v2.vercel.app"

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const _authClient = createServerSupabaseClient()
  const { data: { user: _authUser } } = await _authClient.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    const { email, full_name, phone, company_name, mandate_id, mandate_name, temp_password } = await req.json()
    if (!email || !full_name || !temp_password) {
      return NextResponse.json({ error: "email, full_name and temp_password are required" }, { status: 400 })
    }

    const supabase = getAdmin()
    const emailNorm = email.toLowerCase().trim()

    // 0. Check client_users table AND Supabase Auth for duplicate email
    const { data: existingClient } = await supabase
      .from("client_users")
      .select("id, full_name, company_name")
      .ilike("email", emailNorm)
      .maybeSingle()

    if (existingClient) {
      return NextResponse.json({
        error: "already been registered",
        existing_client: existingClient
      }, { status: 409 })
    }

    // Also check Auth directly — catches accounts created before email was stored in client_users
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authMatch = authUsers?.users?.find(u => u.email?.toLowerCase() === emailNorm)
    if (authMatch) {
      // Find the client_users row by auth_user_id
      const { data: clientByAuth } = await supabase
        .from("client_users")
        .select("id, full_name, company_name")
        .eq("auth_user_id", authMatch.id)
        .maybeSingle()
      return NextResponse.json({
        error: "already been registered",
        existing_client: clientByAuth || { id: null, full_name: "Existing client", company_name: "" }
      }, { status: 409 })
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: temp_password,
      email_confirm: true,
    })

    let authUserId: string
    if (authError) {
      if (authError.message?.includes("already been registered")) {
        const { data: existing } = await supabase.auth.admin.listUsers()
        const found = existing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
        if (!found) return NextResponse.json({ error: authError.message }, { status: 400 })
        authUserId = found.id
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    } else {
      authUserId = authData.user.id
    }

    // 2. Create client_users row (no mandate_id — linked by mandate_name free text)
    // Check if a row already exists for this email and update it, otherwise insert
    const { data: existing } = await supabase
      .from("client_users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()

    let cu, cuErr
    if (existing) {
      const res = await supabase
        .from("client_users")
        .update({
          auth_user_id: authUserId,
          full_name,
          company_name: company_name || null,
          mandate_id: mandate_id || null,
          mandate_name: mandate_name || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()
      cu = res.data; cuErr = res.error
    } else {
      const res = await supabase
        .from("client_users")
        .insert([{
          auth_user_id: authUserId,
          email: email.toLowerCase().trim(),
          full_name,
          company_name: company_name || null,
          mandate_id: mandate_id || null,
          mandate_name: mandate_name || null,
          is_active: true,
        }])
        .select()
        .single()
      cu = res.data; cuErr = res.error
    }

    if (cuErr) return NextResponse.json({ error: cuErr.message }, { status: 500 })

    // 3. Send welcome email
    try {
      await getResend().emails.send({
        from: FROM,
        to: email,
        subject: "Your GPS client portal access",
        html: buildWelcomeEmail(full_name, email, temp_password, BASE_URL),
      })
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr)
      // Non-blocking — account still created
    }

    return NextResponse.json({ success: true, client_user: cu })
  } catch (err: any) {
    console.error("create-client-user error:", err)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}

function buildWelcomeEmail(name: string, email: string, password: string, baseUrl: string): string {
  const firstName = name.split(" ")[0] || name
  const LOGO_URL = "https://recruit.gps4hr.com/gps-logo-full.png"
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f3;padding:48px 20px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
<tr><td align="center" style="padding-bottom:28px;">
  <img src="${LOGO_URL}" alt="GPS Recruitment" width="150" style="display:block;width:150px;height:auto;" />
</td></tr>
<tr><td style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e0e0e0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:#028090;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 44px 36px;">
  <h1 style="font-size:22px;font-weight:700;color:#0a1f24;margin:0 0 8px 0;">Hi ${firstName},</h1>
  <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 28px 0;">
    Your GPS client portal is ready. You can now view shortlisted candidates,
    leave feedback, and request interviews &mdash; all in one place.
  </p>

  <!-- Credentials box -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:28px;">
    <tr><td style="padding:18px 20px 8px;">
      <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Your login credentials</div>
    </td></tr>
    <tr><td style="padding:0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:9px 0;border-bottom:1px solid #f0f0f0;">Portal</td>
          <td align="right" style="font-size:12px;color:#028090;font-weight:500;padding:9px 0;border-bottom:1px solid #f0f0f0;">${baseUrl}/client/login</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:9px 0;border-bottom:1px solid #f0f0f0;">Email</td>
          <td align="right" style="font-size:13px;color:#0a1f24;font-weight:500;font-family:monospace;padding:9px 0;border-bottom:1px solid #f0f0f0;">${email}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:9px 0;">Password</td>
          <td align="right" style="font-size:13px;color:#0a1f24;font-weight:500;font-family:monospace;padding:9px 0;">${password}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:8px 20px 16px;">
      <p style="font-size:12px;color:#9ca3af;margin:4px 0 0;">Please change your password after your first login.</p>
    </td></tr>
  </table>

  <a href="${baseUrl}/client/login" style="display:block;background:#028090;color:white;text-align:center;padding:15px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">Access your portal &rarr;</a>
</td></tr>
<tr><td style="background:#f8fafa;border-top:1px solid #f0f0f0;padding:18px 44px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="font-size:11px;color:#9ca3af;">GPS Recruitment &middot; Your Trusted HR Partner</td>
  <td align="right" style="font-size:11px;color:#9ca3af;">Egypt &middot; MENA</td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
