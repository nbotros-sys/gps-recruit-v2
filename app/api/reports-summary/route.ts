import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const STAGES = ["new", "screening", "interview", "shortlisted", "offered", "placed", "rejected"]

export async function GET() {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const admin = getAdmin()
  const [candR, appR, mandR] = await Promise.all([
    admin.from("candidates").select("id, source, created_at, cv_file_url, location").limit(100000),
    admin.from("applications").select("stage, ai_score, mandate_id, created_at").limit(100000),
    admin.from("mandates").select("id, title, status, client_name, created_at").limit(100000),
  ])
  const candidates: any[] = candR.data || []
  const applications: any[] = appR.data || []
  const mandates: any[] = mandR.data || []

  const now = new Date()
  const monthMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  const inMonth = (d: any) => !!d && new Date(d).getTime() >= monthMs

  // ── Candidates ──
  const totalCandidates = candidates.length
  const newCandidatesThisMonth = candidates.filter((c) => inMonth(c.created_at)).length
  const withCv = candidates.filter((c) => c.cv_file_url).length
  const cvCoveragePct = totalCandidates ? Math.round((withCv / totalCandidates) * 100) : 0

  const bySource: any = {}
  candidates.forEach((c) => {
    const s = c.source || "unknown"
    bySource[s] = (bySource[s] || 0) + 1
  })
  const sources = Object.keys(bySource).map((source) => ({ source, count: Number(bySource[source]) })).sort((a, b) => b.count - a.count)

  const byLocation: any = {}
  candidates.forEach((c) => {
    if (c.location) {
      const l = String(c.location).split(",")[0].trim()
      if (l) byLocation[l] = (byLocation[l] || 0) + 1
    }
  })
  const locations = Object.keys(byLocation).map((location) => ({ location, count: Number(byLocation[location]) })).sort((a, b) => b.count - a.count).slice(0, 6)

  // ── Applications ──
  const totalApplications = applications.length
  const appsThisMonth = applications.filter((a) => inMonth(a.created_at)).length
  const funnel = STAGES.map((stage) => ({ stage, count: applications.filter((a) => a.stage === stage).length }))
  const placementsTotal = applications.filter((a) => a.stage === "placed").length
  const placementsThisMonth = applications.filter((a) => a.stage === "placed" && inMonth(a.created_at)).length

  const scored: number[] = applications.map((a) => a.ai_score).filter((s) => typeof s === "number")
  const avgScore = scored.length ? Math.round(scored.reduce((x, y) => x + y, 0) / scored.length) : null
  const scoreBuckets = [
    { label: "90–100", count: scored.filter((s) => s >= 90).length },
    { label: "75–89", count: scored.filter((s) => s >= 75 && s < 90).length },
    { label: "60–74", count: scored.filter((s) => s >= 60 && s < 75).length },
    { label: "Below 60", count: scored.filter((s) => s < 60).length },
  ]

  // Applications per week, last 8 weeks
  const weeks: any[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now)
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - now.getUTCDay() - i * 7)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)
    const count = applications.filter((a) => {
      const t = a.created_at ? new Date(a.created_at).getTime() : 0
      return t >= start.getTime() && t < end.getTime()
    }).length
    weeks.push({ label: start.getUTCMonth() + 1 + "/" + start.getUTCDate(), count })
  }

  // ── Mandates ──
  const totalMandates = mandates.length
  const activeMandates = mandates.filter((m) => String(m.status || "").toLowerCase() === "active").length
  const mandTitle: any = {}
  mandates.forEach((m) => {
    mandTitle[m.id] = m.title
  })
  const appsByMandate: any = {}
  applications.forEach((a) => {
    if (a.mandate_id) appsByMandate[a.mandate_id] = (appsByMandate[a.mandate_id] || 0) + 1
  })
  const topMandates = Object.keys(appsByMandate)
    .map((id) => ({ title: mandTitle[id] || "—", count: Number(appsByMandate[id]) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return NextResponse.json({
    totalCandidates,
    newCandidatesThisMonth,
    cvCoveragePct,
    withCv,
    sources,
    locations,
    totalApplications,
    appsThisMonth,
    funnel,
    placementsTotal,
    placementsThisMonth,
    avgScore,
    scoreBuckets,
    weeks,
    totalMandates,
    activeMandates,
    topMandates,
  })
}
