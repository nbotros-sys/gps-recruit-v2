import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// ── Normalise phone — strip non-digits + leading country codes ───────────────
function normalisePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  let digits = phone.replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("20") && digits.length > 10) digits = digits.slice(2)
  if (digits.startsWith("0") && digits.length > 9) digits = digits.slice(1)
  return digits
}

// ── Build a plain-text CV from Proxycurl JSON ────────────────────────────────
function buildCvText(data: any): string {
  const lines: string[] = []

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ")
  if (name) lines.push(name)
  if (data.headline) lines.push(data.headline)
  if (data.summary) lines.push("\n" + data.summary)

  // Experiences
  if (data.experiences?.length) {
    lines.push("\nEXPERIENCE")
    for (const exp of data.experiences) {
      const title = [exp.title, exp.company].filter(Boolean).join(" at ")
      const dates = [exp.starts_at ? `${exp.starts_at.month}/${exp.starts_at.year}` : null,
                     exp.ends_at   ? `${exp.ends_at.month}/${exp.ends_at.year}` : "Present"].filter(Boolean).join(" – ")
      lines.push(`${title}${dates ? " | " + dates : ""}`)
      if (exp.description) lines.push(exp.description)
    }
  }

  // Education
  if (data.education?.length) {
    lines.push("\nEDUCATION")
    for (const edu of data.education) {
      const deg = [edu.degree_name, edu.field_of_study, edu.school].filter(Boolean).join(", ")
      const year = edu.ends_at?.year || edu.starts_at?.year
      lines.push(`${deg}${year ? " (" + year + ")" : ""}`)
    }
  }

  // Skills
  if (data.skills?.length) {
    lines.push("\nSKILLS")
    lines.push(data.skills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean).join(", "))
  }

  // Languages
  if (data.languages?.length) {
    lines.push("\nLANGUAGES")
    lines.push(data.languages.join(", "))
  }

  // Certifications
  if (data.certifications?.length) {
    lines.push("\nCERTIFICATIONS")
    for (const cert of data.certifications) {
      lines.push(typeof cert === "string" ? cert : cert.name || "")
    }
  }

  return lines.join("\n").trim()
}

// ── Map Proxycurl person object → candidates row ─────────────────────────────
function mapToCandidate(data: any, linkedinUrl: string) {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown"

  // Most recent experience
  const sorted = (data.experiences || [])
    .slice()
    .sort((a: any, b: any) => {
      const aYear = a.ends_at?.year ?? 9999
      const bYear = b.ends_at?.year ?? 9999
      return bYear - aYear
    })
  const current = sorted[0] || {}

  // Location — prefer city-level data
  const locationParts = [data.city, data.state, data.country_full_name].filter(Boolean)
  const location = locationParts.length ? locationParts.join(", ") : null

  // Skills as tags
  const skillTags: string[] = (data.skills || [])
    .map((s: any) => (typeof s === "string" ? s : s.name))
    .filter(Boolean)
    .slice(0, 20)

  // cv_text — full narrative for AI search / embedding
  const cv_text = buildCvText(data)

  return {
    name,
    email: null, // Proxycurl rarely returns email on free-tier; left null
    phone: null, // Same — set null, consultant can add manually
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
  try {
    const { linkedin_url } = await req.json()

    if (!linkedin_url?.trim()) {
      return NextResponse.json({ error: "linkedin_url is required" }, { status: 400 })
    }

    // Normalise URL — strip query params and trailing slashes
    const cleanUrl = linkedin_url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "")

    // ── 1. Call Proxycurl ────────────────────────────────────────────────────
    const proxycurlKey = process.env.PROXYCURL_API_KEY
    if (!proxycurlKey) {
      return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
    }

    const proxycurlRes = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(cleanUrl)}&extra=include&github_profile_id=include&facebook_profile_id=include&twitter_profile_id=include&personal_contact_number=include&personal_email=include&inferred_salary=skip&skills=include&use_cache=if-present&fallback_to_cache=on-error`,
      {
        headers: {
          Authorization: `Bearer ${proxycurlKey}`,
        },
      }
    )

    if (!proxycurlRes.ok) {
      const errText = await proxycurlRes.text()
      console.error("Proxycurl error:", proxycurlRes.status, errText)
      if (proxycurlRes.status === 404) {
        return NextResponse.json({ error: "LinkedIn profile not found or private" }, { status: 404 })
      }
      if (proxycurlRes.status === 403) {
        return NextResponse.json({ error: "Proxycurl API key invalid or quota exceeded" }, { status: 403 })
      }
      return NextResponse.json({ error: `Proxycurl returned ${proxycurlRes.status}` }, { status: 502 })
    }

    const profileData = await proxycurlRes.json()

    if (!profileData.first_name && !profileData.last_name) {
      return NextResponse.json({ error: "Could not fetch profile — profile may be private" }, { status: 422 })
    }

    // ── 2. Map to candidates schema ──────────────────────────────────────────
    const candidateRow = mapToCandidate(profileData, cleanUrl)

    // ── 3. Duplicate detection ───────────────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check by LinkedIn URL (most reliable for this source)
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
        // Match by LinkedIn URL
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
        // Match by email (if Proxycurl returned one)
        if (candidateRow.email && c.email &&
            !c.email.includes("@pending.com") &&
            c.email.toLowerCase().trim() === candidateRow.email.toLowerCase().trim()) {
          duplicateId = c.id
          duplicateReason = "Same email address already in database"
          break
        }
        // Match by phone
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

    // ── 4. Upsert to candidates ──────────────────────────────────────────────
    let savedId: string | null = duplicateId

    const upsertData = {
      ...candidateRow,
      updated_at: new Date().toISOString(),
    }

    if (duplicateId) {
      // Update existing record (refresh LinkedIn data)
      await supabase.from("candidates").update(upsertData).eq("id", duplicateId)
    } else {
      // Insert new candidate
      const { data: inserted } = await supabase
        .from("candidates")
        .insert([{
          ...upsertData,
          email: `linkedin.${Date.now()}@pending.com`, // placeholder so NOT NULL constraint is satisfied
        }])
        .select("id")
        .single()
      if (inserted) savedId = inserted.id
    }

    // ── 5. Fire-and-forget: structured extraction + embedding ────────────────
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
        cv_text_length: candidateRow.cv_text.length,
      },
    })
  } catch (err: any) {
    console.error("enrich-from-linkedin error:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
