"use client"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, MapPin, DollarSign, Brain, Upload,
  X, Star, AlertCircle, CheckCircle, Loader2,
  LayoutGrid, ChevronDown, FileText, Trash2, Zap
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
  rejected: "bg-red-100 text-red-600",
}

const REC_COLORS: Record<string, string> = {
  Proceed: "bg-green-100 text-green-700",
  Maybe: "bg-amber-100 text-amber-700",
  Pass: "bg-red-100 text-red-600",
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

  // Single CV scorer
  const [scoring, setScoring] = useState(false)
  const [cvText, setCvText] = useState("")
  const [candidateName, setCandidateName] = useState("")
  const [scoreResult, setScoreResult] = useState<any>(null)

  // Bulk uploader
  const [files, setFiles] = useState<File[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [bulkProgress, setBulkProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
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
      const data = await res.json()
      setScoreResult(data)
    } catch {
      setScoreResult({ error: "Scoring failed. Please try again." })
    }
    setScoring(false)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.name.match(/\.(pdf|doc|docx|txt)$/i)
    )
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

    // Extract text from all files
    const cvs: { filename: string; text: string }[] = []
    for (let i = 0; i < files.length; i++) {
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

    setBulkProgress(60)

    // Batch score all CVs
    try {
      const res = await fetch("/api/bulk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvs, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      const data = await res.json()
      setBulkResults(data.results || [])
    } catch {
      setBulkResults([])
    }

    setBulkProgress(100)
    setBulkProcessing(false)
  }

  const byStage = (stage: string) => applications.filter(a => a.stage === stage)

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

      {/* Pipeline Tab */}
      {tab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => (
              <div key={stage} className="w-56 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${STAGE_COLORS[stage]} capitalize text-xs`}>{stage}</span>
                  <span className="text-xs text-gray-400 font-medium">{byStage(stage).length}</span>
                </div>
                <div className="space-y-2 min-h-[120px]">
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

      {/* Bulk Upload Tab */}
      {tab === "bulk" && (
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
              ${dragOver ? "border-teal bg-teal/5" : "border-gray-200 hover:border-teal/50 hover:bg-gray-50"}`}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect} className="hidden" />
            <Upload size={32} className={`mx-auto mb-3 ${dragOver ? "text-teal" : "text-gray-300"}`} />
            <p className="text-gray-600 font-medium">Drop CVs here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">PDF, Word (.doc/.docx), or TXT — multiple files supported</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">{files.length} file{files.length > 1 ? "s" : ""} ready</span>
                <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-red-500">Clear all</button>
              </div>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-teal" />
                    <span className="text-sm text-gray-700">{f.name}</span>
                    <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={runBulkScore} disabled={bulkProcessing}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2 py-3">
                {bulkProcessing
                  ? <><Loader2 size={16} className="animate-spin" /> Processing {files.length} CVs...</>
                  : <><Zap size={16} /> Score All {files.length} CVs Against JD</>
                }
              </button>
              {bulkProcessing && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Extracting & scoring...</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-teal rounded-full transition-all duration-500" style={{ width: `${bulkProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {bulkResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Results — ranked by fit</h3>
                <span className="text-sm text-gray-500">{bulkResults.length} candidates scored</span>
              </div>
              {bulkResults.map((r, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: r.score >= 70 ? "#028090" : r.score >= 50 ? "#d97706" : "#9ca3af" }}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.filename}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`badge ${REC_COLORS[r.recommendation] || "bg-gray-100 text-gray-600"}`}>
                        {r.recommendation}
                      </span>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{
                          color: r.score >= 70 ? "#028090" : r.score >= 50 ? "#d97706" : "#9ca3af"
                        }}>{r.score}</div>
                        <div className="text-xs text-gray-400">/ 100</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full" style={{
                      width: `${r.score}%`,
                      background: r.score >= 70 ? "#028090" : r.score >= 50 ? "#d97706" : "#9ca3af"
                    }} />
                  </div>
                  <p className="text-sm text-gray-600 mt-3">{r.summary}</p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {r.strengths?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <CheckCircle size={11} className="text-green-500" /> Strengths
                        </div>
                        <ul className="space-y-0.5">
                          {r.strengths.map((s, j) => (
                            <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-green-400 mt-0.5">•</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.concerns?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <AlertCircle size={11} className="text-amber-500" /> Areas to probe
                        </div>
                        <ul className="space-y-0.5">
                          {r.concerns.map((c, j) => (
                            <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-amber-400 mt-0.5">•</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Single AI Scorer Tab */}
      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Brain size={16} className="text-teal" /> Score a CV</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Candidate Name</label>
              <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paste CV Text</label>
              <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={10}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                placeholder="Paste CV text here..." />
            </div>
            <button onClick={scoreCV} disabled={!cvText || scoring}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {scoring ? <><Loader2 size={15} className="animate-spin" /> Scoring...</> : <><Brain size={15} /> Score this CV</>}
            </button>
          </div>
          <div>
            {scoreResult && !scoreResult.error ? (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{candidateName || "Candidate"}</h3>
                  <div className="flex items-end gap-1">
                    <div className="text-3xl font-bold" style={{ color: scoreResult.score >= 70 ? "#028090" : scoreResult.score >= 50 ? "#d97706" : "#dc2626" }}>
                      {scoreResult.score}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">/100</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${scoreResult.score}%`, background: scoreResult.score >= 70 ? "#028090" : scoreResult.score >= 50 ? "#d97706" : "#dc2626" }} />
                </div>
                <p className="text-sm text-gray-600">{scoreResult.summary}</p>
                {scoreResult.strengths?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Strengths</div>
                    <ul className="space-y-1">{scoreResult.strengths.map((s: string, i: number) => <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-green-400">•</span>{s}</li>)}</ul>
                  </div>
                )}
                {scoreResult.concerns?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><AlertCircle size={12} className="text-amber-500" /> Areas to probe</div>
                    <ul className="space-y-1">{scoreResult.concerns.map((c: string, i: number) => <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-amber-400">•</span>{c}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : scoreResult?.error ? (
              <div className="card"><p className="text-red-500 text-sm">{scoreResult.error}</p></div>
            ) : (
              <div className="card border-dashed text-center py-16">
                <Brain size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">Paste a CV and click Score</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
