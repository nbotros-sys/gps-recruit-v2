import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const supabase = createClient()

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, email, phone, current_title, current_company, location, cv_text, tags, source, created_at, avatar_url")
    .order("created_at", { ascending: true })

  if (!candidates?.length) return NextResponse.json({ pairs: [] })

  const pairs: any[] = []
  const seen = new Set<string>()

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      const key = [a.id, b.id].sort().join("-")
      if (seen.has(key)) continue

      // Definite: same email (non-empty)
      if (a.email && b.email && a.email.toLowerCase().trim() === b.email.toLowerCase().trim()
          && !a.email.includes("@pending.com") && !b.email.includes("@pending.com")) {
        seen.add(key)
        pairs.push({ a, b, confidence: "definite", reason: "Same email address" })
        continue
      }

      // Probable: same name + same company
      const aName = a.name?.toLowerCase().trim()
      const bName = b.name?.toLowerCase().trim()
      const aCompany = a.current_company?.toLowerCase().trim()
      const bCompany = b.current_company?.toLowerCase().trim()
      const aPhone = a.phone?.replace(/\D/g, "")
      const bPhone = b.phone?.replace(/\D/g, "")

      if (aName && bName && aName === bName && aCompany && bCompany && aCompany === bCompany) {
        seen.add(key)
        pairs.push({ a, b, confidence: "probable", reason: "Same name and current company" })
        continue
      }

      // Probable: same name + same phone
      if (aName && bName && aName === bName && aPhone && bPhone && aPhone.length > 7 && aPhone === bPhone) {
        seen.add(key)
        pairs.push({ a, b, confidence: "probable", reason: "Same name and phone number" })
        continue
      }
    }
  }

  return NextResponse.json({ pairs })
}
