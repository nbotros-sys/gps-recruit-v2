import { NextRequest, NextResponse } from "next/server"

// Map common location strings to ISO Alpha-2 country codes
function locationToCountry(location: string): string | null {
  const l = location.toLowerCase().trim()
  const map: Record<string, string> = {
    egypt: "EG", cairo: "EG", alexandria: "EG", giza: "EG",
    uae: "AE", dubai: "AE", "abu dhabi": "AE", "united arab emirates": "AE",
    "saudi arabia": "SA", ksa: "SA", riyadh: "SA", jeddah: "SA",
    kuwait: "KW", qatar: "QA", doha: "QA", bahrain: "BH", oman: "OM",
    jordan: "JO", amman: "JO", lebanon: "LB", beirut: "LB",
    morocco: "MA", casablanca: "MA", tunisia: "TN", algeria: "DZ",
    uk: "GB", "united kingdom": "GB", london: "GB",
    usa: "US", "united states": "US", "new york": "US",
    germany: "DE", france: "FR", paris: "FR",
  }
  // Direct lookup
  for (const [key, code] of Object.entries(map)) {
    if (l.includes(key)) return code
  }
  // If it's already a 2-letter code, use it
  if (/^[a-z]{2}$/i.test(l)) return l.toUpperCase()
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { title, location, keywords } = await req.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 })
    }

    const apiKey = process.env.PROXYCURL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
    }

    // Build search params
    const params = new URLSearchParams({
      current_role_title: title.trim(),
      page_size: "10",
    })

    // Convert location to country code — Enrich Layer requires ISO Alpha-2
    if (location?.trim()) {
      const countryCode = locationToCountry(location.trim())
      if (countryCode) {
        params.append("country", countryCode)
      }
      // If we can't map it, skip — better to get results than a 400
    }

    // Add region for city-level filtering (Enrich Layer supports this)
    if (location?.trim()) {
      params.append("region", location.trim())
    }

    if (keywords?.trim()) {
      params.append("headline", keywords.trim())
    }

    const searchRes = await fetch(
      `https://enrichlayer.com/api/v2/search/person?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!searchRes.ok) {
      const errText = await searchRes.text()
      console.error("Enrich Layer search error:", searchRes.status, errText)
      if (searchRes.status === 401 || searchRes.status === 403) {
        return NextResponse.json({ error: "API key invalid or quota exceeded" }, { status: 403 })
      }
      return NextResponse.json({ error: `Search service returned ${searchRes.status}: ${errText.slice(0, 200)}` }, { status: 502 })
    }

    const data = await searchRes.json()

    // Map results to clean preview format
    const results = (data.results || []).map((p: any) => ({
      linkedin_url: p.linkedin_profile_url || null,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
      headline: p.headline || null,
      current_title: p.job_title || p.headline || null,
      current_company: p.job_company_name || null,
      location: [p.city, p.state, p.country].filter(Boolean).join(", ") || null,
      avatar_url: p.profile_pic_url || null,
      summary: p.summary || null,
    })).filter((p: any) => p.linkedin_url)

    return NextResponse.json({
      results,
      total: data.total || results.length,
      search_params: { title, location, keywords },
    })
  } catch (err: any) {
    console.error("linkedin-search error:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
