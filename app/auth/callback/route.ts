import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as any
  const next = searchParams.get("next")

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  // token_hash flow — Supabase invite emails use this
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type || "invite",
    })
    if (!error) {
      if (type === "recovery") return NextResponse.redirect(`${origin}/auth/update-password`)
      // invite or magiclink — go to accept-invite to set password
      return NextResponse.redirect(`${origin}/auth/accept-invite`)
    }
  }

  // PKCE code flow
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === "recovery") return NextResponse.redirect(`${origin}/auth/update-password`)
      if (type === "invite") return NextResponse.redirect(`${origin}/auth/accept-invite`)
      // Check if user has never set a password (fresh invite via PKCE)
      const user = data.user
      const hasSetPassword = user?.user_metadata?.password_set === true
      if (!hasSetPassword && user?.created_at) {
        const created = new Date(user.created_at).getTime()
        const now = Date.now()
        // If account created within last 7 days and no password set, treat as invite
        if (now - created < 7 * 24 * 60 * 60 * 1000) {
          return NextResponse.redirect(`${origin}/auth/accept-invite`)
        }
      }
      return NextResponse.redirect(`${origin}/internal/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/internal/login?error=auth_failed`)
}
