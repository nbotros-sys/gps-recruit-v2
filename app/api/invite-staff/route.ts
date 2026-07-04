import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"
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
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

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
  const body = `
    <h1 style="font-size:22px;font-weight:bold;color:#0a1f24;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;">
      You've been invited to join the GPS Recruitment internal platform.
      Click the button below to set up your account and get started.
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:4px 0 0;">
      <a href="${inviteLink}" style="display:inline-block;background-color:#028090;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:15px 40px;border:0;">Set up your account &#8594;</a>
    </td></tr>
    </table>
    <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
      This invitation expires in 24 hours. If you weren't expecting this, you can safely ignore this email.
    </p>
  `
  const LOGO = "https://recruit.gps4hr.com/gps-logo-full.png"
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>You've been invited</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f3;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f4f3;">
<tr><td align="center" style="padding:48px 20px;">
<table border="0" cellpadding="0" cellspacing="0" width="520">
<tr><td align="center" style="padding-bottom:24px;"><img src="${LOGO}" alt="GPS Recruitment" width="160" style="display:block;border:0;" /></td></tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="520" style="background-color:#ffffff;border:1px solid #e0e0e0;">
<tr><td height="4" style="background-color:#028090;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 44px 36px;">${body}</td></tr>
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
