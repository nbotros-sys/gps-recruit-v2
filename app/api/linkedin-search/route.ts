import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { title, location, keywords, mandate_id } = await req.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 })
    }

    const apiKey = process.env.PROXYCURL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
    }

    // Build search params — title is required, location and keywords are optional
    const params = new URLSearchParams({
      current_role_title: title.trim(),
      page_size: "10",
    })

    if (location?.trim()) {
      // Enrich Layer accepts country or region as free text
      params.append("country", location.trim())
    }

    if (keywords?.trim()) {
      // Use summary field for keyword matching
      params.append("summary", keywords.trim())
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
      return NextResponse.json({ error: `Search service returned ${searchRes.status}` }, { status: 502 })
    }

    const data = await searchRes.json()

    // Map results to a clean preview format — no credits used yet, just preview data
    const results = (data.results || []).map((p: any) => ({
      linkedin_url: p.linkedin_profile_url || null,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
      headline: p.headline || null,
      current_title: p.job_title || p.headline || null,
      current_company: p.job_company_name || null,
      location: [p.city, p.state, p.country].filter(Boolean).join(", ") || null,
      avatar_url: p.profile_pic_url || null,
      summary: p.summary || null,
    })).filter((p: any) => p.linkedin_url) // only include results with a URL we can enrich

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
