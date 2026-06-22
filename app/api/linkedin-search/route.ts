import { NextRequest, NextResponse } from "next/server"

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
    usa: "US", "united states": "US",
    germany: "DE", france: "FR",
  }
  for (const [key, code] of Object.entries(map)) {
    if (l.includes(key)) return code
  }
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

    // Broaden the title — strip seniority words to widen the net
    // e.g. "Commercial Director, FMCG" -> search both current AND past role
    const cleanTitle = title.trim()

    const params = new URLSearchParams({
      current_role_title: cleanTitle,
      page_size: "10",
      // enrich_profiles=enrich returns full name/title/company in results
      // costs 1 extra credit per returned profile but gives us actual data
      enrich_profiles: "enrich",
    })

    // Add past_role_title too so we catch people who recently held this role
    params.append("past_role_title", cleanTitle)

    // Country filter — only add if we can map it
    if (location?.trim()) {
      const countryCode = locationToCountry(location.trim())
      if (countryCode) {
        params.append("country", countryCode)
      }
    }

    // Keywords go into headline search
    if (keywords?.trim()) {
      params.append("headline", keywords.trim())
    }

    const searchRes = await fetch(
      `https://enrichlayer.com/api/v2/search/person?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (!searchRes.ok) {
      const errText = await searchRes.text()
      console.error("Enrich Layer search error:", searchRes.status, errText)
      if (searchRes.status === 401 || searchRes.status === 403) {
        return NextResponse.json({ error: "API key invalid or quota exceeded" }, { status: 403 })
      }
      return NextResponse.json({ error: `Search returned ${searchRes.status}` }, { status: 502 })
    }

    const data = await searchRes.json()

    // With enrich_profiles=enrich, each result is a full profile object
    const results = (data.results || []).map((p: any) => {
      // Handle both enriched (full profile) and non-enriched (URL only) responses
      const isEnriched = p.first_name || p.last_name || p.full_name

      const name = p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        null

      // Current experience from enriched profile
      const currentExp = (p.experiences || []).find((e: any) => !e.ends_at) || p.experiences?.[0]

      return {
        linkedin_url: p.linkedin_profile_url || p.profile_url || null,
        name: name || "Unknown",
        headline: p.headline || p.sub_title || null,
        current_title: currentExp?.title || p.headline || null,
        current_company: currentExp?.company || p.job_company_name || null,
        location: p.city
          ? [p.city, p.country_full_name].filter(Boolean).join(", ")
          : p.location || null,
        avatar_url: p.profile_pic_url || null,
        summary: p.summary || null,
        is_enriched: !!isEnriched,
      }
    }).filter((p: any) => p.linkedin_url)

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
