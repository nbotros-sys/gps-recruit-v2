"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import Image from "next/image"
import { Loader2, LogOut, Star, MessageSquare, Calendar, X, FileText, ExternalLink, ChevronRight, CheckCircle } from "lucide-react"

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  shortlisted: { label: "Shortlisted", color: "bg-blue-50 text-blue-700" },
  interview:   { label: "Interview",   color: "bg-amber-50 text-amber-700" },
  offered:     { label: "Offered",     color: "bg-purple-50 text-purple-700" },
  placed:      { label: "Placed",      color: "bg-green-50 text-green-700" },
}

const INTERVIEW_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:         { label: "Pending",   color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Scheduling", color: "bg-amber-100 text-amber-700" },
  done:        { label: "Completed", color: "bg-green-100 text-green-700" },
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
  const colors = ["#028090","#5f6b7a","#7c3aed","#0369a1","#065f46","#92400e"]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: size * 0.35, fontWeight: 600, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// Score tier color — gives the badge real meaning (strength at a glance), not just decoration
function scoreColor(score: number) {
  if (score >= 80) return "#028090"
  if (score >= 60) return "#0a1f24"
  return "#5c6663"
}

// Hexagon score badge — the one place this design borrows GPS's brand mark geometry
function HexScoreBadge({ score, size = 46 }: { score: number; size?: number }) {
  const fontSize = size >= 40 ? 26 : 22
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill={scoreColor(score)} />
      <text x="50" y={size >= 40 ? 58 : 60} textAnchor="middle" fontFamily="var(--font-plex-mono)" fontWeight="600" fontSize={fontSize} fill="#fff">{score}</text>
    </svg>
  )
}

export default function ClientPortal() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"candidates" | "commentary" | "interviews">("candidates")
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [feedbackApp, setFeedbackApp] = useState<any>(null)
  const [interviewApp, setInterviewApp] = useState<any>(null)
  const [rejectApp, setRejectApp] = useState<any>(null)
  const [feedbackRating, setFeedbackRating] = useState("")
  const [feedbackComment, setFeedbackComment] = useState("")
  const [interviewDates, setInterviewDates] = useState("")
  const [interviewNotes, setInterviewNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [animatedScore, setAnimatedScore] = useState(0)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch("/api/client-portal")
    if (res.status === 401) { window.location.href = "/client/login"; return }
    const d = await res.json()
    if (d.error) { setError(d.error); setLoading(false); return }
    setData(d)
    setLoading(false)
    animateTopScore(d.applications || [])
  }

  // Counts the hero score up from 0 to its real value, like a readout settling into place
  function animateTopScore(applications: any[]) {
    const scored = applications.filter((a: any) => a.ai_score)
    if (!scored.length) { setAnimatedScore(0); return }
    const target = scored.reduce((best: any, a: any) => a.ai_score > best.ai_score ? a : best).ai_score
    const duration = 650
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = "/client/login"
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feedback",
          application_id: feedbackApp.id,
          mandate_id: data.mandate.id,
          client_user_id: data.clientUser.id,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSubmitError(result?.error || "Something went wrong — please try again.")
        setSubmitting(false)
        return
      }
      setFeedbackApp(null); setFeedbackRating(""); setFeedbackComment("")
      setSubmitSuccess("Feedback submitted — thank you!")
      load()
      setTimeout(() => setSubmitSuccess(""), 4000)
    } catch {
      setSubmitError("Couldn't reach the server — please try again.")
    }
    setSubmitting(false)
  }

  async function submitReject(app: any) {
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          application_id: app.id,
          mandate_id: data.mandate.id,
          client_user_id: data.clientUser.id,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSubmitError(result?.error || "Something went wrong — please try again.")
        setSubmitting(false)
        return
      }
      setRejectApp(null)
      setSelectedApp(null)
      setSubmitSuccess("Candidate removed from your shortlist.")
      load()
      setTimeout(() => setSubmitSuccess(""), 4000)
    } catch {
      setSubmitError("Couldn't reach the server — please try again.")
    }
    setSubmitting(false)
  }


  async function submitInterview(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "interview_request",
          application_id: interviewApp.id,
          mandate_id: data.mandate.id,
          client_user_id: data.clientUser.id,
          preferred_dates: interviewDates,
          notes: interviewNotes,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSubmitError(result?.error || "Something went wrong — please try again.")
        setSubmitting(false)
        return
      }
      setInterviewApp(null); setInterviewDates(""); setInterviewNotes("")
      setSubmitSuccess("Interview request sent to GPS!")
      load()
      setTimeout(() => setSubmitSuccess(""), 4000)
    } catch {
      setSubmitError("Couldn't reach the server — please try again.")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faf9" }}>
      <Loader2 size={24} className="animate-spin text-teal" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faf9" }}>
      <div className="text-center space-y-3">
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={() => { window.location.href = "/client/login" }} className="text-sm text-teal hover:underline">Back to login</button>
      </div>
    </div>
  )

  const { mandate, applications, commentary, feedback, interviews, clientUser } = data
  const existingFeedback = (appId: string) => feedback.find((f: any) => f.application_id === appId)
  const existingInterview = (appId: string) => interviews.find((i: any) => i.application_id === appId)
  const scoredApps = applications.filter((a: any) => a.ai_score)
  const topApp = scoredApps.length ? scoredApps.reduce((best: any, a: any) => a.ai_score > best.ai_score ? a : best) : null

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", fontFamily: "var(--font-manrope)" }}>

      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0f2b30 60%, #0a2326 100%)", position: "relative", overflow: "hidden" }} className="px-7 py-6">
        <svg className="ambient-drift" style={{ position: "absolute", top: -40, right: -60 }} width="320" height="320" viewBox="0 0 320 320">
          <polygon points="160,20 280,90 280,230 160,300 40,230 40,90" fill="none" stroke="#5fb3a8" strokeWidth="2" />
          <polygon points="160,60 240,105 240,215 160,260 80,215 80,105" fill="none" stroke="#5fb3a8" strokeWidth="1.5" />
        </svg>
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image src="/gps-logo.png" alt="GPS" fill className="object-contain" />
            </div>
            <div className="w-px h-7 bg-white/10" />
            <div>
              <div className="text-white text-base font-semibold leading-tight" style={{ letterSpacing: "-0.01em" }}>{clientUser.company_name}</div>
              <div className="text-white/40 text-xs mt-0.5" style={{ letterSpacing: "0.02em" }}>{mandate?.title}{mandate?.location ? ` · ${mandate.location}` : ""}</div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <div className="text-white/32 text-[10px] uppercase" style={{ letterSpacing: "0.12em" }}>Managed by</div>
              <div className="text-white/75 text-xs font-medium mt-0.5">GPS Recruitment</div>
            </div>
            <button onClick={signOut} className="flex items-center gap-1.5 text-white/35 hover:text-white/60 text-xs transition-colors">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-7">

        {/* Hero metric + supporting stats */}
        <div className="bg-white border border-gray-100 rounded-2xl px-9 py-7 mb-7 flex items-end gap-10 flex-wrap fade-slide-up" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div>
            <div className="text-[11px] uppercase font-semibold text-gray-400 mb-1.5" style={{ letterSpacing: "0.12em" }}>Top GPS Score</div>
            <div className="flex items-baseline gap-1.5">
              <span style={{ fontFamily: "var(--font-plex-mono)", fontSize: 44, fontWeight: 600, color: "#A9802F", letterSpacing: "-0.02em" }}>{topApp ? animatedScore : "—"}</span>
              <span className="text-sm text-gray-400">/ 100</span>
            </div>
            {topApp && (
              <div className="text-xs text-gray-400 mt-1">{topApp.candidate.name} · {topApp.candidate.current_title}</div>
            )}
          </div>
          <div className="flex gap-8 pb-2 flex-wrap">
            {[
              { label: "Candidates", value: applications.length },
              { label: "Feedback given", value: feedback.length },
              { label: "Interviews", value: interviews.length },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[10px] uppercase text-gray-400 mb-1" style={{ letterSpacing: "0.1em" }}>{s.label}</div>
                <div className="text-xl font-semibold text-gray-900">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">{submitSuccess}</div>
        )}
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{submitError}</div>
        )}

        {/* Tabs */}
        <div className="flex items-center border-b border-gray-100 mb-5">
          {[
            { key: "candidates", label: "Candidates", count: applications.length },
            { key: "commentary", label: "Market commentary", count: commentary.length },
            { key: "interviews", label: "Interview requests", count: interviews.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${tab === t.key ? "border-teal text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-400"}`}>{t.count}</span>
              )}
            </button>
          ))}

        </div>

        {/* ── CANDIDATES ── */}
        {tab === "candidates" && (
          <div className="flex gap-4">
            {/* List */}
            <div className={`flex flex-col gap-2 ${selectedApp ? "w-72 flex-shrink-0" : "flex-1"}`}>
              {applications.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Star size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No candidates shortlisted yet</p>
                  <p className="text-xs mt-1 text-gray-400">GPS will notify you when candidates are ready for review.</p>
                </div>
              ) : applications.map((app: any, idx: number) => {
                const c = app.candidate
                const stageInfo = STAGE_LABELS[app.stage] || { label: app.stage, color: "bg-gray-100 text-gray-500" }
                const isSelected = selectedApp?.id === app.id
                const hasFeedback = existingFeedback(app.id)
                return (
                  <div key={app.id} onClick={() => setSelectedApp(isSelected ? null : app)}
                    className={`bg-white border rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all fade-slide-up hover:-translate-y-0.5 ${isSelected ? "border-teal shadow-sm" : "border-gray-100 hover:border-gray-200 hover:shadow-md"}`}
                    style={{ animationDelay: `${idx * 70}ms` }}>
                    {app.ai_score ? <HexScoreBadge score={app.ai_score} size={42} /> : <Avatar name={c.name} size={40} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{c.current_title}{c.current_company ? ` · ${c.current_company}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageInfo.color}`}>{stageInfo.label}</span>
                      {hasFeedback && <MessageSquare size={11} className="text-teal" />}
                      <ChevronRight size={13} className={`text-gray-300 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Slide panel */}
            {selectedApp && (
              <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {selectedApp.ai_score ? <HexScoreBadge score={selectedApp.ai_score} size={40} /> : <Avatar name={selectedApp.candidate.name} size={36} />}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedApp.candidate.name}</p>
                      <p className="text-xs text-gray-400">{selectedApp.candidate.current_title}{selectedApp.candidate.current_company ? ` · ${selectedApp.candidate.current_company}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${STAGE_LABELS[selectedApp.stage]?.color || "bg-gray-100 text-gray-500"}`}>
                      {STAGE_LABELS[selectedApp.stage]?.label || selectedApp.stage}
                    </span>
                    <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600 p-1 ml-1">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-5 space-y-5">
                  {/* GPS assessment */}
                  {(selectedApp.ai_summary || selectedApp.ai_strengths?.length > 0 || selectedApp.ai_concerns?.length > 0) && (
                    <div className="bg-teal/5 border border-teal/15 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-teal uppercase tracking-wider">GPS assessment</p>
                      {selectedApp.ai_summary && (
                        <p className="text-sm text-gray-700 leading-relaxed">{selectedApp.ai_summary}</p>
                      )}
                      {selectedApp.ai_strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1"><CheckCircle size={11} /> Strengths</p>
                          <ul className="space-y-1">
                            {selectedApp.ai_strengths.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-green-500 mt-0.5">•</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedApp.ai_concerns?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1.5">Considerations</p>
                          <ul className="space-y-1">
                            {selectedApp.ai_concerns.map((c: string, i: number) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">•</span> {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CV */}
                  {(selectedApp.candidate.cv_pdf_url || selectedApp.candidate.cv_file_url) ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CV</p>
                        <a href={selectedApp.candidate.cv_pdf_url || selectedApp.candidate.cv_file_url}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-teal hover:underline">
                          <ExternalLink size={11} /> Open full screen
                        </a>
                      </div>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        {selectedApp.candidate.cv_pdf_url ? (
                          <iframe src={selectedApp.candidate.cv_pdf_url} className="w-full" style={{ height: 420 }} title="CV Preview" />
                        ) : (
                          <div className="bg-gray-50 p-8 text-center">
                            <FileText size={24} className="mx-auto mb-2 text-gray-300" />
                            <a href={selectedApp.candidate.cv_file_url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-teal hover:underline flex items-center justify-center gap-1.5">
                              <ExternalLink size={13} /> View CV
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                      <FileText size={24} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">No CV uploaded yet</p>
                    </div>
                  )}

                  {/* Feedback */}
                  {existingFeedback(selectedApp.id) ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1.5">
                        <MessageSquare size={12} /> Your feedback
                      </p>
                      <p className="text-xs text-green-700 leading-relaxed">{existingFeedback(selectedApp.id).feedback_text}</p>
                    </div>
                  ) : feedbackApp?.id === selectedApp.id ? (
                    <form onSubmit={submitFeedback} className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-700">Leave feedback on {selectedApp.candidate.name.split(" ")[0]}</p>
                      <select value={feedbackRating} onChange={e => setFeedbackRating(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30">
                        <option value="">Overall impression</option>
                        <option value="Strong yes">Strong yes</option>
                        <option value="Yes">Yes</option>
                        <option value="Maybe">Maybe</option>
                        <option value="No">No</option>
                      </select>
                      <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)}
                        placeholder="Share your thoughts..." rows={3} required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={submitting}
                          className="flex items-center gap-1.5 text-sm text-white px-4 py-2 rounded-lg font-semibold"
                          style={{ background: "#028090" }}>
                          {submitting ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />} Submit
                        </button>
                        <button type="button" onClick={() => setFeedbackApp(null)} className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancel</button>
                      </div>
                    </form>
                  ) : null}

                  {/* Interview request */}
                  {existingInterview(selectedApp.id) ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      {existingInterview(selectedApp.id).confirmed_date ? (
                        <>
                          <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1.5">
                            <Calendar size={12} /> Interview confirmed
                          </p>
                          <p className="text-sm text-blue-800 font-medium">
                            {new Date(existingInterview(selectedApp.id).confirmed_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                            {existingInterview(selectedApp.id).confirmed_time && ` · ${existingInterview(selectedApp.id).confirmed_time}`}
                            {existingInterview(selectedApp.id).format && ` · ${existingInterview(selectedApp.id).format}`}
                          </p>
                          {existingInterview(selectedApp.id).interviewer && (
                            <p className="text-xs text-blue-600 mt-1">With {existingInterview(selectedApp.id).interviewer}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1.5">
                            <Calendar size={12} /> Interview requested
                          </p>
                          <p className="text-xs text-blue-600">{existingInterview(selectedApp.id).preferred_dates}</p>
                        </>
                      )}
                      <span className={`text-[10px] font-semibold mt-2 inline-block px-2 py-0.5 rounded-full ${(INTERVIEW_STATUS_LABELS[existingInterview(selectedApp.id).status]?.color) || "bg-blue-100 text-blue-700"}`}>
                        {INTERVIEW_STATUS_LABELS[existingInterview(selectedApp.id).status]?.label || existingInterview(selectedApp.id).status}
                      </span>
                    </div>
                  ) : interviewApp?.id === selectedApp.id ? (
                    <form onSubmit={submitInterview} className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-700">Request interview with {selectedApp.candidate.name.split(" ")[0]}</p>
                      <input type="text" value={interviewDates} onChange={e => setInterviewDates(e.target.value)}
                        placeholder="Preferred dates (e.g. Mon 7 Jul afternoon)" required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30" />
                      <textarea value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)}
                        placeholder="Any notes for GPS (format, duration, location...)" rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={submitting}
                          className="flex items-center gap-1.5 text-sm text-white px-4 py-2 rounded-lg font-semibold"
                          style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />} Send request
                        </button>
                        <button type="button" onClick={() => setInterviewApp(null)} className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancel</button>
                      </div>
                    </form>
                  ) : null}
                </div>

                {/* Reject confirm */}
                {rejectApp?.id === selectedApp.id && (
                  <div className="px-5 py-4 border-t border-gray-100 bg-red-50">
                    <p className="text-sm text-red-700 font-medium mb-1">Remove {selectedApp.candidate.name.split(" ")[0]} from your shortlist?</p>
                    <p className="text-xs text-red-500 mb-3">GPS will be notified. This can't be undone from your side.</p>
                    <div className="flex gap-2">
                      <button onClick={() => submitReject(selectedApp)} disabled={submitting}
                        className="flex items-center gap-1.5 text-sm text-white px-4 py-2 rounded-lg font-semibold"
                        style={{ background: "#dc2626" }}>
                        {submitting ? <Loader2 size={12} className="animate-spin" /> : null} Confirm reject
                      </button>
                      <button onClick={() => setRejectApp(null)} className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!feedbackApp && !interviewApp && !rejectApp && (
                  <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                    {!existingFeedback(selectedApp.id) && (
                      <button onClick={() => setFeedbackApp(selectedApp)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
                        <MessageSquare size={14} /> Leave feedback
                      </button>
                    )}
                    {!existingInterview(selectedApp.id) && (
                      <button onClick={() => setInterviewApp(selectedApp)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                        <Calendar size={14} /> Request interview
                      </button>
                    )}
                    <button onClick={() => setRejectApp(selectedApp)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 rounded-xl text-sm text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── COMMENTARY ── */}
        {tab === "commentary" && (
          <div className="space-y-4">
            {commentary.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileText size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No market commentary yet</p>
                <p className="text-xs mt-1 text-gray-400">GPS will share market insights as your search progresses.</p>
              </div>
            ) : commentary.map((c: any) => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">GPS Market Update</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-teal hover:underline border border-teal/20 rounded-lg px-3 py-1.5 bg-teal/5">
                      <FileText size={12} /> View PDF
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{c.commentary_text}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── INTERVIEWS ── */}
        {tab === "interviews" && (
          <div className="space-y-3">
            {interviews.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No interview requests yet</p>
                <p className="text-xs mt-1 text-gray-400">Request interviews from the Candidates tab.</p>
              </div>
            ) : interviews.map((i: any) => (
              <div key={i.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{i.application?.candidate?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{i.application?.candidate?.current_title}</p>
                  <p className="text-xs text-gray-600 mt-2 font-medium">{i.preferred_dates}</p>
                  {i.notes && <p className="text-xs text-gray-400 mt-1">{i.notes}</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${(INTERVIEW_STATUS_LABELS[i.status]?.color) || "bg-blue-100 text-blue-700"}`}>
                    {INTERVIEW_STATUS_LABELS[i.status]?.label || i.status}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(i.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
