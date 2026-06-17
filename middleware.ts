import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect internal routes (not login page itself)
  if (pathname.startsWith("/internal") && !pathname.startsWith("/internal/login")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/internal/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/internal/:path*"],
}
