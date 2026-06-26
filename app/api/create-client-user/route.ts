import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

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
  try {
    const { email, full_name, company_name, mandate_name, temp_password } = await req.json()
    if (!email || !full_name || !temp_password) {
      return NextResponse.json({ error: "email, full_name and temp_password are required" }, { status: 400 })
    }

    const supabase = getAdmin()

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

    // 2. Create client_users row (no mandate_id yet — linked by mandate_name free text)
    const { data: cu, error: cuErr } = await supabase
      .from("client_users")
      .upsert([{
        auth_user_id: authUserId,
        email: email.toLowerCase().trim(),
        full_name,
        company_name: company_name || null,
        mandate_name: mandate_name || null,
        is_active: true,
      }], { onConflict: "email" })
      .select()
      .single()

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

function buildWelcomeEmail(name: string, email: string, password: string, baseUrl: string) {
  const firstName = name.split(" ")[0] || name
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0;">
        <tr><td style="background:#0a1f24;padding:28px 36px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#028090;border-radius:8px;width:34px;height:34px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:10px;font-weight:700;">GPS</span>
              </td>
              <td style="padding-left:10px;">
                <div style="color:white;font-size:14px;font-weight:700;">GPS Recruitment</div>
                <div style="color:rgba(168,213,209,0.6);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">Client Portal</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <h1 style="font-size:20px;font-weight:700;color:#0a1f24;margin:0 0 8px;">Hi ${firstName},</h1>
          <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">Your GPS client portal is ready. You can now view your shortlisted candidates, leave feedback, and request interviews.</p>
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Your login credentials</div>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Login URL</td><td style="font-size:13px;color:#028090;font-weight:600;text-align:right;padding:4px 0;">${baseUrl}/client/login</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Email</td><td style="font-size:13px;color:#0a1f24;font-weight:600;text-align:right;padding:4px 0;">${email}</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;padding:4px 0;">Password</td><td style="font-size:13px;color:#0a1f24;font-weight:600;text-align:right;padding:4px 0;font-family:monospace;">${password}</td></tr>
            </table>
          </div>
          <a href="${baseUrl}/client/login" style="display:block;background:#028090;color:white;text-align:center;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Sign in to your portal →</a>
        </td></tr>
        <tr><td style="padding:16px 36px 24px;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">GPS — Your Trusted HR Partner · Egypt<br>Questions? Reply to this email or contact your GPS consultant.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
