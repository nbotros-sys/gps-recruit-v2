"use client"
import { useState, useEffect } from "react"
import { Loader2, Users, Briefcase, Award, UserCheck, FileText, ChevronDown, DollarSign, Search, Sparkles } from "lucide-react"
import AiUsageCost from "../settings/AiUsageCost"

type Any = any

const STAGE_LABELS: Record<string, string> = {
  new: "New", screening: "Screening", interview: "Interview",
  shortlisted: "Shortlisted", offered: "Offered", placed: "Placed", rejected: "Rejected",
}
const SOURCE_LABELS: Record<string, string> = {
  portal: "Job Portal", direct: "CV Import", linkedin: "LinkedIn",
  referral: "Referral", wuzzuf: "Wuzzuf", bayt: "Bayt", unknown: "Unknown",
}

function money(n: number) {
  if (!n) return "$0.00"
  if (n < 0.01) return "$" + n.toFixed(4)
  return "$" + n.toFixed(2)
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

function FinCard({ label, value, hint, big }: { label: string; value: string; hint?: string; big?: boolean }) {
  return (
    <div className="rounded-xl p-5" style={{ background: big ? "#0d2b30" : "#f0f7f6" }}>
      <p className={`text-xs font-medium ${big ? "text-white/50" : "text-gray-400"}`}>{label}</p>
      <p className={`font-bold mt-1 ${big ? "text-white text-3xl" : "text-gray-900 text-2xl"}`}>{value}</p>
      {hint && <p className={`text-xs mt-1 ${big ? "text-white/40" : "text-gray-400"}`}>{hint}</p>}
    </div>
  )
}

function Section({ title, subtitle, defaultOpen, children }: { title: string; subtitle?: string; defaultOpen?: boolean; children: any }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 pt-1 space-y-6">{children}</div>}
    </div>
  )
}

export default function ReportsClient() {
  const [d, setD] = useState<Any>(null)
  const [ai, setAi] = useState<Any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/reports-summary").then((r) => r.json()),
          fetch("/api/ai-usage-summary").then((r) => r.json()),
        ])
        if (r1 && !r1.error) setD(r1)
        else setError(r1?.error || "Could not load reports")
        if (r2 && !r2.error) setAi(r2)
      } catch {
        setError("Could not load reports")
      }
      setLoading(false)
    })()
  }, [])

  const aiSpend = ai?.totalCost || 0
  const perCandidate = ai?.perCandidateUnit || 0
  const searchOp = (ai?.operations || []).find((o: Any) => o.operation === "ai-search")
  const perSearch = searchOp?.avgCost || 0
  const aiCalls = ai?.callCount || 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-400 text-sm mt-0.5">Financials first — recruitment operations below.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10"><Loader2 size={16} className="animate-spin" /> Loading reports…</div>
      ) : error ? (
        <p className="text-sm text-red-500 py-4">{error}</p>
      ) : d ? (
        <>
          {/* ── FINANCIALS ── */}
          <div className="flex items-center gap-2 pt-1">
            <DollarSign size={16} className="text-teal" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Financials</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FinCard big label="AI spend — this month" value={money(aiSpend)} hint={`${aiCalls} AI calls`} />
            <FinCard label="Cost / candidate" value={money(perCandidate)} hint="processing pipeline" />
            <FinCard label="Cost / AI search" value={money(perSearch)} hint="grows with pool size" />
            <FinCard label="Placements" value={String(d.placementsTotal)} hint={`+${d.placementsThisMonth} this month`} />
          </div>

          <AiUsageCost />

          {/* ── OPERATIONS ── */}
          <div className="flex items-center gap-2 pt-3">
            <Sparkles size={16} className="text-teal" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recruitment operations</h2>
          </div>

          <Section title="Candidates & sourcing" subtitle={`${d.totalCandidates} candidates · +${d.newCandidatesThisMonth} this month`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Users} label="Total candidates" value={d.totalCandidates} hint={`+${d.newCandidatesThisMonth} this month`} />
              <StatCard icon={FileText} label="CV coverage" value={d.cvCoveragePct + "%"} hint={`${d.withCv} of ${d.totalCandidates} downloadable`} />
              <StatCard icon={UserCheck} label="Applications" value={d.totalApplications} hint={`+${d.appsThisMonth} this month`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">By source</p>
              <div className="space-y-1">
                {d.sources.map((s: Any) => (
                  <Bar key={s.source} label={SOURCE_LABELS[s.source] || s.source} count={s.count}
                    max={Math.max(1, ...d.sources.map((x: Any) => x.count))}
                    sub={d.totalCandidates ? Math.round((s.count / d.totalCandidates) * 100) + "%" : ""} />
                ))}
              </div>
            </div>
            {d.locations && d.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top locations</p>
                <div className="space-y-1">
                  {d.locations.map((l: Any) => (
                    <Bar key={l.location} label={l.location} count={l.count} max={Math.max(1, ...d.locations.map((x: Any) => x.count))} />
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Pipeline & mandates" subtitle={`${d.activeMandates} active mandates · ${d.totalApplications} applications`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Briefcase} label="Active mandates" value={d.activeMandates} hint={`${d.totalMandates} total`} />
              <StatCard icon={UserCheck} label="Applications" value={d.totalApplications} hint={`+${d.appsThisMonth} this month`} />
              <StatCard icon={Award} label="Placements" value={d.placementsTotal} hint={`+${d.placementsThisMonth} this month`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Application pipeline</p>
              <div className="space-y-1">
                {d.funnel.map((f: Any) => (
                  <Bar key={f.stage} label={STAGE_LABELS[f.stage] || f.stage} count={f.count}
                    max={Math.max(1, ...d.funnel.map((x: Any) => x.count))} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Applications — last 8 weeks</p>
              <div className="flex items-end gap-2 h-28">
                {d.weeks.map((w: Any, i: number) => {
                  const max = Math.max(1, ...d.weeks.map((x: Any) => x.count))
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
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top mandates by applicants</p>
              {d.topMandates.length ? (
                <div className="space-y-1">
                  {d.topMandates.map((m: Any, i: number) => (
                    <Bar key={i} label={m.title} count={m.count} max={Math.max(1, ...d.topMandates.map((x: Any) => x.count))} />
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No applications yet.</p>}
            </div>
          </Section>

          <Section title="Candidate quality" subtitle={`Average AI score: ${d.avgScore ?? "—"}`}>
            <div className="space-y-1">
              {d.scoreBuckets.map((b: Any) => (
                <Bar key={b.label} label={b.label} count={b.count} max={Math.max(1, ...d.scoreBuckets.map((x: Any) => x.count))} />
              ))}
            </div>
          </Section>
        </>
      ) : null}
    </div>
  )
}
