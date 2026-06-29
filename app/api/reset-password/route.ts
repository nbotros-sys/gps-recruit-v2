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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0;">
<tr><td style="background:#0a1f24;padding:28px 36px;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="background:#028090;border-radius:8px;width:34px;height:34px;text-align:center;vertical-align:middle;"><span style="color:white;font-size:10px;font-weight:700;">GPS</span></td>
<td style="padding-left:10px;"><div style="color:white;font-size:14px;font-weight:700;">GPS Recruitment</div><div style="color:rgba(168,213,209,0.6);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">Internal Platform</div></td>
</tr></table></td></tr>
<tr><td style="padding:32px 36px;">
<h1 style="font-size:20px;font-weight:700;color:#0a1f24;margin:0 0 8px;">Reset your password</h1>
<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">Click the button below to set a new password for your GPS Recruitment account. This link expires in 1 hour.</p>
<a href="${resetLink}" style="display:block;background:#028090;color:white;text-align:center;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Reset password</a>
<p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 36px 24px;text-align:center;border-top:1px solid #f0f0f0;">
<p style="font-size:11px;color:#9ca3af;margin:0;">GPS Recruitment · Your Trusted HR Partner</p>
</td></tr>
</table></td></tr></table>
</body></html>`
}
