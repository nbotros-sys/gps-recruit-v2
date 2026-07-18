import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireStaff } from "@/lib/require-staff"
import { scoreCV } from "@/lib/score-cv-core"
import { mapToCard, profileToText, stubCard } from "@/lib/linkedin-profile"

// Profiles enriched per call. Each one costs 1 Enrich Layer credit, so this is
// the blast radius of a single search or Load More click.
const BATCH = 10

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
  // Auth guard - belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  try {
    const body = await req.json()
    const { title, location, mandate_id } = body
    // Load More passes an explicit slice of already-known URLs; a fresh search
    // passes a title. The two modes share the enrichment half of this route.
    const enrichOnly: string[] | null = Array.isArray(body.urls) ? body.urls : null

    if (!enrichOnly && !title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 })
    }

    const apiKey = process.env.PROXYCURL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
    }

    let allUrls: string[] = []
    let total = 0
    let nextToken: string | null = null

    if (enrichOnly) {
      allUrls = enrichOnly
      total = enrichOnly.length
    } else {
      // URL-only search: page_size can go to 100 and costs the same flat base
      // as 10 did. Enrichment is NOT requested here - Enrich Layer caps
      // page_size at 10 whenever enrich_profiles=enrich, and enriching all 100
      // would cost 100 credits for profiles nobody looks at.
      //
      // Filters stay deliberately loose: current_role_title plus an optional
      // country. Extra fields AND together and collapse the pool.
      const params = new URLSearchParams({
        current_role_title: title.trim(),
        page_size: "100",
        enrich_profiles: "skip",
        use_cache: "if-present",
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
        return NextResponse.json(
          { error: `Search returned ${searchRes.status}: ${errText.slice(0, 100)}` },
          { status: 502 }
        )
      }

      const data = await searchRes.json()

      allUrls = (data.results || [])
        .map((p: any) => p.linkedin_profile_url || p.profile_url || null)
        .filter(Boolean)

      total = data.total ?? allUrls.length

      if (data.next_page) {
        try {
          nextToken = new URL(data.next_page).searchParams.get("next_token")
        } catch {
          nextToken = null
        }
      }
    }

    // Dedupe and normalise before spending anything on enrichment.
    const clean = Array.from(
      new Set(
        allUrls
          .filter((u: any) => typeof u === "string" && u.trim())
          .map((u: string) => u.trim().replace(/[?#].*$/, "").replace(/\/+$/, ""))
      )
    )

    const toEnrich = clean.slice(0, BATCH)

    // Fetch the JD once so every profile in the batch scores against it.
    let jobDescription = ""
    let mandateTitle = ""
    if (mandate_id) {
      const supabase = await createServerSupabaseClient()
      const { data: mandate } = await supabase
        .from("mandates")
        .select("title, job_description")
        .eq("id", mandate_id)
        .maybeSingle()
      jobDescription = mandate?.job_description || ""
      mandateTitle = mandate?.title || ""
    }

    const enrichOne = async (url: string) => {
      try {
        // Contact details (personal_email / personal_contact_number) are
        // deliberately NOT requested: they cost 1 extra credit each returned,
        // and the add-to-mandate flow already pulls them when a consultant
        // commits to a candidate.
        const params = new URLSearchParams({
          profile_url: url,
          use_cache: "if-present",
          fallback_to_cache: "on-error",
        })

        const res = await fetch(`https://enrichlayer.com/api/v2/profile?${params.toString()}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })

        if (!res.ok) {
          console.error("enrich profile failed:", url, res.status)
          return stubCard(url)
        }

        const profile = await res.json()
        const card = mapToCard(profile, url)

        if (jobDescription) {
          const text = profileToText(profile)
          if (text) {
            // scoreCV never throws - returns a null score on failure.
            const score = await scoreCV(text, jobDescription, mandateTitle)
            card.fit_score = score.score
            card.fit_strengths = score.strengths || []
            card.fit_concerns = score.concerns || []
          }
        }

        return card
      } catch (err) {
        console.error("enrich failed for", url, err)
        return stubCard(url)
      }
    }

    const results = await Promise.all(toEnrich.map(enrichOne))

    return NextResponse.json({
      // `results` keeps the shape the mandate page already renders.
      results,
      // Remaining URLs the consultant can pull with Load More, at 1 credit each.
      pending_urls: clean.slice(BATCH),
      total,
      next_token: nextToken,
      search_params: { title: title || "", location: location || "" },
    })
  } catch (err: any) {
    console.error("linkedin-search error:", err)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
