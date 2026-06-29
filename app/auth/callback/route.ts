import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as any

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

  // PKCE code flow
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === "recovery") return NextResponse.redirect(`${origin}/auth/update-password`)
      // Invite flow — user needs to set their password
      if (type === "invite" || (!type && data.user?.email_confirmed_at === data.user?.created_at)) {
        return NextResponse.redirect(`${origin}/auth/accept-invite`)
      }
      return NextResponse.redirect(`${origin}/internal/dashboard`)
    }
  }

  // token_hash flow
  if (token_hash) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type || "magiclink",
    })
    if (!error) {
      if (type === "recovery") return NextResponse.redirect(`${origin}/auth/update-password`)
      if (type === "invite") return NextResponse.redirect(`${origin}/auth/accept-invite`)
      return NextResponse.redirect(`${origin}/internal/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/internal/login?error=auth_failed`)
}
