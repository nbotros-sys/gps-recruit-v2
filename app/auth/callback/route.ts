import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = (searchParams.get("type") || "invite") as any

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

  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      if (type === "recovery") return NextResponse.redirect(`${origin}/auth/update-password`)
      return NextResponse.redirect(`${origin}/auth/accept-invite`)
    }
    console.error("verifyOtp error for token_hash:", error?.message)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === "recovery") return NextResponse.redirect(`${origin}/auth/update-password`)
      return NextResponse.redirect(`${origin}/auth/accept-invite`)
    }
    console.error("exchangeCodeForSession error:", error?.message)
  }

  return NextResponse.redirect(`${origin}/internal/login?error=auth_failed`)
}
