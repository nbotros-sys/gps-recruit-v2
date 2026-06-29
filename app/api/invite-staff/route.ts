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

const FROM = process.env.FROM_EMAIL || "GPS Recruitment <no-reply@gps4hr.com>"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

export async function POST(req: NextRequest) {
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
      .select("id")
      .ilike("email", emailNorm)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "This email is already a team member" }, { status: 409 })
    }

    // Try to invite via Supabase Auth
    // Generate the invite link ourselves so we control where it goes
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email: emailNorm,
      options: {
        redirectTo: BASE_URL + "/auth/callback?type=invite",
        data: { full_name },
      },
    })

    if (linkError) {
      const msg = linkError.message || JSON.stringify(linkError)
      const isExisting = msg.includes("already") || msg.includes("registered") || msg.includes("exists")
      if (isExisting) {
        // Already exists — generate a recovery link instead
        const { data: alreadyStaff } = await supabase.from("staff_users").select("id").ilike("email", emailNorm).maybeSingle()
        if (!alreadyStaff) {
          await supabase.from("staff_users").insert([{ email: emailNorm, full_name, role: "recruiter", is_active: true }])
        }
        try {
          const { data: recoveryData } = await supabase.auth.admin.generateLink({
            type: "recovery",
            email: emailNorm,
            options: { redirectTo: BASE_URL + "/auth/accept-invite" }
          })
          const recoveryLink = recoveryData?.properties?.action_link
          if (recoveryLink) {
            const resend = new Resend(process.env.RESEND_API_KEY!)
            await resend.emails.send({
              from: FROM,
              to: emailNorm,
              subject: "Set your password — GPS Recruitment Platform",
              html: buildInviteEmail(full_name, recoveryLink),
            })
          }
        } catch (e: any) {
          console.error("Recovery email failed:", e?.message)
        }
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Extract token_hash from the action_link and build our own callback URL
    // action_link = https://xxx.supabase.co/auth/v1/verify?token=HASH&type=invite&redirect_to=...
    const actionLink = linkData?.properties?.action_link
    if (!actionLink) {
      return NextResponse.json({ error: "Could not generate invite link" }, { status: 500 })
    }
    const actionUrl = new URL(actionLink)
    const extractedToken = actionUrl.searchParams.get("token")
    const extractedType = actionUrl.searchParams.get("type") || "invite"
    // Build our own link that goes directly to our callback with token_hash
    const inviteLink = extractedToken
      ? `${BASE_URL}/auth/callback?token_hash=${extractedToken}&type=${extractedType}`
      : actionLink

    // Add to staff_users table
    const { error: staffError } = await supabase
      .from("staff_users")
      .insert([{ email: emailNorm, full_name, role: "recruiter", is_active: true }])

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    // Send GPS-branded invite email with the real invite link
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from: FROM,
        to: emailNorm,
        subject: "You've been invited to GPS Recruitment Platform",
        html: buildInviteEmail(full_name, inviteLink),
      })
    } catch (emailErr: any) {
      console.error("Invite email failed:", emailErr?.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("invite-staff error:", err)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
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
  const serverSupabase = createServerSupabaseClient()
  const { data: { user: _authUser } } = await serverSupabase.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getAdmin()

  // Get their email so we can delete from Supabase Auth too
  const { data: staffMember } = await supabase
    .from("staff_users")
    .select("email")
    .eq("id", id)
    .maybeSingle()

  // Delete from staff_users table
  await supabase.from("staff_users").delete().eq("id", id)

  // Delete from Supabase Auth (hard delete)
  if (staffMember?.email) {
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const authUser = authUsers?.users?.find((u: any) => u.email === staffMember.email)
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id)
      }
    } catch (e: any) {
      console.error("Auth user delete error:", e?.message)
      // Non-blocking — staff_users row is already gone
    }
  }

  return NextResponse.json({ success: true })
}

function buildInviteEmail(name: string, inviteLink: string): string {
  const firstName = name.split(" ")[0] || name
  const LOGO_URL = "https://recruit.gps4hr.com/gps-logo-full.png"
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#0a1f24;margin:0 0 8px 0;">Hi ${firstName},</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 28px 0;">
      You've been invited to join the GPS Recruitment internal platform.
      Click the button below to set up your account and get started.
    </p>
    <a href="${inviteLink}" style="display:block;background:#028090;color:white;text-align:center;padding:15px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">Set up your account &rarr;</a>
    <p style="font-size:12px;color:#9ca3af;margin:18px 0 0;line-height:1.6;">
      This invitation expires in 24 hours. If you weren't expecting this, you can safely ignore this email.
    </p>
  `
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
<tr><td style="padding:40px 44px 36px;">${body}</td></tr>
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
