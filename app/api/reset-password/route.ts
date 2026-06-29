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
  <h1 style="font-size:22px;font-weight:700;color:#0a1f24;margin:0 0 8px 0;">Reset your password</h1>
  <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 28px 0;">
    We received a request to reset your GPS Recruitment password.
    Click the button below to choose a new one. This link expires in 1 hour.
  </p>
  <a href="${resetLink}" style="display:block;background:#028090;color:white;text-align:center;padding:15px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">Reset password &rarr;</a>
  <p style="font-size:12px;color:#9ca3af;margin:18px 0 0;line-height:1.6;">
    If you didn't request a password reset, you can safely ignore this email. Your password won't change.
  </p>
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
