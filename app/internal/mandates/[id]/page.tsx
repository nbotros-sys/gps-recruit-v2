"use client"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, MapPin, DollarSign, Brain, Upload,
  X, Star, AlertCircle, CheckCircle, Loader2,
  LayoutGrid, FileText, Zap, TrendingUp, TrendingDown, Minus
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import type { Mandate, Application } from "@/lib/types"

const STAGES = ["new", "screening", "interview", "shortlisted", "offered", "placed"]
const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  shortlisted: "bg-teal/10 text-teal",
  offered: "bg-amber-100 text-amber-700",
  placed: "bg-green-100 text-green-700",
}

type BulkResult = {
  filename: string
  name: string
  score: number
  summary: string
  strengths: string[]
  concerns: string[]
  recommendation: string
}

export default function MandateDetail() {
  const { id } = useParams()
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [tab, setTab] = useState<"pipeline" | "bulk" | "ai">("pipeline")
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [cvText, setCvText] = useState("")
  const [candidateName, setCandidateName] = useState("")
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [files, setFiles] = useState<File[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkStatus, setBulkStatus] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase.from("mandates").select("*").eq("id", id).single()
      if (m) setMandate(m)
      const { data: apps } = await supabase.from("applications")
        .select("*, candidate:candidates(*)")
        .eq("mandate_id", id)
        .order("created_at", { ascending: false })
      setApplications(apps || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function scoreCV() {
    if (!cvText || !mandate) return
    setScoring(true)
    setScoreResult(null)
    try {
      const res = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      setScoreResult(await res.json())
    } catch { setScoreResult({ error: "Scoring failed. Please try again." }) }
    setScoring(false)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i))
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...dropped.filter(f => !names.has(f.name))]
    })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...selected.filter(f => !names.has(f.name))]
    })
  }

  async function runBulkScore() {
    if (!files.length || !mandate) return
    setBulkProcessing(true)
    setBulkResults([])
    setBulkProgress(0)

    const cvs: { filename: string; text: string }[] = []

    for (let i = 0; i < files.length; i++) {
      setBulkStatus(`Extracting CV ${i + 1} of ${files.length}: ${files[i].name}`)
      setBulkProgress(Math.round((i / files.length) * 50))
      const formData = new FormData()
      formData.append("file", files[i])
      try {
        const res = await fetch("/api/extract-cv", { method: "POST", body: formData })
        const data = await res.json()
        cvs.push({ filename: files[i].name, text: data.text || "" })
      } catch {
        cvs.push({ filename: files[i].name, text: "" })
      }
    }

    setBulkStatus(`Scoring all ${files.length} candidates against job description...`)
    setBulkProgress(65)

    try {
      const res = await fetch("/api/bulk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvs, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      const data = await res.json()
      setBulkResults(data.results || [])
    } catch { setBulkResults([]) }

    setBulkProgress(100)
    setBulkStatus("")
    setBulkProcessing(false)
  }

  const byStage = (stage: string) => applications.filter(a => a.stage === stage)

  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"
  const scoreBg = (s: number) => s >= 70 ? "bg-teal/10 text-teal" : s >= 50 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
  const proceed = bulkResults.filter(r => r.recommendation === "Proceed").length
  const maybe = bulkResults.filter(r => r.recommendation === "Maybe").length
  const pass = bulkResults.filter(r => r.recommendation === "Pass").length

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (!mandate) return <div className="text-center py-16 text-gray-400">Mandate not found.</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/internal/mandates" className="text-gray-400 hover:text-teal text-sm flex items-center gap-1 mb-3 w-fit">
          <ArrowLeft size={14} /> Back to Mandates
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mandate.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              {mandate.client_name && <span>{mandate.client_name}</span>}
              {mandate.location && <span className="flex items-center gap-1"><MapPin size={13} />{mandate.location}</span>}
              {mandate.salary_range && <span className="flex items-center gap-1"><DollarSign size={13} />{mandate.salary_range}</span>}
            </div>
          </div>
          <span className={`badge ${mandate.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {mandate.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "pipeline", icon: LayoutGrid, label: "Pipeline" },
          { id: "bulk", icon: Upload, label: "Bulk CV Upload" },
          { id: "ai", icon: Brain, label: "Score Single CV" },
        ].map(({ id: tid, icon: Icon, label }) => (
          <button key={tid} onClick={() => setTab(tid as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === tid ? "bg-white shadow-sm text-teal" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE TAB ── */}
      {tab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => (
              <div key={stage} className="w-56 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${STAGE_COLORS[stage]} capitalize text-xs`}>{stage}</span>
                  <span className="text-xs text-gray-400 font-medium">{byStage(stage).length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {byStage(stage).map(app => (
                    <div key={app.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <div className="font-medium text-sm text-gray-900">{(app as any).candidate?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{(app as any).candidate?.current_title}</div>
                      {app.ai_score && (
                        <div className="mt-2 flex items-center gap-1">
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-gray-700">{app.ai_score}/100</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {byStage(stage).length === 0 && (
                    <div className="border-2 border-dashed border-gray-100 rounded-xl h-16 flex items-center justify-center">
                      <span className="text-xs text-gray-300">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD TAB ── */}
      {tab === "bulk" && (
        <div className="space-y-5">
          {bulkResults.length === 0 && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => !bulkProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all
                  ${dragOver ? "border-teal bg-teal/5 scale-[1.01]" : "border-gray-200 hover:border-teal/40 hover:bg-gray-50"}
                  ${bulkProcessing ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
                <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center mx-auto mb-4">
                  <Upload size={24} className="text-teal" />
                </div>
                <p className="text-gray-700 font-semibold text-base">Drop CVs here to score them</p>
                <p className="text-gray-400 text-sm mt-1">or click to browse your files</p>
                <p className="text-gray-300 text-xs mt-3">Supports PDF, Word (.docx), and text files · Multiple files at once</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold text-gray-900">{files.length} CV{files.length > 1 ? "s" : ""} ready to score</span>
                      <span className="text-gray-400 text-sm ml-2">against: {mandate.title}</span>
                    </div>
                    <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg group">
                        <div className="flex items-center gap-2.5">
                          <FileText size={14} className="text-teal flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate max-w-xs">{f.name}</span>
                          <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {bulkProcessing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-teal flex-shrink-0" />
                        <span className="text-sm text-gray-600">{bulkStatus}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal rounded-full transition-all duration-700 ease-out" style={{ width: `${bulkProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 text-center">{bulkProgress}% complete — this may take a minute for large files</p>
                    </div>
                  ) : (
                    <button onClick={runBulkScore}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
                      <Zap size={16} /> Score {files.length} CV{files.length > 1 ? "s" : ""} Against Job Description
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Results */}
          {bulkResults.length > 0 && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{bulkResults.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">CVs Scored</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-teal">{proceed}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Proceed</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{maybe}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Maybe</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">{pass}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Pass</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Candidates ranked by fit score</h3>
                <button onClick={() => { setBulkResults([]); setFiles([]) }}
                  className="text-sm text-gray-400 hover:text-teal transition-colors">
                  ← Upload new batch
                </button>
              </div>

              {bulkResults.map((r, i) => (
                <div key={i}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden
                    ${expandedCard === i ? "border-teal/30 shadow-md" : "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200"}`}
                >
                  {/* Card header — always visible */}
                  <button className="w-full text-left p-5" onClick={() => setExpandedCard(expandedCard === i ? null : i)}>
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: scoreColor(r.score) }}>
                        {i + 1}
                      </div>

                      {/* Name & file */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-base">{r.name}</div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">{r.filename}</div>
                      </div>

                      {/* Score bar + number */}
                      <div className="w-40 flex-shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Match score</span>
                          <span className="text-sm font-bold" style={{ color: scoreColor(r.score) }}>{r.score}/100</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div className="h-full rounded-full transition-all" style={{ width: `${r.score}%`, background: scoreColor(r.score) }} />
                        </div>
                      </div>

                      {/* Recommendation badge */}
                      <span className={`badge flex-shrink-0 px-3 py-1 text-xs font-semibold
                        ${r.recommendation === "Proceed" ? "bg-teal/10 text-teal" :
                          r.recommendation === "Maybe" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-500"}`}>
                        {r.recommendation === "Proceed" ? "✓ Proceed" :
                         r.recommendation === "Maybe" ? "~ Maybe" : "✕ Pass"}
                      </span>

                      {/* Expand chevron */}
                      <span className={`text-gray-300 transition-transform ${expandedCard === i ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedCard === i && (
                    <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                      <p className="text-sm text-gray-600 leading-relaxed">{r.summary}</p>
                      <div className="grid grid-cols-2 gap-4">
                        {r.strengths?.length > 0 && (
                          <div className="bg-green-50 rounded-xl p-4">
                            <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                              <CheckCircle size={12} /> Strengths
                            </div>
                            <ul className="space-y-1.5">
                              {r.strengths.map((s, j) => (
                                <li key={j} className="text-xs text-green-800 flex items-start gap-2">
                                  <span className="mt-0.5 flex-shrink-0">•</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {r.concerns?.length > 0 && (
                          <div className="bg-amber-50 rounded-xl p-4">
                            <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                              <AlertCircle size={12} /> Areas to probe
                            </div>
                            <ul className="space-y-1.5">
                              {r.concerns.map((c, j) => (
                                <li key={j} className="text-xs text-amber-800 flex items-start gap-2">
                                  <span className="mt-0.5 flex-shrink-0">•</span>{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SINGLE SCORER TAB ── */}
      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Brain size={16} className="text-teal" /> Score a single CV</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Candidate Name (optional)</label>
              <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paste CV text</label>
              <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={12}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                placeholder="Paste the full CV text here..." />
            </div>
            <button onClick={scoreCV} disabled={!cvText || scoring} className="btn-primary w-full flex items-center justify-center gap-2">
              {scoring ? <><Loader2 size={15} className="animate-spin" /> Scoring...</> : <><Brain size={15} /> Score this CV</>}
            </button>
          </div>
          <div>
            {scoreResult && !scoreResult.error ? (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{candidateName || "Candidate"}</h3>
                  <div className="flex items-end gap-1">
                    <div className="text-4xl font-bold" style={{ color: scoreColor(scoreResult.score) }}>{scoreResult.score}</div>
                    <div className="text-gray-400 text-sm mb-1">/100</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${scoreResult.score}%`, background: scoreColor(scoreResult.score) }} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{scoreResult.summary}</p>
                <div className="grid grid-cols-2 gap-3">
                  {scoreResult.strengths?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={12} /> Strengths</div>
                      <ul className="space-y-1">{scoreResult.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-green-800 flex gap-2"><span>•</span>{s}</li>)}</ul>
                    </div>
                  )}
                  {scoreResult.concerns?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><AlertCircle size={12} /> Areas to probe</div>
                      <ul className="space-y-1">{scoreResult.concerns.map((c: string, i: number) => <li key={i} className="text-xs text-amber-800 flex gap-2"><span>•</span>{c}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            ) : scoreResult?.error ? (
              <div className="card border-red-100"><p className="text-red-500 text-sm">{scoreResult.error}</p></div>
            ) : (
              <div className="card border-dashed text-center py-20">
                <Brain size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">Paste a CV on the left and click Score</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
