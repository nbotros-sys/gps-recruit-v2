import { NextRequest, NextResponse } from "next/server"
import { sendNetworkWelcome } from "@/lib/emails"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  // Auth check
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const email = req.nextUrl.searchParams.get("email") || "nbotros@hotmail.com"
  try {
    const result = await sendNetworkWelcome({
      candidateName: "Nader Botros",
      candidateEmail: email,
    })
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message })
  }
}
