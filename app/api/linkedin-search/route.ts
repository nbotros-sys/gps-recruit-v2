import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

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

function nameFromUrl(url: string): string {
  try {
    const slug = url.split("/in/")[1]?.split("?")[0]?.replace(/\/+$/, "") || ""
    const clean = slug.replace(/-[a-z0-9]{4,}$/, "")
    return clean
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .trim() || "LinkedIn Profile"
  } catch {
    return "LinkedIn Profile"
  }
}

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const _authClient = createServerSupabaseClient()
  const { data: { user: _authUser } } = await _authClient.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    const { title, location, keywords } = await req.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 })
    }

    const apiKey = process.env.PROXYCURL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
    }

    // Keep it as simple as possible — just title, country, page_size
    // No past_role_title (causes AND logic = too strict)
    // No enrich_profiles (filters out unenriched profiles)
    // No keywords (extra filters reduce results)
    const params = new URLSearchParams({
      current_role_title: title.trim(),
      page_size: "10",
    })

    if (location?.trim()) {
      const countryCode = locationToCountry(location.trim())
      if (countryCode) params.append("country", countryCode)
    }

    const searchRes = await fetch(
      `https://enrichlayer.com/api/v2/search/person?${params.toString()}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )

    if (!searchRes.ok) {
      const errText = await searchRes.text()
      console.error("Enrich Layer search error:", searchRes.status, errText)
      if (searchRes.status === 401 || searchRes.status === 403) {
        return NextResponse.json({ error: "API key invalid or quota exceeded" }, { status: 403 })
      }
      return NextResponse.json({ error: `Search returned ${searchRes.status}: ${errText.slice(0,100)}` }, { status: 502 })
    }

    const data = await searchRes.json()
    console.log("Enrich Layer raw response:", JSON.stringify(data).slice(0, 500))

    const results = (data.results || [])
      .map((p: any) => {
        const url = p.linkedin_profile_url || p.profile_url || null
        if (!url) return null
        return {
          linkedin_url: url,
          name: nameFromUrl(url),
          headline: null,
          current_title: null,
          current_company: null,
          location: null,
          avatar_url: null,
          preview_only: true,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      results,
      total: data.total || results.length,
      search_params: { title, location, keywords },
      raw_total: data.total,
    })
  } catch (err: any) {
    console.error("linkedin-search error:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
