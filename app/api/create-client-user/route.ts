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
  const LOGO = "https://recruit.gps4hr.com/gps-logo-full.png"
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Your GPS client portal</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f3;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f4f3;">
<tr><td align="center" style="padding:48px 20px;">
<table border="0" cellpadding="0" cellspacing="0" width="520">
<tr><td align="center" style="padding-bottom:24px;"><img src="${LOGO}" alt="GPS Recruitment" width="160" style="display:block;border:0;" /></td></tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="520" style="background-color:#ffffff;border:1px solid #e0e0e0;">
<tr><td height="4" style="background-color:#028090;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 44px 36px;">
  <h1 style="font-size:22px;font-weight:bold;color:#0a1f24;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</h1>
  <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;">
    Your GPS client portal is ready. You can now view shortlisted candidates, leave feedback, and request interviews.
  </p>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e5e7eb;margin-bottom:28px;">
  <tr><td style="padding:16px 20px 0;">
    <p style="font-size:11px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;font-family:Arial,sans-serif;">Your login credentials</p>
  </td></tr>
  <tr><td style="padding:0 20px;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #f0f0f0;">
    <tr>
      <td style="font-size:12px;color:#9ca3af;padding:9px 0;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">Portal</td>
      <td align="right" style="font-size:12px;color:#028090;font-weight:bold;padding:9px 0;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">${baseUrl}/client/login</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#9ca3af;padding:9px 0;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">Email</td>
      <td align="right" style="font-size:13px;color:#0a1f24;font-weight:bold;padding:9px 0;border-bottom:1px solid #f0f0f0;font-family:monospace;">${email}</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#9ca3af;padding:9px 0;font-family:Arial,sans-serif;">Password</td>
      <td align="right" style="font-size:13px;color:#0a1f24;font-weight:bold;padding:9px 0;font-family:monospace;">${password}</td>
    </tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 20px 14px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;font-family:Arial,sans-serif;">Please change your password after your first login.</p>
  </td></tr>
  </table>
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr><td align="center">
    <a href="${baseUrl}/client/login" style="display:inline-block;background-color:#028090;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:15px 40px;border:0;">Access your portal &#8594;</a>
  </td></tr>
  </table>
</td></tr>
<tr><td style="background-color:#f8fafa;border-top:1px solid #f0f0f0;padding:18px 44px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">GPS Recruitment &middot; Your Trusted HR Partner</td>
<td align="right" style="font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">Egypt &middot; MENA</td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
