"use client"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, MapPin, DollarSign, Brain, Upload,
  X, Star, AlertCircle, CheckCircle, Loader2,
  LayoutGrid, FileText, Zap, UserPlus, Users, GripVertical
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import type { Mandate, Application } from "@/lib/types"

const STAGES = ["new", "screening", "interview", "shortlisted", "offered", "placed"]
const STAGE_LABELS: Record<string, string> = {
  new: "New", screening: "Screening", interview: "Interview",
  shortlisted: "Shortlisted", offered: "Offered", placed: "Placed"
}
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
  email: string | null
  phone: string | null
  current_title: string | null
  current_company: string | null
  location: string | null
  cv_text: string
  score: number
  summary: string
  strengths: string[]
  concerns: string[]
  recommendation: string
  added?: boolean
  adding?: boolean
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
  const [addingAll, setAddingAll] = useState(false)
  const [draggingApp, setDraggingApp] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function loadData() {
    const { data: m } = await supabase.from("mandates").select("*").eq("id", id).single()
    if (m) setMandate(m)
    const { data: apps } = await supabase
      .from("applications")
      .select("*, candidate:candidates(*)")
      .eq("mandate_id", id)
      .order("ai_score", { ascending: false })
    setApplications(apps || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  async function moveStage(appId: string, newStage: string) {
    await supabase.from("applications").update({ stage: newStage }).eq("id", appId)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage as any } : a))
  }

  async function scoreCV() {
    if (!cvText || !mandate) return
    setScoring(true); setScoreResult(null)
    try {
      const res = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      setScoreResult(await res.json())
    } catch { setScoreResult({ error: "Scoring failed." }) }
    setScoring(false)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i))
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...dropped.filter(f => !names.has(f.name))] })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...selected.filter(f => !names.has(f.name))] })
  }

  async function runBulkScore() {
    if (!files.length || !mandate) return
    setBulkProcessing(true); setBulkResults([]); setBulkProgress(0)
    const cvs: { filename: string; text: string }[] = []
    for (let i = 0; i < files.length; i++) {
      setBulkStatus(`Reading ${i + 1} of ${files.length}: ${files[i].name}`)
      setBulkProgress(Math.round((i / files.length) * 50))
      const formData = new FormData()
      formData.append("file", files[i])
      try {
        const res = await fetch("/api/extract-cv", { method: "POST", body: formData })
        const data = await res.json()
        cvs.push({ filename: files[i].name, text: data.text || "" })
      } catch { cvs.push({ filename: files[i].name, text: "" }) }
    }
    setBulkStatus(`AI scoring all ${files.length} candidates...`); setBulkProgress(65)
    try {
      const res = await fetch("/api/bulk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvs, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      const data = await res.json()
      setBulkResults((data.results || []).map((r: BulkResult) => ({ ...r, added: false, adding: false })))
    } catch { setBulkResults([]) }
    setBulkProgress(100); setBulkStatus(""); setBulkProcessing(false)
  }

  async function addToPipeline(idx: number) {
    const r = bulkResults[idx]
    if (!mandate || r.added || r.adding) return
    setBulkResults(prev => prev.map((item, i) => i === idx ? { ...item, adding: true } : item))
    try {
      const safeName = r.name === "Unknown" ? r.filename.replace(/\.[^.]+$/, "") : r.name
      const safeEmail = r.email || `${safeName.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@pending.com`

      const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .insert([{
          name: safeName,
          email: safeEmail,
          phone: r.phone,
          current_title: r.current_title,
          current_company: r.current_company,
          location: r.location,
          cv_text: r.cv_text,
          source: "direct",
          tags: [],
          notes: `Added from bulk upload for ${mandate.title}`
        }])
        .select().single()

      if (candError) throw candError

      const { error: appError } = await supabase.from("applications").insert([{
        candidate_id: candidate.id, mandate_id: id, stage: "new",
        ai_score: r.score, ai_summary: r.summary,
        ai_strengths: r.strengths, ai_concerns: r.concerns,
      }])
      if (appError) throw appError

      setBulkResults(prev => prev.map((item, i) => i === idx ? { ...item, adding: false, added: true } : item))
      loadData()
    } catch {
      setBulkResults(prev => prev.map((item, i) => i === idx ? { ...item, adding: false } : item))
    }
  }

  async function addAllProceed() {
    setAddingAll(true)
    const indexes = bulkResults.map((r, i) => ({ r, i })).filter(({ r }) => r.recommendation === "Proceed" && !r.added).map(({ i }) => i)
    for (const idx of indexes) await addToPipeline(idx)
    setAddingAll(false)
  }

  const byStage = (stage: string) => applications.filter(a => a.stage === stage)
  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"
  const proceed = bulkResults.filter(r => r.recommendation === "Proceed").length
  const maybe = bulkResults.filter(r => r.recommendation === "Maybe").length
  const pass = bulkResults.filter(r => r.recommendation === "Pass").length
  const addedCount = bulkResults.filter(r => r.added).length

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
          { id: "pipeline", icon: LayoutGrid, label: `Pipeline${applications.length > 0 ? ` (${applications.length})` : ""}` },
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

      {/* ── PIPELINE with drag & drop ── */}
      {tab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => (
              <div key={stage}
                className={`w-56 flex-shrink-0 rounded-2xl p-2 transition-colors ${dragOverStage === stage ? "bg-teal/5 ring-2 ring-teal/20" : "bg-gray-50"}`}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage) }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={async e => {
                  e.preventDefault()
                  setDragOverStage(null)
                  if (draggingApp) await moveStage(draggingApp, stage)
                  setDraggingApp(null)
                }}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className={`badge ${STAGE_COLORS[stage]} text-xs`}>{STAGE_LABELS[stage]}</span>
                  <span className="text-xs text-gray-400 font-medium">{byStage(stage).length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {byStage(stage).map(app => (
                    <div key={app.id}
                      draggable
                      onDragStart={() => setDraggingApp(app.id)}
                      onDragEnd={() => setDraggingApp(null)}
                      className={`bg-white rounded-xl p-3 border transition-all
                        ${draggingApp === app.id ? "opacity-40 shadow-lg scale-95 cursor-grabbing" : "border-gray-100 shadow-sm hover:shadow-md hover:border-teal/20"}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={12} className="text-gray-300 mt-0.5 flex-shrink-0 cursor-grab" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/internal/candidates/${(app as any).candidate?.id}`}
                            onClick={e => e.stopPropagation()}
                            className="font-medium text-sm text-gray-900 hover:text-teal transition-colors truncate block">
                            {(app as any).candidate?.name || "Unknown"}
                          </Link>
                          {(app as any).candidate?.current_title && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">{(app as any).candidate.current_title}</div>
                          )}
                          {(app as any).candidate?.current_company && (
                            <div className="text-xs text-gray-300 truncate">{(app as any).candidate.current_company}</div>
                          )}
                          {app.ai_score && (
                            <div className="mt-2 flex items-center gap-1">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs font-semibold" style={{ color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-50 flex gap-1">
                        {STAGES.filter(s => s !== stage).slice(0, 3).map(s => (
                          <button key={s} onClick={() => moveStage(app.id, s)}
                            className="text-xs text-gray-300 hover:text-teal transition-colors truncate">
                            → {STAGE_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {byStage(stage).length === 0 && (
                    <div className={`border-2 border-dashed rounded-xl h-16 flex items-center justify-center transition-colors
                      ${dragOverStage === stage ? "border-teal/40 bg-teal/5" : "border-gray-200"}`}>
                      <span className="text-xs text-gray-300">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD ── */}
      {tab === "bulk" && (
        <div className="grid grid-cols-5 gap-5 items-start">
          <div className="col-span-2 space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => !bulkProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all
                ${dragOver ? "border-teal bg-teal/5" : "border-gray-200 hover:border-teal/40 hover:bg-gray-50"}
                ${bulkProcessing ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
              <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center mx-auto mb-3">
                <Upload size={22} className="text-teal" />
              </div>
              <p className="text-gray-700 font-semibold">Drop CVs here</p>
              <p className="text-gray-400 text-sm mt-1">or click to browse</p>
              <p className="text-gray-300 text-xs mt-2">PDF, Word, TXT · Multiple files</p>
            </div>

            {files.length > 0 && (
              <div className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{files.length} file{files.length > 1 ? "s" : ""} queued</span>
                  <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 rounded-lg group">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={12} className="text-teal flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate">{f.name}</span>
                      </div>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {bulkProcessing ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin text-teal flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{bulkStatus}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal rounded-full transition-all duration-700" style={{ width: `${bulkProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center">{bulkProgress}%</p>
                  </div>
                ) : (
                  <button onClick={runBulkScore} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                    <Zap size={14} /> Score {files.length} CV{files.length > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            )}

            {bulkResults.length > 0 && (
              <div className="card p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch summary</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-teal/5 rounded-xl p-3">
                    <div className="text-xl font-bold text-teal">{proceed}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Proceed</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <div className="text-xl font-bold text-amber-600">{maybe}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Maybe</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xl font-bold text-gray-400">{pass}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pass</div>
                  </div>
                </div>
                {addedCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-teal bg-teal/5 rounded-lg px-3 py-2">
                    <CheckCircle size={12} /> {addedCount} added to pipeline
                  </div>
                )}
                {proceed > 0 && bulkResults.filter(r => r.recommendation === "Proceed" && !r.added).length > 0 && (
                  <button onClick={addAllProceed} disabled={addingAll}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                    {addingAll ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : <><Users size={13} /> Add all {proceed} Proceed</>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="col-span-3 space-y-3">
            {bulkResults.length === 0 && !bulkProcessing && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Brain size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium">Results will appear here</p>
                <p className="text-gray-300 text-sm mt-1">Upload CVs on the left and click Score</p>
              </div>
            )}

            {bulkResults.map((r, i) => (
              <div key={i} className={`bg-white rounded-2xl border overflow-hidden ${r.added ? "border-teal/30" : "border-gray-100 shadow-sm"}`}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: scoreColor(r.score) }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{r.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      {r.current_title && <span>{r.current_title}</span>}
                      {r.current_company && <span className="text-gray-300">@ {r.current_company}</span>}
                    </div>
                    <div className="text-xs text-gray-300 flex items-center gap-2 mt-0.5">
                      {r.email && <span>{r.email}</span>}
                      {r.phone && <span>· {r.phone}</span>}
                      {r.location && <span>· {r.location}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold leading-none" style={{ color: scoreColor(r.score) }}>{r.score}</div>
                    <div className="text-xs text-gray-400">/100</div>
                  </div>
                  <span className={`badge text-xs font-semibold px-2.5 py-1 flex-shrink-0
                    ${r.recommendation === "Proceed" ? "bg-teal/10 text-teal" : r.recommendation === "Maybe" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.recommendation === "Proceed" ? "✓ Proceed" : r.recommendation === "Maybe" ? "~ Maybe" : "✕ Pass"}
                  </span>
                  {r.added ? (
                    <span className="flex items-center gap-1 text-teal text-xs font-medium flex-shrink-0"><CheckCircle size={13} /> Added</span>
                  ) : (
                    <button onClick={() => addToPipeline(i)} disabled={r.adding}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/30 text-teal text-xs font-medium hover:bg-teal/5 transition-all disabled:opacity-50">
                      {r.adding ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                      {r.adding ? "Adding..." : "Add to pipeline"}
                    </button>
                  )}
                </div>
                <div className="px-4 pb-2">
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: scoreColor(r.score) }} />
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{r.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                  {r.strengths?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={11} /> Strengths</div>
                      <ul className="space-y-1">
                        {r.strengths.map((s, j) => <li key={j} className="text-xs text-green-800 flex gap-2"><span className="flex-shrink-0">•</span>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.concerns?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><AlertCircle size={11} /> Areas to probe</div>
                      <ul className="space-y-1">
                        {r.concerns.map((c, j) => <li key={j} className="text-xs text-amber-800 flex gap-2"><span className="flex-shrink-0">•</span>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SINGLE SCORER ── */}
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
              <div className="card"><p className="text-red-500 text-sm">{scoreResult.error}</p></div>
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
