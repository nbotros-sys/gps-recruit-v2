"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import {
  LogOut, Star, CheckCircle, AlertCircle, Download, Eye,
  MessageSquare, Calendar, ChevronDown, ChevronRight, X,
  FileText, BarChart2, Clock, Users
} from "lucide-react"

const CLIENT_STAGES = ["shortlisted", "offered", "placed"]
const STAGE_LABELS: Record<string, string> = {
  shortlisted: "Shortlisted", offered: "Offered", placed: "Placed"
}
const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  shortlisted: { bg: "#f0fdf4", text: "#028090", border: "#a7f3d0" },
  offered:     { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  placed:      { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
}

const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"

export default function ClientPortalPage() {
  const { mandateId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [clientUser, setClientUser] = useState<any>(null)
  const [mandate, setMandate] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [commentary, setCommentary] = useState<any[]>([])
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [drawerTab, setDrawerTab] = useState<"overview" | "feedback" | "interview">("overview")
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackSentiment, setFeedbackSentiment] = useState<"positive" | "neutral" | "negative">("neutral")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const [interviewNotes, setInterviewNotes] = useState("")
  const [submittingInterview, setSubmittingInterview] = useState(false)
  const [interviewDone, setInterviewDone] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [activeTab, setActiveTab] = useState<"pipeline" | "commentary">("pipeline")

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/client/login"); return }

      const { data: cu } = await supabase
        .from("client_users")
        .select("*")
        .eq("email", user.email?.toLowerCase().trim())
        .eq("mandate_id", mandateId)
        .eq("is_active", true)
        .maybeSingle()

      if (!cu) { router.push("/client/login"); return }

      setClientUser(cu)
      setAuthChecked(true)

      // Load mandate
      const { data: m } = await supabase
        .from("mandates")
        .select("id, title, client_name, location, salary_range, status")
        .eq("id", mandateId)
        .single()
      setMandate(m)

      // Load shortlisted+ applications
      const { data: apps } = await supabase
        .from("applications")
        .select("id, stage, ai_score, ai_summary, ai_strengths, ai_concerns, updated_at, candidate:candidates(id, name, current_title, current_company, location, cv_url, cv_pdf_url, cv_file_url)")
        .eq("mandate_id", mandateId)
        .in("stage", CLIENT_STAGES)
        .order("ai_score", { ascending: false })
      setApplications(apps || [])

      // Load commentary
      const { data: comm } = await supabase
        .from("mandate_commentary")
        .select("id, commentary_text, pdf_url, created_at")
        .eq("mandate_id", mandateId)
        .order("created_at", { ascending: false })
      setCommentary(comm || [])

      setLoading(false)
    }
    init()
  }, [mandateId])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = "/client/login"
  }

  async function submitFeedback() {
    if (!feedbackText.trim() || !selectedApp || !clientUser) return
    setSubmittingFeedback(true)
    await supabase.from("client_feedback").insert([{
      mandate_id: mandateId,
      application_id: selectedApp.id,
      client_user_id: clientUser.id,
      feedback_text: feedbackText.trim(),
      sentiment: feedbackSentiment,
    }])
    setFeedbackText("")
    setSubmittingFeedback(false)
    setFeedbackDone(true)
    setTimeout(() => setFeedbackDone(false), 3000)
  }

  async function submitInterviewRequest() {
    if (!selectedApp || !clientUser) return
    setSubmittingInterview(true)
    await supabase.from("client_interview_requests").insert([{
      mandate_id: mandateId,
      application_id: selectedApp.id,
      client_user_id: clientUser.id,
      notes: interviewNotes.trim() || null,
      status: "new",
    }])
    setInterviewNotes("")
    setSubmittingInterview(false)
    setInterviewDone(true)
    setTimeout(() => setInterviewDone(false), 4000)
  }

  function toggleCompare(appId: string) {
    setCompareIds(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId)
        : prev.length < 3 ? [...prev, appId] : prev
    )
  }

  const compareApps = applications.filter(a => compareIds.includes(a.id))
  const byStage = (stage: string) => applications.filter(a => a.stage === stage)

  if (!authChecked || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f4f8f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid #e5e7eb", borderTopColor: "#028090", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading your portal…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <header style={{ background: "#0a1f24", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/gps-logo.png" alt="GPS" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            <div>
              <div style={{ color: "white", fontSize: "14px", fontWeight: 700 }}>GPS Recruitment</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>Client Portal</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>{clientUser?.full_name}</span>
            <button onClick={signOut} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "7px 14px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer" }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>

        {/* Mandate header */}
        {mandate && (
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1f24", marginBottom: "6px" }}>{mandate.title}</h1>
            <div style={{ display: "flex", gap: "16px", color: "#6b7280", fontSize: "14px", flexWrap: "wrap" }}>
              {mandate.client_name && <span>{mandate.client_name}</span>}
              {mandate.location && <span>📍 {mandate.location}</span>}
              {mandate.salary_range && <span>💼 {mandate.salary_range}</span>}
              <span style={{ color: "#028090", fontWeight: 600 }}>{applications.length} candidate{applications.length !== 1 ? "s" : ""} shortlisted</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#e5e7eb", padding: "4px", borderRadius: "12px", width: "fit-content", marginBottom: "24px" }}>
          {[
            { id: "pipeline", label: "Candidates", icon: Users },
            { id: "commentary", label: "GPS Updates", icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 18px", borderRadius: "9px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
                background: activeTab === id ? "white" : "transparent",
                color: activeTab === id ? "#028090" : "#6b7280",
                boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── PIPELINE TAB ── */}
        {activeTab === "pipeline" && (
          <>
            {/* Compare bar */}
            {compareIds.length > 0 && (
              <div style={{ background: "#0a1f24", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
                  {compareIds.length} candidate{compareIds.length > 1 ? "s" : ""} selected for comparison
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  {compareIds.length >= 2 && (
                    <button onClick={() => setShowCompare(true)}
                      style={{ background: "#028090", color: "white", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                      Compare →
                    </button>
                  )}
                  <button onClick={() => setCompareIds([])}
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", cursor: "pointer" }}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            {applications.length === 0 ? (
              <div style={{ background: "white", borderRadius: "16px", padding: "64px 32px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                <Users size={40} style={{ color: "#e5e7eb", margin: "0 auto 16px" }} />
                <p style={{ color: "#6b7280", fontSize: "16px", fontWeight: 600 }}>No candidates shortlisted yet</p>
                <p style={{ color: "#9ca3af", fontSize: "14px", marginTop: "6px" }}>Your GPS consultant will update this as candidates progress through the pipeline.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                {CLIENT_STAGES.filter(s => byStage(s).length > 0).map(stage => (
                  <div key={stage}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 700,
                        background: STAGE_COLORS[stage]?.bg, color: STAGE_COLORS[stage]?.text, border: `1px solid ${STAGE_COLORS[stage]?.border}` }}>
                        {STAGE_LABELS[stage]}
                      </span>
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>{byStage(stage).length} candidate{byStage(stage).length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                      {byStage(stage).map(app => (
                        <div key={app.id} style={{ background: "white", borderRadius: "16px", border: compareIds.includes(app.id) ? "2px solid #028090" : "1px solid #e5e7eb", padding: "20px", cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                          onMouseEnter={e => { if (!compareIds.includes(app.id)) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)" }}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #028090, #3D5A4E)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "15px", flexShrink: 0 }}>
                                {app.candidate?.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#0a1f24", fontSize: "15px" }}>{app.candidate?.name}</div>
                                <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "2px" }}>
                                  {app.candidate?.current_title}{app.candidate?.current_company ? ` @ ${app.candidate.current_company}` : ""}
                                </div>
                              </div>
                            </div>
                            {app.ai_score && (
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: "20px", fontWeight: 700, color: scoreColor(app.ai_score), lineHeight: 1 }}>{app.ai_score}</div>
                                <div style={{ fontSize: "10px", color: "#9ca3af" }}>/100</div>
                              </div>
                            )}
                          </div>

                          {app.ai_score && (
                            <div style={{ height: "3px", background: "#f3f4f6", borderRadius: "99px", marginBottom: "14px" }}>
                              <div style={{ height: "100%", borderRadius: "99px", width: `${app.ai_score}%`, background: scoreColor(app.ai_score) }} />
                            </div>
                          )}

                          {app.ai_summary && (
                            <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, marginBottom: "14px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {app.ai_summary}
                            </p>
                          )}

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button onClick={() => { setSelectedApp(app); setDrawerTab("overview"); setInterviewDone(false); setFeedbackDone(false) }}
                              style={{ flex: 1, padding: "8px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #a7f3d0", color: "#028090", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                              View profile
                            </button>
                            <button onClick={e => { e.stopPropagation(); toggleCompare(app.id) }}
                              style={{ padding: "8px 12px", borderRadius: "8px", border: compareIds.includes(app.id) ? "1px solid #028090" : "1px solid #e5e7eb",
                                background: compareIds.includes(app.id) ? "#028090" : "white", color: compareIds.includes(app.id) ? "white" : "#6b7280",
                                fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                              {compareIds.includes(app.id) ? "✓" : "Compare"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── COMMENTARY TAB ── */}
        {activeTab === "commentary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "720px" }}>
            {commentary.length === 0 ? (
              <div style={{ background: "white", borderRadius: "16px", padding: "48px 32px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                <FileText size={36} style={{ color: "#e5e7eb", margin: "0 auto 12px" }} />
                <p style={{ color: "#6b7280", fontSize: "15px", fontWeight: 600 }}>No updates yet</p>
                <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "6px" }}>GPS will share market insights and search updates here as the mandate progresses.</p>
              </div>
            ) : (
              commentary.map(c => (
                <div key={c.id} style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#028090" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0a1f24" }}>GPS Market Update</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {c.pdf_url && (
                        <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "7px", color: "#028090", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                          <Download size={11} /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "20px", fontSize: "14px", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {c.commentary_text}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ── CANDIDATE DRAWER ── */}
      {selectedApp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedApp(null) }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)" }} onClick={() => setSelectedApp(null)} />
          <div style={{ position: "relative", zIndex: 51, background: "white", width: "520px", height: "100vh", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", overflow: "hidden" }}>

            {/* Drawer header */}
            <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "linear-gradient(135deg, #028090, #3D5A4E)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "18px", flexShrink: 0 }}>
                    {selectedApp.candidate?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0a1f24", fontSize: "16px" }}>{selectedApp.candidate?.name}</div>
                    <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "2px" }}>
                      {selectedApp.candidate?.current_title}
                      {selectedApp.candidate?.current_company ? ` @ ${selectedApp.candidate.current_company}` : ""}
                    </div>
                    {selectedApp.candidate?.location && (
                      <div style={{ color: "#9ca3af", fontSize: "12px", marginTop: "2px" }}>📍 {selectedApp.candidate.location}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {selectedApp.ai_score && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: scoreColor(selectedApp.ai_score), lineHeight: 1 }}>{selectedApp.ai_score}</div>
                      <div style={{ fontSize: "10px", color: "#9ca3af" }}>/100</div>
                    </div>
                  )}
                  <button onClick={() => setSelectedApp(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "#6b7280" }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer tabs */}
              <div style={{ display: "flex", gap: "0" }}>
                {[
                  { id: "overview", label: "Overview" },
                  { id: "feedback", label: "Give feedback" },
                  { id: "interview", label: "Request interview" },
                ].map(({ id, label }) => (
                  <button key={id} onClick={() => setDrawerTab(id as any)}
                    style={{ padding: "10px 16px", border: "none", background: "none", fontSize: "13px", fontWeight: drawerTab === id ? 700 : 500, cursor: "pointer",
                      color: drawerTab === id ? "#028090" : "#6b7280",
                      borderBottom: drawerTab === id ? "2px solid #028090" : "2px solid transparent",
                      marginBottom: "-1px", transition: "all 0.15s" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

              {/* Overview */}
              {drawerTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* CV download */}
                  {(selectedApp.candidate?.cv_pdf_url || selectedApp.candidate?.cv_file_url || selectedApp.candidate?.cv_url) && (
                    <a href={selectedApp.candidate.cv_pdf_url || selectedApp.candidate.cv_file_url || selectedApp.candidate.cv_url}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "12px", textDecoration: "none" }}>
                      <FileText size={18} style={{ color: "#028090", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#028090" }}>View / Download CV</div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>PDF document</div>
                      </div>
                      <Download size={15} style={{ color: "#028090" }} />
                    </a>
                  )}

                  {/* AI Score bar */}
                  {selectedApp.ai_score && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>AI Match Score</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: scoreColor(selectedApp.ai_score) }}>{selectedApp.ai_score}/100</span>
                      </div>
                      <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "99px" }}>
                        <div style={{ height: "100%", borderRadius: "99px", width: `${selectedApp.ai_score}%`, background: scoreColor(selectedApp.ai_score) }} />
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {selectedApp.ai_summary && (
                    <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#028090", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Summary</div>
                      <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.7, margin: 0 }}>{selectedApp.ai_summary}</p>
                    </div>
                  )}

                  {/* Strengths & Concerns */}
                  {(selectedApp.ai_strengths?.length > 0 || selectedApp.ai_concerns?.length > 0) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {selectedApp.ai_strengths?.length > 0 && (
                        <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                            <CheckCircle size={12} style={{ color: "#16a34a" }} />
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Strengths</span>
                          </div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "5px" }}>
                            {selectedApp.ai_strengths.map((s: string, i: number) => (
                              <li key={i} style={{ fontSize: "12px", color: "#166534", display: "flex", gap: "6px" }}><span>•</span>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedApp.ai_concerns?.length > 0 && (
                        <div style={{ background: "#fffbeb", borderRadius: "12px", padding: "14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                            <AlertCircle size={12} style={{ color: "#d97706" }} />
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.06em" }}>Areas to explore</span>
                          </div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "5px" }}>
                            {selectedApp.ai_concerns.map((c: string, i: number) => (
                              <li key={i} style={{ fontSize: "12px", color: "#92400e", display: "flex", gap: "6px" }}><span>•</span>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback */}
              {drawerTab === "feedback" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
                    Share your thoughts on <strong style={{ color: "#0a1f24" }}>{selectedApp.candidate?.name}</strong> with your GPS consultant.
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your feedback</label>
                    <textarea
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      rows={5}
                      placeholder="Share your impressions, questions, or concerns about this candidate…"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6, color: "#374151" }}
                      onFocus={e => (e.target.style.borderColor = "#028090")}
                      onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall impression</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {[
                        { id: "positive", label: "👍 Positive", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                        { id: "neutral",  label: "✋ Neutral",  color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
                        { id: "negative", label: "👎 Concerns", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                      ].map(opt => (
                        <button key={opt.id} onClick={() => setFeedbackSentiment(opt.id as any)}
                          style={{ flex: 1, padding: "10px", borderRadius: "9px", border: feedbackSentiment === opt.id ? `2px solid ${opt.color}` : `1px solid ${opt.border}`,
                            background: feedbackSentiment === opt.id ? opt.bg : "white", color: opt.color, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {feedbackDone ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "14px", display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", fontSize: "14px", fontWeight: 600 }}>
                      <CheckCircle size={16} /> Feedback submitted — thank you!
                    </div>
                  ) : (
                    <button onClick={submitFeedback} disabled={!feedbackText.trim() || submittingFeedback}
                      style={{ padding: "13px", background: feedbackText.trim() ? "#028090" : "#e5e7eb", color: feedbackText.trim() ? "white" : "#9ca3af", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: feedbackText.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                      {submittingFeedback ? "Submitting…" : "Submit feedback"}
                    </button>
                  )}
                </div>
              )}

              {/* Interview request */}
              {drawerTab === "interview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
                    Request an interview with <strong style={{ color: "#0a1f24" }}>{selectedApp.candidate?.name}</strong>. Your GPS consultant will coordinate the scheduling.
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes (optional)</label>
                    <textarea
                      value={interviewNotes}
                      onChange={e => setInterviewNotes(e.target.value)}
                      rows={4}
                      placeholder="Preferred format (video/in-person), timing preferences, specific topics to cover…"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6, color: "#374151" }}
                      onFocus={e => (e.target.style.borderColor = "#028090")}
                      onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>

                  {interviewDone ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
                        <CheckCircle size={16} /> Interview request submitted
                      </div>
                      <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Your GPS consultant will be in touch shortly to coordinate.</p>
                    </div>
                  ) : (
                    <button onClick={submitInterviewRequest} disabled={submittingInterview}
                      style={{ padding: "13px", background: "#028090", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.88"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
                      {submittingInterview ? "Requesting…" : "Request interview →"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPARISON MODAL ── */}
      {showCompare && compareApps.length >= 2 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "900px", maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0a1f24", margin: 0 }}>Candidate comparison</h2>
              <button onClick={() => setShowCompare(false)} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${compareApps.length}, 1fr)`, gap: "20px" }}>
                {compareApps.map(app => (
                  <div key={app.id}>
                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg, #028090, #3D5A4E)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "20px", margin: "0 auto 10px" }}>
                        {app.candidate?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 700, color: "#0a1f24", fontSize: "15px" }}>{app.candidate?.name}</div>
                      <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "3px" }}>{app.candidate?.current_title}</div>
                      {app.candidate?.current_company && <div style={{ color: "#9ca3af", fontSize: "12px" }}>{app.candidate.current_company}</div>}
                      {app.ai_score && (
                        <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "baseline", gap: "2px" }}>
                          <span style={{ fontSize: "28px", fontWeight: 700, color: scoreColor(app.ai_score) }}>{app.ai_score}</span>
                          <span style={{ fontSize: "13px", color: "#9ca3af" }}>/100</span>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    {app.ai_summary && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#028090", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Summary</div>
                        <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, margin: 0 }}>{app.ai_summary}</p>
                      </div>
                    )}

                    {/* Strengths */}
                    {app.ai_strengths?.length > 0 && (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>✓ Strengths</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {app.ai_strengths.map((s: string, i: number) => (
                            <li key={i} style={{ fontSize: "12px", color: "#374151", display: "flex", gap: "6px" }}><span style={{ color: "#16a34a" }}>•</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Concerns */}
                    {app.ai_concerns?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>⚠ Areas to explore</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {app.ai_concerns.map((c: string, i: number) => (
                            <li key={i} style={{ fontSize: "12px", color: "#374151", display: "flex", gap: "6px" }}><span style={{ color: "#d97706" }}>•</span>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
