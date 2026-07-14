import { emailLayout, brandFrom, para } from "@/lib/email-layout"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

const FROM = brandFrom("gps")
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  try {
    const { email, full_name, phone, company_name, mandate_id, mandate_name, temp_password, confidential } = await req.json()
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
          confidential: confidential || false,
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
          confidential: confidential || false,
          is_active: true,
        }])
        .select()
        .single()
      cu = res.data; cuErr = res.error
    }

    if (cuErr) return NextResponse.json({ error: cuErr.message }, { status: 500 })

    // 3. Send welcome email
    try {
      const { error: sendError } = await getResend().emails.send({
        from: FROM,
        to: email,
        subject: "Your GPS client portal access",
        html: buildWelcomeEmail(full_name, email, temp_password, BASE_URL),
      })
      if (sendError) throw new Error((sendError as any)?.message || "Email send failed")
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
  const cred = `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5faf9;border:1px solid #d0e8e4;margin:0 0 22px 0;"><tr><td style="padding:16px 20px;">
    <div style="font-size:11px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px 0;font-family:Arial,sans-serif;">Your login credentials</div>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="font-size:13px;color:#888;padding:4px 0;font-family:Arial,sans-serif;">Portal</td><td align="right" style="font-size:13px;color:#028090;font-weight:bold;padding:4px 0;font-family:Arial,sans-serif;">${baseUrl}/client/login</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0;font-family:Arial,sans-serif;">Email</td><td align="right" style="font-size:13px;color:#0a1f24;font-weight:bold;padding:4px 0;font-family:'Courier New',monospace;">${email}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0;font-family:Arial,sans-serif;">Password</td><td align="right" style="font-size:13px;color:#0a1f24;font-weight:bold;padding:4px 0;font-family:'Courier New',monospace;">${password}</td></tr>
    </table>
  </td></tr></table>`
  const body = para("Your GPS client portal is ready. You can now view shortlisted candidates, leave feedback, and request interviews.")
    + cred
    + `<p style="font-size:12px;color:#9ca3af;margin:0 0 4px 0;font-family:Arial,sans-serif;">Please change your password after your first login.</p>`
  return emailLayout({
    brand: "gps",
    preheader: "Your GPS client portal is ready",
    badge: "Portal access",
    heading: `Hi ${firstName},`,
    bodyHtml: body,
    ctaLabel: "Access your portal",
    ctaUrl: `${baseUrl}/client/login`,
  })
}
