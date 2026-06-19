import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const supabase = createClient()

  // Don't fetch cv_text here — it's large and not needed for duplicate detection.
  // We fetch it only when the user clicks "Compare CVs" on a specific pair.
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, email, phone, current_title, current_company, location, tags, source, created_at, avatar_url")
    .order("created_at", { ascending: true })

  if (!candidates?.length) return NextResponse.json({ pairs: [] })

  const pairs: any[] = []

  // ── O(n) approach using lookup maps — much faster than nested loops ──────────

  // 1. Group by normalised email → definite duplicates
  const byEmail = new Map<string, any[]>()
  for (const c of candidates) {
    if (!c.email || c.email.includes("@pending.com")) continue
    const key = c.email.toLowerCase().trim()
    if (!byEmail.has(key)) byEmail.set(key, [])
    byEmail.get(key)!.push(c)
  }
  const seen = new Set<string>()
  for (const group of byEmail.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = [group[i].id, group[j].id].sort().join("-")
        if (seen.has(key)) continue
        seen.add(key)
        pairs.push({ a: group[i], b: group[j], confidence: "definite", reason: "Same email address" })
      }
    }
  }

  // 2. Group by normalised name → probable duplicates (same name + company or phone)
  const byName = new Map<string, any[]>()
  for (const c of candidates) {
    if (!c.name) continue
    const key = c.name.toLowerCase().trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(c)
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]; const b = group[j]
        const key = [a.id, b.id].sort().join("-")
        if (seen.has(key)) continue

        const aCompany = a.current_company?.toLowerCase().trim()
        const bCompany = b.current_company?.toLowerCase().trim()
        const aPhone = a.phone?.replace(/\D/g, "")
        const bPhone = b.phone?.replace(/\D/g, "")

        if (aCompany && bCompany && aCompany === bCompany) {
          seen.add(key)
          pairs.push({ a, b, confidence: "probable", reason: "Same name and current company" })
        } else if (aPhone && bPhone && aPhone.length > 7 && aPhone === bPhone) {
          seen.add(key)
          pairs.push({ a, b, confidence: "probable", reason: "Same name and phone number" })
        }
      }
    }
  }

  return NextResponse.json({ pairs })
}
