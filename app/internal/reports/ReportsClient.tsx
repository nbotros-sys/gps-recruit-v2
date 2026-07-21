"use client"
import { useState, useEffect } from "react"
import { Loader2, Users, Briefcase, Award, UserCheck, FileText } from "lucide-react"
import AiUsageCost from "../settings/AiUsageCost"

type Summary = any

const STAGE_LABELS: Record<string, string> = {
  new: "New", screening: "Screening", interview: "Interview",
  shortlisted: "Shortlisted", offered: "Offered", placed: "Placed", rejected: "Rejected",
}
const SOURCE_LABELS: Record<string, string> = {
  portal: "Job Portal", direct: "CV Import", linkedin: "LinkedIn",
  referral: "Referral", wuzzuf: "Wuzzuf", bayt: "Bayt", unknown: "Unknown",
}

function Bar({ label, count, max, sub }: { label: string; count: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3 text-sm py-1">
      <span className="text-gray-600 w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: pct + "%", background: "#028090" }} />
      </div>
      <span className="text-gray-900 font-semibold w-10 text-right flex-shrink-0">{count}</span>
      {sub && <span className="text-gray-400 text-xs w-10 text-right flex-shrink-0">{sub}</span>}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon size={15} className="text-teal" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function ReportsClient() {
  const [d, setD] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reports-summary")
        const j = await res.json()
        if (!res.ok) setError(j.error || "Could not load reports")
        else setD(j)
      } catch {
        setError("Could not load reports")
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-400 text-sm mt-0.5">Recruitment metrics, pipeline health and AI cost.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10"><Loader2 size={16} className="animate-spin" /> Loading reports…</div>
      ) : error ? (
        <p className="text-sm text-red-500 py-4">{error}</p>
      ) : d ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total candidates" value={d.totalCandidates} hint={`+${d.newCandidatesThisMonth} this month`} />
            <StatCard icon={Briefcase} label="Active mandates" value={d.activeMandates} hint={`${d.totalMandates} total`} />
            <StatCard icon={UserCheck} label="Applications" value={d.totalApplications} hint={`+${d.appsThisMonth} this month`} />
            <StatCard icon={Award} label="Placements" value={d.placementsTotal} hint={`+${d.placementsThisMonth} this month`} />
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4">Application pipeline</h3>
            <div className="space-y-1">
              {d.funnel.map((f: any) => (
                <Bar key={f.stage} label={STAGE_LABELS[f.stage] || f.stage} count={f.count}
                  max={Math.max(1, ...d.funnel.map((x: any) => x.count))} />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Candidates by source</h3>
              <div className="space-y-1">
                {d.sources.map((s: any) => (
                  <Bar key={s.source} label={SOURCE_LABELS[s.source] || s.source} count={s.count}
                    max={Math.max(1, ...d.sources.map((x: any) => x.count))}
                    sub={d.totalCandidates ? Math.round((s.count / d.totalCandidates) * 100) + "%" : ""} />
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Candidate quality (AI score)</h3>
              <p className="text-sm text-gray-400 mb-3">Average score: <span className="font-bold text-gray-900">{d.avgScore ?? "—"}</span></p>
              <div className="space-y-1">
                {d.scoreBuckets.map((b: any) => (
                  <Bar key={b.label} label={b.label} count={b.count}
                    max={Math.max(1, ...d.scoreBuckets.map((x: any) => x.count))} />
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4">Applications — last 8 weeks</h3>
            <div className="flex items-end gap-2 h-32">
              {d.weeks.map((w: any, i: number) => {
                const max = Math.max(1, ...d.weeks.map((x: any) => x.count))
                const h = Math.max(3, Math.round((w.count / max) * 100))
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <span className="text-xs font-semibold text-gray-700">{w.count || ""}</span>
                    <div className="w-full rounded-t" style={{ height: h + "%", background: "#028090", opacity: 0.85 }} />
                    <span className="text-[10px] text-gray-400">{w.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Top mandates by applicants</h3>
              {d.topMandates.length ? (
                <div className="space-y-1">
                  {d.topMandates.map((m: any, i: number) => (
                    <Bar key={i} label={m.title} count={m.count} max={Math.max(1, ...d.topMandates.map((x: any) => x.count))} />
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No applications yet.</p>}
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <FileText size={15} className="text-teal" />
                <span className="text-xs font-medium">CV coverage</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{d.cvCoveragePct}%</p>
              <p className="text-sm text-gray-500 mt-1">{d.withCv} of {d.totalCandidates} candidates have their original CV saved and downloadable.</p>
              {d.locations && d.locations.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top locations</p>
                  <div className="space-y-1">
                    {d.locations.map((l: any) => (
                      <Bar key={l.location} label={l.location} count={l.count} max={Math.max(1, ...d.locations.map((x: any) => x.count))} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AiUsageCost />
        </>
      ) : null}
    </div>
  )
}
