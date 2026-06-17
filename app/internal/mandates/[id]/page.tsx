"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Briefcase, MapPin, DollarSign, Brain, Kanban, Upload, X, Star, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import type { Mandate, Application, Candidate } from "@/lib/types"

const STAGES = ["new", "screening", "interview", "shortlisted", "offered", "placed", "rejected"]
const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  shortlisted: "bg-teal/10 text-teal",
  offered: "bg-amber-100 text-amber-700",
  placed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
}

export default function MandateDetail() {
  const { id } = useParams()
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [tab, setTab] = useState<"pipeline" | "ai">("pipeline")
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [cvText, setCvText] = useState("")
  const [candidateName, setCandidateName] = useState("")
  const [scoreResult, setScoreResult] = useState<any>(null)
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
    } catch (e) {
      setScoreResult({ error: "Scoring failed. Please try again." })
    }
    setScoring(false)
  }

  const byStage = (stage: string) => applications.filter(a => a.stage === stage)

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>
  if (!mandate) return <div className="text-center py-16 text-gray-400">Mandate not found.</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/internal/mandates" className="text-gray-400 hover:text-teal text-sm flex items-center gap-1 mb-3">
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
          <span className="badge bg-green-100 text-green-700 text-sm">{mandate.status}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "pipeline" ? "bg-white shadow text-teal" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Kanban size={15} /> Pipeline
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "ai" ? "bg-white shadow text-teal" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Brain size={15} /> AI Scorer
        </button>
      </div>

      {/* Pipeline Tab */}
      {tab === "pipeline" && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {STAGES.filter(s => s !== "rejected").map(stage => (
              <div key={stage} className="w-64 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className={`badge ${STAGE_COLORS[stage]} capitalize`}>{stage}</span>
                  <span className="text-xs text-gray-400">{byStage(stage).length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {byStage(stage).map(app => (
                    <div key={app.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <div className="font-medium text-sm text-gray-900">{app.candidate?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{app.candidate?.current_title}</div>
                      {app.ai_score && (
                        <div className="mt-2 flex items-center gap-1">
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-gray-700">{app.ai_score}/100</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {byStage(stage).length === 0 && (
                    <div className="border-2 border-dashed border-gray-100 rounded-xl h-20 flex items-center justify-center">
                      <span className="text-xs text-gray-300">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Scorer Tab */}
      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Brain size={18} className="text-teal" /> Score a CV
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
                  <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paste CV Text</label>
                  <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={10}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                    placeholder="Paste the candidate's CV text here..." />
                </div>
                <button onClick={scoreCV} disabled={!cvText || scoring}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {scoring ? <><Loader2 size={15} className="animate-spin" /> Scoring...</> : <><Brain size={15} /> Score this CV</>}
                </button>
              </div>
            </div>
          </div>

          <div>
            {scoreResult && !scoreResult.error && (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{candidateName || "Candidate"}</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-bold" style={{
                      color: scoreResult.score >= 70 ? "#028090" : scoreResult.score >= 50 ? "#d97706" : "#dc2626"
                    }}>{scoreResult.score}</div>
                    <div className="text-gray-400 text-sm">/100</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${scoreResult.score}%`,
                    background: scoreResult.score >= 70 ? "#028090" : scoreResult.score >= 50 ? "#d97706" : "#dc2626"
                  }} />
                </div>
                <p className="text-sm text-gray-600">{scoreResult.summary}</p>
                {scoreResult.strengths?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><CheckCircle size={14} className="text-green-500" /> Strengths</div>
                    <ul className="space-y-1">
                      {scoreResult.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {scoreResult.concerns?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><AlertCircle size={14} className="text-amber-500" /> Areas to probe</div>
                    <ul className="space-y-1">
                      {scoreResult.concerns.map((c: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {scoreResult?.error && (
              <div className="card border-red-100">
                <p className="text-red-500 text-sm">{scoreResult.error}</p>
              </div>
            )}
            {!scoreResult && (
              <div className="card border-dashed text-center py-12">
                <Brain size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">Paste a CV and click Score to see AI analysis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
