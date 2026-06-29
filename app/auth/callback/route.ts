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

  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type || "invite",
    })
    if (!error) {
      const dest = type === "recovery" ? "/auth/update-password" : "/auth/accept-invite"
      // Use an HTML redirect so the browser sends the session cookies on the next request
      return new NextResponse(
        `<!DOCTYPE html><html><head>
          <meta charset="utf-8">
          <script>window.location.href = "${origin}${dest}";</script>
        </head><body></body></html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      )
    }
    console.error("verifyOtp error:", error?.message)
    return NextResponse.redirect(`${origin}/internal/login?error=invite_expired`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const dest = type === "recovery" ? "/auth/update-password" : "/auth/accept-invite"
      return new NextResponse(
        `<!DOCTYPE html><html><head>
          <meta charset="utf-8">
          <script>window.location.href = "${origin}${dest}";</script>
        </head><body></body></html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      )
    }
    console.error("exchangeCode error:", error?.message)
    return NextResponse.redirect(`${origin}/internal/login?error=invite_expired`)
  }

  return NextResponse.redirect(`${origin}/internal/login?error=auth_failed`)
}
