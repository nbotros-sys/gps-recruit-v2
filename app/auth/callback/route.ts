import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = (searchParams.get("type") || "invite") as any

  const cookieStore = cookies()
  const cookiesToSet: { name: string; value: string; options?: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(incoming: { name: string; value: string; options?: any }[]) {
          // Collect cookies to set on both the store and the redirect response
          incoming.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch {}
            cookiesToSet.push({ name, value, options })
          })
        },
      },
    }
  )

  const dest = type === "recovery" ? "/auth/update-password" : "/auth/accept-invite"

  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      const response = NextResponse.redirect(`${origin}${dest}`)
      // Manually copy session cookies onto the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options || {})
      })
      return response
    }
    console.error("verifyOtp error:", error?.message)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${dest}`)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options || {})
      })
      return response
    }
    console.error("exchangeCode error:", error?.message)
  }

  return NextResponse.redirect(`${origin}/internal/login?error=auth_failed`)
}
