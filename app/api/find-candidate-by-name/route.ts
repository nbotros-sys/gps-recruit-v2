import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, avatar_url")
    .order("name")
  return NextResponse.json({ candidates: candidates || [] })
}
