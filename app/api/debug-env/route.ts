import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET",
    has_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET (length: " + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ")" : "NOT SET",
    has_anthropic: process.env.ANTHROPIC_API_KEY ? "SET" : "NOT SET",
    has_openai: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  })
}
