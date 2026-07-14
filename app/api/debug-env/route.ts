import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

export async function GET(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET",
    has_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET (length: " + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ")" : "NOT SET",
    has_anthropic: process.env.ANTHROPIC_API_KEY ? "SET" : "NOT SET",
    has_openai: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
    has_proxycurl: process.env.PROXYCURL_API_KEY ? "SET" : "NOT SET",
    has_resend: process.env.RESEND_API_KEY ? "SET" : "NOT SET",
    has_doppio: process.env.DOPPIO_API_KEY ? "SET" : "NOT SET",
    has_service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET",
  })
}
