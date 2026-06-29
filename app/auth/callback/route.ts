import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") || "invite"

  // For invite/recovery: pass token to client page to verify there
  // This ensures the session is established in the browser directly
  if (token_hash) {
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/update-password?token_hash=${token_hash}&type=recovery`)
    }
    return NextResponse.redirect(`${origin}/auth/accept-invite?token_hash=${token_hash}&type=${type}`)
  }

  // PKCE code flow (OAuth etc)
  if (code) {
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/update-password?code=${code}`)
    }
    return NextResponse.redirect(`${origin}/auth/accept-invite?code=${code}`)
  }

  return NextResponse.redirect(`${origin}/internal/login?error=auth_failed`)
}
