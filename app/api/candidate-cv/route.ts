import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids")
  if (!ids) return NextResponse.json({})

  const supabase = createClient()
  const idList = ids.split(",").filter(Boolean)

  const { data } = await supabase
    .from("candidates")
    .select("id, cv_text")
    .in("id", idList)

  const result: Record<string, string | null> = {}
  for (const row of data || []) {
    result[row.id] = row.cv_text || null
  }

  return NextResponse.json(result)
}
