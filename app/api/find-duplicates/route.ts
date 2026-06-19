import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

// Normalise phone — strip all non-digits, then strip leading country codes
// so +20 100 123 4567, 00201001234567, 01001234567 all become 1001234567
function normalisePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  let digits = phone.replace(/\D/g, "")
  // Strip leading 00 or +
  if (digits.startsWith("00")) digits = digits.slice(2)
  // Strip leading Egyptian country code 20
  if (digits.startsWith("20") && digits.length > 10) digits = digits.slice(2)
  // Strip leading 0 (local format)
  if (digits.startsWith("0") && digits.length > 9) digits = digits.slice(1)
  return digits
}

export async function GET(req: NextRequest) {
  const supabase = createClient()

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, email, phone, current_title, current_company, location, linkedin_url, tags, source, created_at, avatar_url")
    .order("created_at", { ascending: true })

  if (!candidates?.length) return NextResponse.json({ pairs: [] })

  const pairs: any[] = []
  const seen = new Set<string>()

  function addPair(a: any, b: any, confidence: "definite" | "probable", reason: string) {
    const key = [a.id, b.id].sort().join("-")
    if (seen.has(key)) return
    seen.add(key)
    pairs.push({ a, b, confidence, reason })
  }

  // ── 1. Same email (definite) ─────────────────────────────────────────────
  const byEmail = new Map<string, any[]>()
  for (const c of candidates) {
    if (!c.email || c.email.includes("@pending.com")) continue
    const key = c.email.toLowerCase().trim()
    if (!byEmail.has(key)) byEmail.set(key, [])
    byEmail.get(key)!.push(c)
  }
  for (const group of byEmail.values()) {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        addPair(group[i], group[j], "definite", "Same email address")
  }

  // ── 2. Same LinkedIn URL (definite) ──────────────────────────────────────
  const byLinkedIn = new Map<string, any[]>()
  for (const c of candidates) {
    if (!c.linkedin_url) continue
    // Normalise: strip https://, www., trailing slashes
    const key = c.linkedin_url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "")
      .trim()
    if (key.length < 10) continue // too short to be meaningful
    if (!byLinkedIn.has(key)) byLinkedIn.set(key, [])
    byLinkedIn.get(key)!.push(c)
  }
  for (const group of byLinkedIn.values()) {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        addPair(group[i], group[j], "definite", "Same LinkedIn profile")
  }

  // ── 3. Same normalised phone (definite if long enough) ───────────────────
  const byPhone = new Map<string, any[]>()
  for (const c of candidates) {
    const key = normalisePhone(c.phone)
    if (key.length < 8) continue // too short to be meaningful
    if (!byPhone.has(key)) byPhone.set(key, [])
    byPhone.get(key)!.push(c)
  }
  for (const group of byPhone.values()) {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        addPair(group[i], group[j], "definite", "Same phone number")
  }

  // ── 4. Same name — then check sub-signals (probable) ─────────────────────
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

        const aCompany = a.current_company?.toLowerCase().trim()
        const bCompany = b.current_company?.toLowerCase().trim()
        const aTitle   = a.current_title?.toLowerCase().trim()
        const bTitle   = b.current_title?.toLowerCase().trim()

        // Same name + same company
        if (aCompany && bCompany && aCompany === bCompany) {
          addPair(a, b, "probable", "Same name and current company")
        }
        // Same name + same title + same company (stronger)
        else if (aTitle && bTitle && aTitle === bTitle && aCompany && bCompany && aCompany === bCompany) {
          addPair(a, b, "probable", "Same name, title and company")
        }
        // Same name + same normalised phone
        else {
          const aPhone = normalisePhone(a.phone)
          const bPhone = normalisePhone(b.phone)
          if (aPhone.length >= 8 && aPhone === bPhone) {
            addPair(a, b, "probable", "Same name and phone number")
          }
        }
      }
    }
  }

  // ── 5. Same name + same title + same company (even if names differ slightly) ─
  // Catches cases where company+title combo is unique enough to flag
  const byTitleCompany = new Map<string, any[]>()
  for (const c of candidates) {
    if (!c.current_title || !c.current_company) continue
    const key = `${c.current_title.toLowerCase().trim()}|${c.current_company.toLowerCase().trim()}`
    if (!byTitleCompany.has(key)) byTitleCompany.set(key, [])
    byTitleCompany.get(key)!.push(c)
  }
  for (const group of byTitleCompany.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]; const b = group[j]
        // Only flag if names are also similar (share first name or last name)
        const aNameParts = (a.name || "").toLowerCase().split(" ").filter(Boolean)
        const bNameParts = (b.name || "").toLowerCase().split(" ").filter(Boolean)
        const sharedNamePart = aNameParts.some((p: string) => p.length > 2 && bNameParts.includes(p))
        if (sharedNamePart) {
          addPair(a, b, "probable", "Same job title and company, similar name")
        }
      }
    }
  }

  return NextResponse.json({ pairs })
}
