import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Uses service role to create auth user + client_users row
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, full_name, company_name, mandate_id, temp_password } = await req.json()

    if (!email || !full_name || !mandate_id || !temp_password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Create Supabase Auth user (email + password)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: temp_password,
      email_confirm: true,  // skip email verification — we handle onboarding manually
    })

    if (authError) {
      // If user already exists in auth, try to find them
      if (authError.message?.includes("already been registered")) {
        const { data: existing } = await supabase.auth.admin.listUsers()
        const existingUser = existing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
        if (!existingUser) return NextResponse.json({ error: authError.message }, { status: 400 })

        // Upsert client_users row
        const { data: cu, error: cuErr } = await supabase
          .from("client_users")
          .upsert([{
            auth_user_id: existingUser.id,
            mandate_id,
            email: email.toLowerCase().trim(),
            full_name,
            company_name: company_name || null,
            is_active: true,
          }], { onConflict: "email" })
          .select()
          .single()

        if (cuErr) return NextResponse.json({ error: cuErr.message }, { status: 500 })
        return NextResponse.json({ success: true, client_user: cu, note: "User already existed — linked to mandate" })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Create client_users row
    const { data: cu, error: cuErr } = await supabase
      .from("client_users")
      .insert([{
        auth_user_id: authData.user.id,
        mandate_id,
        email: email.toLowerCase().trim(),
        full_name,
        company_name: company_name || null,
        is_active: true,
      }])
      .select()
      .single()

    if (cuErr) return NextResponse.json({ error: cuErr.message }, { status: 500 })

    return NextResponse.json({ success: true, client_user: cu })
  } catch (err: any) {
    console.error("create-client-user error:", err)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}
