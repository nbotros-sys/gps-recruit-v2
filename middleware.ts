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
    "/(portal)",
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

  // Only enforce auth on internal pages and internal API routes
  if (!isPublic && (isInternalRoute || isInternalApi)) {
    const response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
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
        // API route — return 401 JSON
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
      }
      // Page route — redirect to login
      const loginUrl = new URL("/internal/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
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
