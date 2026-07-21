"use client"
import { useState, useEffect } from "react"
import { Loader2, TrendingUp } from "lucide-react"

type Model = { model: string; cost: number; calls: number; inTok: number; outTok: number }
type Op = { operation: string; cost: number; calls: number; avgCost: number }
type Summary = {
  month: string
  totalCost: number
  totalIn: number
  totalOut: number
  callCount: number
  models: Model[]
  operations: Op[]
  distinctCandidates: number
  perCandidateUnit: number
}

const OP_LABELS: Record<string, string> = {
  "extract-cv": "CV text extraction (PDF)",
  "build-profile": "Profile build",
  "score-cv": "CV scoring",
  "embedding": "Embedding (search)",
  "extract-candidate": "Candidate extraction",
  "extract-structured": "Structured profile",
  "bulk-extract": "Structured profile (bulk)",
  "bulk-score": "CV scoring (bulk)",
  "generate-outreach": "Outreach message",
}

function money(n: number) {
  if (!n) return "$0.00"
  if (n < 0.01) return "$" + n.toFixed(4)
  return "$" + n.toFixed(2)
}
function monthLabel(m: string) {
  try {
    const d = new Date(m + "-01T00:00:00Z")
    return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  } catch {
    return m
  }
}

export default function AiUsageCost() {
  const now = new Date()
  const cur = now.getUTCFullYear() + "-" + String(now.getUTCMonth() + 1).padStart(2, "0")
  const [month, setMonth] = useState(cur)
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function load(m: string) {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/ai-usage-summary?month=" + m)
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || "Could not load usage")
        setData(null)
      } else {
        setData(j)
      }
    } catch {
      setError("Could not load usage")
    }
    setLoading(false)
  }
  useEffect(() => {
    load(month)
  }, [month])

  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"))
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-teal" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">AI usage &amp; cost</h3>
            <p className="text-sm text-gray-500 mt-0.5">What the AI features actually cost, measured per call — use it to price your service.</p>
          </div>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal/30">
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-6"><Loader2 size={14} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-500 py-4">{error}</p>
      ) : !data || data.callCount === 0 ? (
        <p className="text-sm text-gray-400 py-4">No AI usage recorded yet for {monthLabel(month)}. As candidates are processed and searches run, costs appear here.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-medium">Total this month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{money(data.totalCost)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-medium">AI calls</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.callCount.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-medium">Cost / candidate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{money(data.perCandidateUnit)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">By model</p>
            <div className="space-y-1.5">
              {data.models.map(m => (
                <div key={m.model} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 font-medium flex-1">{m.model}</span>
                  <span className="text-gray-400 text-xs mr-4">{(m.inTok + m.outTok).toLocaleString()} tokens · {m.calls} calls</span>
                  <span className="text-gray-900 font-semibold w-20 text-right">{money(m.cost)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">By operation (unit cost)</p>
            <div className="space-y-1.5">
              {data.operations.map(o => (
                <div key={o.operation} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 flex-1">{OP_LABELS[o.operation] || o.operation}</span>
                  <span className="text-gray-400 text-xs mr-4">{o.calls} × {money(o.avgCost)} avg</span>
                  <span className="text-gray-900 font-semibold w-20 text-right">{money(o.cost)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            "Cost / candidate" sums the average cost of the per-candidate steps (CV extraction, profile build, scoring, embedding). Rates: Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, embedding-3-small $0.02 per 1M tokens.
          </p>
        </div>
      )}
    </div>
  )
}
