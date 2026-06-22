import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — always allowed
  const publicRoutes = [
    "/auth/login",
    "/auth/signup", 
    "/auth/callback",
    "/portal",         // candidate portal
    "/_next",
    "/favicon.ico",
    "/gps-logo.png",
    "/public",
  ]

  const isPublic = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublic) return NextResponse.next()

  // Create Supabase client with cookie access
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check auth session
  const { data: { session } } = await supabase.auth.getSession()

  // API routes — return 401 if not authenticated
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    return response
  }

  // Internal routes — redirect to login if not authenticated
  if (pathname.startsWith("/internal")) {
    if (!session) {
      const loginUrl = new URL("/auth/login", request.url)
      loginUrl.searchParams.set("redirectTo", pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // Root — redirect to internal dashboard if logged in, login if not
  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/internal/dashboard", request.url))
    } else {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
