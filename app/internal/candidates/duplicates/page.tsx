"use client"
import { useEffect, useState } from "react"
import { Loader2, GitMerge, AlertTriangle, CheckCircle, RefreshCw, Users } from "lucide-react"
import CandidateAvatar from "@/components/CandidateAvatar"

type Pair = {
  a: any
  b: any
  confidence: "definite" | "probable"
  reason: string
}

export default function DuplicatesPage() {
  const [pairs, setPairs] = useState<Pair[]>([])
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState<string | null>(null)
  const [merged, setMerged] = useState<string[]>([])

  async function load() {
    setLoading(true)
    const res = await fetch("/api/find-duplicates")
    const data = await res.json()
    setPairs(data.pairs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function merge(keepId: string, discardId: string, pairKey: string) {
    setMerging(pairKey)
    const res = await fetch("/api/merge-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, discardId })
    })
    if (res.ok) {
      setMerged(prev => [...prev, pairKey])
    }
    setMerging(null)
  }

  const activePairs = pairs.filter(p => merged.indexOf(`${p.a.id}-${p.b.id}`) === -1)
  const definite = activePairs.filter(p => p.confidence === "definite")
  const probable = activePairs.filter(p => p.confidence === "probable")

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={24} className="animate-spin text-teal" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duplicate Candidates</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Review and merge duplicate records. All application history is preserved during merge.
          </p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Rescan
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{activePairs.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Suspected duplicates</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-500">{definite.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Definite (same email)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-amber-500">{probable.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Probable (same name)</div>
        </div>
      </div>

      {activePairs.length === 0 && (
        <div className="card text-center py-16">
          <CheckCircle size={40} className="mx-auto mb-4 text-green-400" />
          <h3 className="font-semibold text-gray-900 mb-2">No duplicates found</h3>
          <p className="text-gray-400 text-sm">Your candidate database is clean.</p>
        </div>
      )}

      {/* Definite duplicates */}
      {definite.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <h2 className="font-semibold text-gray-900">Definite duplicates — same email</h2>
            <span className="badge bg-red-100 text-red-600 text-xs">{definite.length}</span>
          </div>
          {definite.map(pair => (
            <DuplicatePair key={`${pair.a.id}-${pair.b.id}`} pair={pair}
              merging={merging === `${pair.a.id}-${pair.b.id}`}
              onMerge={(keepId, discardId) => merge(keepId, discardId, `${pair.a.id}-${pair.b.id}`)} />
          ))}
        </div>
      )}

      {/* Probable duplicates */}
      {probable.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="font-semibold text-gray-900">Probable duplicates — same name</h2>
            <span className="badge bg-amber-100 text-amber-600 text-xs">{probable.length}</span>
          </div>
          {probable.map(pair => (
            <DuplicatePair key={`${pair.a.id}-${pair.b.id}`} pair={pair}
              merging={merging === `${pair.a.id}-${pair.b.id}`}
              onMerge={(keepId, discardId) => merge(keepId, discardId, `${pair.a.id}-${pair.b.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function DuplicatePair({ pair, merging, onMerge }: {
  pair: Pair
  merging: boolean
  onMerge: (keepId: string, discardId: string) => void
}) {
  const [choice, setChoice] = useState<"a" | "b" | null>(null)
  const [showCV, setShowCV] = useState(false)
  const { a, b, confidence, reason } = pair

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
      ${confidence === "definite" ? "border-red-100" : "border-amber-100"}`}>

      {/* Reason banner */}
      <div className={`px-5 py-2.5 flex items-center gap-2 text-xs font-semibold
        ${confidence === "definite" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
        <AlertTriangle size={13} />
        {reason}
        <span className="ml-auto text-xs font-normal opacity-70">
          Select which record to keep, then merge
        </span>
      </div>

      {/* Side by side */}
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {[{ cand: a, side: "a" as const }, { cand: b, side: "b" as const }].map(({ cand, side }) => (
          <div key={cand.id}
            onClick={() => setChoice(side)}
            className={`p-5 cursor-pointer transition-all
              ${choice === side ? "bg-teal/5 ring-2 ring-inset ring-teal" : "hover:bg-gray-50"}`}>

            <div className="flex items-center gap-3 mb-4">
              <CandidateAvatar name={cand.name || "?"} avatarUrl={cand.avatar_url} size={44} />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 text-sm">{cand.name || "Unknown"}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {cand.current_title}{cand.current_company ? ` @ ${cand.current_company}` : ""}
                </div>
              </div>
              {choice === side && (
                <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-teal flex items-center justify-center">
                  <CheckCircle size={12} className="text-white" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {[
                { label: "Email", value: cand.email?.includes("@pending.com") ? "—" : cand.email },
                { label: "Phone", value: cand.phone },
                { label: "Location", value: cand.location },
                { label: "Source", value: cand.source },
                { label: "Added", value: new Date(cand.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                { label: "CV", value: cand.cv_text ? `${Math.round(cand.cv_text.length / 100) * 100} chars` : "No CV" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
                  <span className="text-xs text-gray-700 truncate">{value || "—"}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                ${choice === side ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-500"}`}>
                {choice === side ? "✓ Keep this record" : "Click to select as primary"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CV Compare toggle */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowCV(!showCV)}
          className="w-full px-5 py-3 text-xs font-semibold text-gray-500 hover:text-teal hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
          {showCV ? "▲ Hide CVs" : "▼ Compare CVs side by side"}
        </button>
      </div>

      {/* CV comparison panel */}
      {showCV && (
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
          {[a, b].map((cand, i) => (
            <div key={cand.id} className="p-5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                {cand.name} — CV
              </div>
              {cand.cv_text ? (
                <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto bg-gray-50 rounded-xl p-4">
                  {cand.cv_text}
                </pre>
              ) : (
                <div className="text-xs text-gray-400 italic py-8 text-center bg-gray-50 rounded-xl">
                  No CV text on file
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Merge action */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {choice
            ? `Will keep "${choice === "a" ? a.name : b.name}" and merge all applications into this record.`
            : "Select which record to keep as the primary."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setChoice(null)}
            disabled={!choice || merging}
            className="btn-secondary text-sm px-4 py-2 disabled:opacity-30">
            Reset
          </button>
          <button
            onClick={() => choice && onMerge(
              choice === "a" ? a.id : b.id,
              choice === "a" ? b.id : a.id
            )}
            disabled={!choice || merging}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-30">
            {merging
              ? <><Loader2 size={13} className="animate-spin" /> Merging...</>
              : <><GitMerge size={13} /> Merge records</>}
          </button>
        </div>
      </div>
    </div>
  )
}
