"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Play, Trophy, AlertTriangle, Zap } from "lucide-react"

type Mandate = { id: string; title: string; job_description: string; client_name?: string }

export default function ScanLabPage() {
  const supabase = createClient()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [sel, setSel] = useState<string>("")
  const [running, setRunning] = useState(false)
  const [v1, setV1] = useState<any>(null)
  const [v2, setV2] = useState<any>(null)
  const [v1ms, setV1ms] = useState(0)
  const [err, setErr] = useState("")

  useEffect(() => {
    supabase.from("mandates").select("id, title, job_description, client_name").order("created_at", { ascending: false })
      .then(({ data }) => { setMandates((data as any) || []); if (data && data[0]) setSel(data[0].id) })
  }, [])

  async function run() {
    const m = mandates.find(x => x.id === sel)
    if (!m || running) return
    setRunning(true); setErr(""); setV1(null); setV2(null)
    const payload = { mandate_id: m.id, mandate_title: m.title, job_description: m.job_description || m.title, incremental: false }
    try {
      const t = Date.now()
      const [r1, r2] = await Promise.all([
        fetch("/api/talent-pool-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(r => r.json()).then(d => { setV1ms(Date.now() - t); return d }),
        fetch("/api/talent-pool-scan-v2", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(r => r.json()),
      ])
      setV1(r1?.result || r1)
      setV2(r2)
    } catch (e: any) { setErr(e?.message || "Comparison failed") }
    setRunning(false)
  }

  const v1strong = v1?.strong_matches?.length || 0
  const v1poss = v1?.possible_matches?.length || 0
  const v2strong = v2?.strong_matches?.length || 0
  const v2poss = v2?.possible_matches?.length || 0

  const Card = ({ children }: any) => <div className="bg-white rounded-xl border border-gray-100 p-4">{children}</div>
  const MatchRow = ({ m, badge }: any) => (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 text-sm">
      <div className="min-w-0">
        <span className="font-medium text-gray-800 truncate">{m.name}</span>
        {m.current_title && <span className="text-gray-400 text-xs ml-1 truncate">· {m.current_title}</span>}
        {badge && m.vrank > 60 && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">rank #{m.vrank}{m.rescued ? " · rescued" : ""}</span>}
      </div>
      <span className="text-xs font-bold flex-shrink-0" style={{ color: m.score >= 70 ? "#028090" : m.score >= 50 ? "#d97706" : "#9ca3af" }}>{m.score}</span>
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-1"><Zap size={20} className="text-teal" /><h1 className="text-xl font-bold text-gray-900">Scan Lab — v1 vs v2</h1></div>
      <p className="text-sm text-gray-500 mb-5">Compares the current capped scan (top-60) against v2 (whole pool, v1&apos;s exact Sonnet rubric, no cap). Standalone — nothing here is wired into the live app.</p>

      <div className="flex gap-2 items-center mb-6">
        <select value={sel} onChange={e => setSel(e.target.value)} className="flex-1 max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal">
          {mandates.map(m => <option key={m.id} value={m.id}>{m.title}{m.client_name ? ` · ${m.client_name}` : ""}</option>)}
        </select>
        <button onClick={run} disabled={running || !sel} className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-teal/90">
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}{running ? "Running both…" : "Run comparison"}
        </button>
      </div>
      {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{err}</div>}

      {(v1 || v2) && (
        <>
          {v2?.surfaced_beyond_top60?.length > 0 && (
            <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2"><AlertTriangle size={16} /> {v2.surfaced_beyond_top60.length} real match{v2.surfaced_beyond_top60.length !== 1 ? "es" : ""} the current top-60 cap would have MISSED</div>
              <div className="flex flex-wrap gap-2">
                {v2.surfaced_beyond_top60.map((c: any, i: number) => (
                  <span key={i} className="text-xs bg-white border border-amber-200 rounded px-2 py-1 text-amber-800">{c.name} · #{c.vrank} · score {c.score}{c.rescued ? " · rescued" : ""}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800">Current scan (v1)</span>
                <span className="text-xs text-gray-400">capped top-60 · {v1ms ? (v1ms / 1000).toFixed(1) + "s" : ""}</span>
              </div>
              <div className="flex gap-4 mb-3 text-sm">
                <div><Trophy size={13} className="inline text-teal" /> <b>{v1strong}</b> strong</div>
                <div className="text-gray-500">{v1poss} possible</div>
                <div className="text-gray-400">of {v1?.total_available ?? "?"} considered</div>
              </div>
              {[...(v1?.strong_matches || []), ...(v1?.possible_matches || [])].slice(0, 25).map((m: any, i: number) => <MatchRow key={i} m={m} />)}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-teal">v2 (v1 rubric · uncapped)</span>
                <span className="text-xs text-gray-400">${v2?.cost_usd ?? "?"} · {v2?.ms ? (v2.ms / 1000).toFixed(1) + "s" : ""}</span>
              </div>
              <div className="flex gap-4 mb-3 text-sm">
                <div><Trophy size={13} className="inline text-teal" /> <b>{v2strong}</b> strong</div>
                <div className="text-gray-500">{v2poss} possible</div>
                <div className="text-gray-400">{v2?.scored ?? "?"} scored · {v2?.deep_read ?? "?"} deep-read</div>
              </div>
              {[...(v2?.strong_matches || []), ...(v2?.possible_matches || [])].slice(0, 25).map((m: any, i: number) => <MatchRow key={i} m={m} badge />)}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
