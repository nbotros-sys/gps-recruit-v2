import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"
const FROM = "GPS Recruitment <no-reply@gps4hr.com>"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const supabase = getAdmin()

  // Generate a recovery link
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: email.toLowerCase().trim(),
    options: {
      redirectTo: BASE_URL + "/auth/callback?type=recovery",
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error("generateLink error:", linkError?.message)
    return NextResponse.json({ error: "Could not generate reset link" }, { status: 500 })
  }

  // Extract token from action_link and build our own URL
  const actionUrl = new URL(linkData.properties.action_link)
  const tokenHash = actionUrl.searchParams.get("token")
  const resetLink = tokenHash
    ? `${BASE_URL}/auth/callback?token_hash=${tokenHash}&type=recovery`
    : linkData.properties.action_link

  // Send via Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Reset your GPS Recruitment password",
      html: buildResetEmail(resetLink),
    })
  } catch (e: any) {
    console.error("Resend error:", e?.message)
    return NextResponse.json({ error: "Could not send email" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function buildResetEmail(resetLink: string): string {
  const LOGO = "https://recruit.gps4hr.com/gps-logo-full.png"
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Reset your password</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f3;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f4f3;">
<tr><td align="center" style="padding:48px 20px;">
<table border="0" cellpadding="0" cellspacing="0" width="520">
<tr><td align="center" style="padding-bottom:24px;"><img src="${LOGO}" alt="GPS Recruitment" width="160" style="display:block;border:0;" /></td></tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="520" style="background-color:#ffffff;border:1px solid #e0e0e0;">
<tr><td height="4" style="background-color:#028090;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 44px 36px;">
  <h1 style="font-size:22px;font-weight:bold;color:#0a1f24;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;">Reset your password</h1>
  <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;">
    We received a request to reset your GPS Recruitment password.
    Click the button below to choose a new one. This link expires in 1 hour.
  </p>
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr><td align="center">
    <a href="${resetLink}" style="display:inline-block;background-color:#028090;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:15px 40px;border:0;">Reset password &#8594;</a>
  </td></tr>
  </table>
  <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
    If you didn't request a password reset, you can safely ignore this email. Your password won't change.
  </p>
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
