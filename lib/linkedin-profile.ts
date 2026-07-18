// Shared helpers for turning an Enrich Layer (Proxycurl) person profile into
// (a) plain text suitable for CV scoring, and (b) a card object for the
// LinkedIn sourcing results UI.
//
// NOTE: `enrich-from-linkedin` has its own buildCvText/mapToCandidate pair that
// feeds the stored candidate record. This file deliberately does NOT reuse them:
// that route is live and working, and the two have different jobs (persisted
// record vs. throwaway scoring text). Consolidate later if they drift together.

import { cleanCvText } from "@/lib/clean-cv"

export type SourcedCard = {
  linkedin_url: string
  name: string
  headline: string | null
  current_title: string | null
  current_company: string | null
  location: string | null
  avatar_url: string | null
  experiences: Array<{
    title: string | null
    company: string | null
    period: string | null
    location: string | null
  }>
  education: Array<{
    school: string | null
    degree: string | null
    year: string | null
  }>
  summary: string | null
  fit_score: number | null
  fit_strengths: string[]
  fit_concerns: string[]
  preview_only: boolean
}

// Formats an Enrich Layer date object ({day, month, year}) as "M/YYYY".
const fmtDate = (d: any): string | null => {
  if (!d || !d.year) return null
  return d.month ? `${d.month}/${d.year}` : `${d.year}`
}

const periodOf = (exp: any): string | null => {
  const start = fmtDate(exp?.starts_at)
  if (!start) return null
  const end = exp?.ends_at ? fmtDate(exp.ends_at) : "Present"
  return `${start} - ${end || "Present"}`
}

// Builds plain-text CV-like content from a profile, for scoring against a JD.
export const profileToText = (data: any): string => {
  const lines: string[] = []

  const name = [data?.first_name, data?.last_name].filter(Boolean).join(" ")
  if (name) lines.push(name)
  if (data?.headline) lines.push(data.headline)
  if (data?.location_str) lines.push(data.location_str)
  if (data?.summary) lines.push("\n" + cleanCvText(data.summary))

  if (Array.isArray(data?.experiences) && data.experiences.length) {
    lines.push("\nEXPERIENCE")
    for (const exp of data.experiences) {
      const title = [exp?.title, exp?.company].filter(Boolean).join(" at ")
      const period = periodOf(exp)
      lines.push(`${title}${period ? " | " + period : ""}`)
      if (exp?.description) lines.push(cleanCvText(exp.description))
    }
  }

  if (Array.isArray(data?.education) && data.education.length) {
    lines.push("\nEDUCATION")
    for (const edu of data.education) {
      const deg = [edu?.degree_name, edu?.field_of_study, edu?.school]
        .filter(Boolean)
        .join(", ")
      const year = edu?.ends_at?.year || edu?.starts_at?.year
      lines.push(`${deg}${year ? " (" + year + ")" : ""}`)
    }
  }

  if (Array.isArray(data?.certifications) && data.certifications.length) {
    lines.push("\nCERTIFICATIONS")
    lines.push(
      data.certifications
        .map((c: any) => c?.name)
        .filter(Boolean)
        .join(", ")
    )
  }

  return lines.join("\n").trim()
}

// Derives a display name, falling back to the URL slug when the profile is thin.
export const nameFromProfile = (data: any, url: string): string => {
  const full = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim()
  if (full) return full
  if (data?.full_name) return data.full_name
  try {
    const slug = url.split("/in/")[1]?.split("?")[0]?.replace(/\/+$/, "") || ""
    const clean = slug.replace(/-[a-z0-9]{4,}$/, "")
    return (
      clean
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
        .trim() || "LinkedIn Profile"
    )
  } catch {
    return "LinkedIn Profile"
  }
}

// Maps a full Enrich Layer profile to the sourcing result card shape.
export const mapToCard = (data: any, url: string): SourcedCard => {
  const experiences = Array.isArray(data?.experiences) ? data.experiences : []
  const education = Array.isArray(data?.education) ? data.education : []
  const current = experiences.find((e: any) => !e?.ends_at) || experiences[0] || null

  const location =
    data?.location_str ||
    [data?.city, data?.state, data?.country_full_name].filter(Boolean).join(", ") ||
    null

  return {
    linkedin_url: url,
    name: nameFromProfile(data, url),
    headline: data?.headline || data?.occupation || null,
    current_title: current?.title || null,
    current_company: current?.company || null,
    location,
    avatar_url: data?.profile_pic_url || null,
    experiences: experiences.slice(0, 5).map((e: any) => ({
      title: e?.title || null,
      company: e?.company || null,
      period: periodOf(e),
      location: e?.location || null,
    })),
    education: education.slice(0, 3).map((e: any) => ({
      school: e?.school || null,
      degree: [e?.degree_name, e?.field_of_study].filter(Boolean).join(", ") || null,
      year: e?.ends_at?.year ? String(e.ends_at.year) : null,
    })),
    summary: data?.summary ? cleanCvText(data.summary) : null,
    fit_score: null,
    fit_strengths: [],
    fit_concerns: [],
    preview_only: false,
  }
}

// Card shape for a profile we have a URL for but haven't enriched yet.
export const stubCard = (url: string): SourcedCard => ({
  linkedin_url: url,
  name: nameFromProfile(null, url),
  headline: null,
  current_title: null,
  current_company: null,
  location: null,
  avatar_url: null,
  experiences: [],
  education: [],
  summary: null,
  fit_score: null,
  fit_strengths: [],
  fit_concerns: [],
  preview_only: true,
})
