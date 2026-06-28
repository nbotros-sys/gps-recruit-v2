import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths — never require auth
  const PUBLIC_PREFIXES = [
    "/internal/login",
    "/auth/",
    "/api/generate-cv",
    "/api/generate-cv-pdf",
    "/api/extract-cv",
    "/api/extract-photo",
    "/api/send-email",
    "/api/upload-cv-file",
    "/api/upload-photo",
    "/api/extract-structured",
    "/api/generate-embedding",
    "/jobs",
    "/join",
    "/send-cv",
    "/how-it-works",
    "/login",
    "/cv-builder",
    "/_next",
    "/favicon",
    "/gps-logo",
  ]

  const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  const isInternalRoute = pathname.startsWith("/internal")
  const isInternalApi = pathname.startsWith("/api") && !isPublic

  if (!isPublic && (isInternalRoute || isInternalApi)) {
    const response = NextResponse.next()

    // Auth client — uses anon key to verify session cookie
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (isInternalApi) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
      }
      const loginUrl = new URL("/internal/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Staff check — use service role key client (edge-compatible via createServerClient)
    try {
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return [] },
            setAll() {},
          },
        }
      )

      const { data: staffUser } = await adminClient
        .from("staff_users")
        .select("id")
        .eq("email", user.email!)
        .eq("is_active", true)
        .maybeSingle()

      if (!staffUser) {
        if (isInternalApi) {
          return NextResponse.json({ error: "Not authorised as staff" }, { status: 403 })
        }
        const loginUrl = new URL("/internal/login", request.url)
        loginUrl.searchParams.set("error", "not_staff")
        return NextResponse.redirect(loginUrl)
      }
    } catch (err) {
      console.error("Staff check error:", err)
      if (isInternalApi) {
        return NextResponse.json({ error: "Auth check failed" }, { status: 500 })
      }
      const loginUrl = new URL("/internal/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/internal/:path*",
    "/api/:path*",
  ],
}
