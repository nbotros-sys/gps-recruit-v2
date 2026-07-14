import { NextRequest, NextResponse } from "next/server"
import { sendNetworkWelcome } from "@/lib/emails"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

export async function GET(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

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
