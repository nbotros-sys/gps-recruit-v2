import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"

function normalisePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  let digits = phone.replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("20") && digits.length > 10) digits = digits.slice(2)
  if (digits.startsWith("0") && digits.length > 9) digits = digits.slice(1)
  return digits
}

function buildCvText(data: any): string {
  const lines: string[] = []

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ")
  if (name) lines.push(name)
  if (data.headline) lines.push(data.headline)
  if (data.summary) lines.push("\n" + data.summary)

  if (data.experiences?.length) {
    lines.push("\nEXPERIENCE")
    for (const exp of data.experiences) {
      const title = [exp.title, exp.company].filter(Boolean).join(" at ")
      const start = exp.starts_at ? `${exp.starts_at.month || ""}/${exp.starts_at.year || ""}` : null
      const end = exp.ends_at ? `${exp.ends_at.month || ""}/${exp.ends_at.year || ""}` : "Present"
      lines.push(`${title}${start ? " | " + start + " – " + end : ""}`)
      if (exp.description) lines.push(exp.description)
    }
  }

  if (data.education?.length) {
    lines.push("\nEDUCATION")
    for (const edu of data.education) {
      const deg = [edu.degree_name, edu.field_of_study, edu.school].filter(Boolean).join(", ")
      const year = edu.ends_at?.year || edu.starts_at?.year
      lines.push(`${deg}${year ? " (" + year + ")" : ""}`)
    }
  }

  if (data.skills?.length) {
    lines.push("\nSKILLS")
    lines.push(data.skills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean).join(", "))
  }

  if (data.languages?.length) {
    lines.push("\nLANGUAGES")
    lines.push(data.languages.join(", "))
  }

  if (data.certifications?.length) {
    lines.push("\nCERTIFICATIONS")
    for (const cert of data.certifications) {
      lines.push(typeof cert === "string" ? cert : cert.name || "")
    }
  }

  return lines.join("\n").trim()
}

function mapToCandidate(data: any, linkedinUrl: string) {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown"

  const sorted = (data.experiences || [])
    .slice()
    .sort((a: any, b: any) => {
      const aYear = a.ends_at?.year ?? 9999
      const bYear = b.ends_at?.year ?? 9999
      return bYear - aYear
    })
  const current = sorted[0] || {}

  const locationParts = [data.city, data.state, data.country_full_name].filter(Boolean)
  const location = locationParts.length ? locationParts.join(", ") : null

  const skillTags: string[] = (data.skills || [])
    .map((s: any) => (typeof s === "string" ? s : s.name))
    .filter(Boolean)
    .slice(0, 20)

  const personalEmails: string[] = (data.personal_emails || []).filter(Boolean)
  const personalNumbers: string[] = (data.personal_numbers || []).filter(Boolean)

  const cv_text = buildCvText(data)

  return {
    name,
    email: personalEmails[0] || null,
    phone: personalNumbers[0] || null,
    current_title: data.headline || current.title || null,
    current_company: current.company || null,
    location,
    linkedin_url: linkedinUrl,
    avatar_url: data.profile_pic_url || null,
    cv_text,
    tags: skillTags,
    source: "linkedin",
    notes: data.summary || "",
  }
}

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  try {
    const { linkedin_url } = await req.json()

    if (!linkedin_url?.trim()) {
      return NextResponse.json({ error: "linkedin_url is required" }, { status: 400 })
    }

    const cleanUrl = linkedin_url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "")

    // ── Call Enrich Layer (formerly Proxycurl) ───────────────────────────────
    const apiKey = process.env.PROXYCURL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
    }

    // Basic lookup = 1 credit. We skip the expensive extras (live_fetch costs 9 credits alone).
    const params = new URLSearchParams({
      profile_url: cleanUrl,
      skills: "include",
      personal_email: "include",
      personal_contact_number: "include",
      use_cache: "if-present",
      fallback_to_cache: "on-error",
    })

    const enrichRes = await fetch(
      `https://enrichlayer.com/api/v2/profile?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!enrichRes.ok) {
      const errText = await enrichRes.text()
      console.error("Enrich Layer error:", enrichRes.status, errText)
      if (enrichRes.status === 404) {
        return NextResponse.json({ error: "LinkedIn profile not found or private" }, { status: 404 })
      }
      if (enrichRes.status === 401 || enrichRes.status === 403) {
        return NextResponse.json({ error: "API key invalid or quota exceeded" }, { status: 403 })
      }
      return NextResponse.json({ error: `Enrichment service returned ${enrichRes.status}` }, { status: 502 })
    }

    const profileData = await enrichRes.json()

    if (!profileData.first_name && !profileData.last_name) {
      return NextResponse.json({ error: "Could not fetch profile — it may be private or not found" }, { status: 422 })
    }

    // ── Map to candidates schema ─────────────────────────────────────────────
    const candidateRow = mapToCandidate(profileData, cleanUrl)

    // ── Duplicate detection ──────────────────────────────────────────────────
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

    const normLinkedin = cleanUrl
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "")

    const { data: allCandidates } = await supabase
      .from("candidates")
      .select("id, name, email, phone, linkedin_url, current_title, current_company")
      .limit(5000)

    let duplicateId: string | null = null
    let duplicateReason: string | null = null

    if (allCandidates?.length) {
      for (const c of allCandidates) {
        if (c.linkedin_url) {
          const normExisting = c.linkedin_url
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/+$/, "")
          if (normExisting === normLinkedin) {
            duplicateId = c.id
            duplicateReason = "Same LinkedIn profile already in database"
            break
          }
        }
        const rowEmail = candidateRow.email as string | null
        if (rowEmail && c.email &&
            !c.email.includes("@pending.com") &&
            c.email.toLowerCase().trim() === rowEmail.toLowerCase().trim()) {
          duplicateId = c.id
          duplicateReason = "Same email address already in database"
          break
        }
        if (candidateRow.phone && c.phone) {
          const norm1 = normalisePhone(candidateRow.phone)
          const norm2 = normalisePhone(c.phone)
          if (norm1.length >= 8 && norm1 === norm2) {
            duplicateId = c.id
            duplicateReason = "Same phone number already in database"
            break
          }
        }
      }
    }

    // ── Upsert to candidates ─────────────────────────────────────────────────
    let savedId: string | null = duplicateId

    const upsertData = {
      ...candidateRow,
      updated_at: new Date().toISOString(),
    }

    if (duplicateId) {
      await supabase.from("candidates").update(upsertData).eq("id", duplicateId)
    } else {
      const { data: inserted } = await supabase
        .from("candidates")
        .insert([{
          ...upsertData,
          email: candidateRow.email || `linkedin.${Date.now()}@pending.com`,
        }])
        .select("id")
        .single()
      if (inserted) savedId = inserted.id
    }

    // ── Fire-and-forget: structured extraction + embedding ───────────────────
    if (savedId && candidateRow.cv_text.trim()) {
      const capturedId = savedId
      const capturedText = candidateRow.cv_text

      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/extract-structured`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: capturedId, cv_text: capturedText }),
      }).catch(() => {})

      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/generate-embedding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: capturedId, text: capturedText.slice(0, 8000) }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      candidateId: savedId,
      isDuplicate: !!duplicateId,
      duplicateReason,
      candidate: {
        name: candidateRow.name,
        current_title: candidateRow.current_title,
        current_company: candidateRow.current_company,
        location: candidateRow.location,
        avatar_url: candidateRow.avatar_url,
        tags: candidateRow.tags,
        email: candidateRow.email,
        phone: candidateRow.phone,
        cv_text_length: candidateRow.cv_text.length,
      },
    })
  } catch (err: any) {
    console.error("enrich-from-linkedin error:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
