"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import {
  Plus, Building2, ExternalLink, Trash2, MessageSquare,
  Send, FileText, CheckCircle, Loader2, Search,
  ThumbsUp, ThumbsDown, Minus, X, AlertTriangle,
  Calendar, MapPin, DollarSign, ChevronRight
} from "lucide-react"

const TEAM_MEMBERS = ["Mona", "Juana"]

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

type TabId = "accounts" | "feedback" | "interviews" | "commentary"


type MandateTab = "overview" | "commentary" | "feedback" | "interviews"

function MandateCard({ mandate, clientId, onSendCommentary }: {
  mandate: any
  clientId: string
  onSendCommentary: (m: any) => void
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<MandateTab>("overview")
  const [feedback, setFeedback] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])
  const [commentary, setCommentary] = useState<any[]>([])
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())
  const [fbPopup, setFbPopup] = useState<any>(null)

  async function loadTab(tab: MandateTab) {
    if (loadedTabs.has(tab)) return
    setLoadedTabs(prev => { const s = new Set(Array.from(prev)); s.add(tab); return s })
    if (tab === "feedback") {
      const { data } = await supabase
        .from("client_feedback")
        .select("*, application:applications(id, candidate:candidates(id, name, current_title))")
        .eq("mandate_id", mandate.id)
        .order("created_at", { ascending: false })
      setFeedback(data || [])
    }
    if (tab === "interviews") {
      const { data } = await supabase
        .from("client_interview_requests")
        .select("*, application:applications(candidate:candidates(name, current_title))")
        .eq("mandate_id", mandate.id)
        .order("created_at", { ascending: false })
      setInterviews(data || [])
    }
    if (tab === "commentary") {
      const { data } = await supabase
        .from("mandate_commentary")
        .select("*")
        .eq("mandate_id", mandate.id)
        .order("created_at", { ascending: false })
      setCommentary(data || [])
    }
  }

  function switchTab(tab: MandateTab) {
    setActiveTab(tab)
    loadTab(tab)
  }

  async function updateInterviewStatus(id: string, status: string) {
    await supabase.from("client_interview_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, status } : ir))
  }

  async function updateInterviewAssignee(id: string, name: string) {
    await supabase.from("client_interview_requests").update({ assigned_to_name: name }).eq("id", id)
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, assigned_to_name: name } : ir))
  }

  const TABS: { id: MandateTab; label: string }[] = [
    { id: "overview",    label: "Overview" },
    { id: "commentary",  label: "Commentary" },
    { id: "feedback",    label: "Feedback" },
    { id: "interviews",  label: "Interview requests" },
  ]

  const sentimentBadge = (s: string) => {
    if (s === "positive") return "bg-teal/10 text-teal"
    if (s === "negative") return "bg-amber-100 text-amber-700"
    return "bg-gray-100 text-gray-500"
  }

  const generalFeedback = feedback.filter(fb => !fb.application_id)
  const candidateFeedback = feedback.filter(fb => !!fb.application_id)

  return (
    <div className="card overflow-hidden">

      {/* Card header — click to collapse */}
      <div className={`flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${open ? "border-b border-gray-100" : ""}`}
        onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">{mandate.title}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            {mandate.location && <span className="flex items-center gap-1"><MapPin size={10} />{mandate.location}</span>}
            {mandate.salary_range && <span className="flex items-center gap-1"><DollarSign size={10} />{mandate.salary_range}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge text-xs ${mandate.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {mandate.status}
          </span>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </div>

      {open && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-1">
            {TABS.map(t => (
              <button key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-3 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px ${
                  activeTab === t.id
                    ? "text-teal border-teal"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {mandate.location && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Location</div>
                      <div className="text-sm text-gray-900">{mandate.location}</div>
                    </div>
                  )}
                  {mandate.salary_range && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Salary range</div>
                      <div className="text-sm text-gray-900">{mandate.salary_range}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Status</div>
                    <div className="text-sm text-gray-900 capitalize">{mandate.status}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`/internal/mandates/${mandate.id}`}
                    className="btn-ghost text-xs flex items-center gap-1">
                    <ExternalLink size={10} /> Open mandate
                  </a>
                  <a href={`/client/${mandate.id}`} target="_blank" rel="noopener noreferrer"
                    className="btn-ghost text-xs flex items-center gap-1">
                    <ExternalLink size={10} /> View portal
                  </a>
                </div>
              </div>
            )}

            {/* Commentary */}
            {activeTab === "commentary" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">New commentary</label>
                  <CommentaryComposer mandateId={mandate.id} onSend={() => {
                    setLoadedTabs(prev => { const n = new Set(Array.from(prev)); n.delete("commentary"); return n })
                    loadTab("commentary")
                  }} />
                </div>
                {commentary.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sent</div>
                    <div className="divide-y divide-gray-50">
                      {commentary.map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{c.commentary_text}</p>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              {c.email_sent && <span className="ml-2 text-teal">· Delivered</span>}
                            </div>
                          </div>
                          {c.pdf_url && (
                            <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="btn-ghost text-xs flex items-center gap-1 flex-shrink-0">
                              <FileText size={10} /> PDF
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {activeTab === "feedback" && (
              <div className="space-y-4">
                {generalFeedback.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">General feedback</div>
                    <div className="divide-y divide-gray-50">
                      {generalFeedback.map(fb => (
                        <div key={fb.id} className="py-3">
                          <p className="text-sm text-gray-700 leading-relaxed">{fb.feedback_text}</p>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Candidate feedback</div>
                  {candidateFeedback.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3">No candidate feedback yet</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {candidateFeedback.map(fb => (
                        <div key={fb.id} className="flex items-start gap-3 py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors rounded-xl"
                          onClick={() => setFbPopup(fb)}>
                          <div className="mt-0.5 flex-shrink-0">
                            {fb.sentiment === "positive" ? <ThumbsUp size={13} className="text-teal" /> : fb.sentiment === "negative" ? <ThumbsDown size={13} className="text-amber-500" /> : <Minus size={13} className="text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{fb.application?.candidate?.name || "Unknown"}</span>
                              <span className={`badge text-xs ${sentimentBadge(fb.sentiment || "neutral")}`}>{fb.sentiment || "neutral"}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{fb.feedback_text}</p>
                          </div>
                          <span className="text-xs text-gray-300 flex-shrink-0">
                            {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interview requests */}
            {activeTab === "interviews" && (
              <div>
                {interviews.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3">No interview requests for this mandate</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {interviews.map(ir => {
                      const sc = ir.status === "in_progress"
                        ? { label: "In progress", cls: "bg-amber-100 text-amber-700" }
                        : ir.status === "done"
                        ? { label: "Done", cls: "bg-green-100 text-green-700" }
                        : { label: "New", cls: "bg-blue-100 text-blue-700" }
                      return (
                        <div key={ir.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-gray-900 text-sm">{ir.application?.candidate?.name || "Unknown"}</span>
                                <span className={`badge text-xs ${sc.cls}`}>{sc.label}</span>
                              </div>
                              {ir.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">{ir.notes}</p>}
                            </div>
                            <div className="flex flex-col gap-2 items-end flex-shrink-0">
                              <select value={ir.assigned_to_name || ""} onChange={e => updateInterviewAssignee(ir.id, e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                                <option value="">Assign to…</option>
                                <option value="Mona">Mona</option>
                                <option value="Juana">Juana</option>
                              </select>
                              {ir.status !== "done" && (
                                <div className="flex gap-1.5">
                                  {ir.status !== "in_progress" && (
                                    <button onClick={() => updateInterviewStatus(ir.id, "in_progress")}
                                      className="text-xs px-2 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">In progress</button>
                                  )}
                                  <button onClick={() => updateInterviewStatus(ir.id, "done")}
                                    className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">Done</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Feedback popup */}
      {fbPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setFbPopup(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-bold text-gray-900">Feedback on {fbPopup.application?.candidate?.name}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(fbPopup.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge text-xs ${sentimentBadge(fbPopup.sentiment || "neutral")}`}>{fbPopup.sentiment || "neutral"}</span>
                <button onClick={() => setFbPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-5">{fbPopup.feedback_text}</p>
            <div className="flex gap-3">
              {fbPopup.application?.candidate?.id && (
                <a href={`/internal/candidates/${fbPopup.application.candidate.id}`} className="btn-primary text-sm">Open candidate profile</a>
              )}
              <button onClick={() => setFbPopup(null)} className="btn-ghost text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CommentaryComposer({ mandateId, onSend }: { mandateId: string; onSend: () => void }) {
  const supabase = createClient()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!text.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    try {
      const res = await fetch("/api/send-commentary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandate_id: mandateId, commentary_text: text.trim(), created_by: user?.id }),
      })
      const data = await res.json()
      if (data.error) { alert("Error: " + data.error); setSending(false); return }
      setText(""); setSent(true)
      setTimeout(() => setSent(false), 4000)
      onSend()
    } catch { alert("Failed to send.") }
    setSending(false)
  }

  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
        placeholder="Write market commentary here&#x2026; Share search progress, market insights, candidate observations, or any updates relevant to this mandate."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-y leading-relaxed min-h-[120px]" />
      {sent && (
        <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-3 flex items-center gap-2 text-teal text-sm font-semibold">
          <CheckCircle size={14} /> Sent — PDF generated, email delivered, portal updated
        </div>
      )}
      <button onClick={handleSend} disabled={sending || !text.trim()}
        className="btn-primary flex items-center gap-2 disabled:opacity-40">
        {sending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send to client</>}
      </button>
    </div>
  )
}

function sentimentIcon(s: string) {
  if (s === "positive") return <ThumbsUp size={13} className="text-teal" />
  if (s === "negative") return <ThumbsDown size={13} className="text-amber-500" />
  return <Minus size={13} className="text-gray-400" />
}

function sentimentBadge(s: string): string {
  if (s === "positive") return "bg-teal/10 text-teal"
  if (s === "negative") return "bg-amber-100 text-amber-700"
  return "bg-gray-100 text-gray-500"
}

function statusBadge(s: string): { label: string; cls: string } {
  if (s === "in_progress") return { label: "In progress", cls: "bg-amber-100 text-amber-700" }
  if (s === "done") return { label: "Done", cls: "bg-green-100 text-green-700" }
  return { label: "New", cls: "bg-blue-100 text-blue-700" }
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)

  // Create form
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [mandateRows, setMandateRows] = useState([{ title: "", location: "", salary_range: "", job_description: "" }])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null)

  // Detail panel data
  const [detailFeedback, setDetailFeedback] = useState<any[]>([])
  const [detailInterviews, setDetailInterviews] = useState<any[]>([])
  const [detailMandates, setDetailMandates] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [feedbackPopup, setFeedbackPopup] = useState<any>(null)
  const [revokeTarget, setRevokeTarget] = useState<any>(null)
  const [revoking, setRevoking] = useState(false)

  // Commentary
  const [commentaryTarget, setCommentaryTarget] = useState<any>(null)
  const [commentaryText, setCommentaryText] = useState("")
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)

  // Add mandate to existing client
  const [rightTab, setRightTab] = useState<"mandates" | "feedback" | "interviews">("mandates")
  const [showAddMandate, setShowAddMandate] = useState(false)
  const [newMandate, setNewMandate] = useState({ title: "", location: "", salary_range: "", job_description: "" })
  const [addingMandate, setAddingMandate] = useState(false)

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    if (selected) { loadDetail(selected.id); setRightTab("mandates") }
  }, [selected])

  async function loadClients() {
    setLoadingClients(true)
    const { data } = await supabase
      .from("client_users")
      .select("*")
      .order("created_at", { ascending: false })
    setClients(data || [])
    if (data && data.length > 0 && !selected) setSelected(data[0])
    setLoadingClients(false)
  }

  async function loadDetail(clientId: string) {
    setLoadingDetail(true)
    const [{ data: mandates }, { data: fb }, { data: ir }] = await Promise.all([
      supabase.from("mandates").select("id, title, location, salary_range, status").eq("client_user_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_feedback")
        .select("*, application:applications(id, candidate:candidates(id, name, current_title)), mandate:mandates(title)")
        .eq("client_user_id", clientId)
        .order("created_at", { ascending: false }),
      supabase.from("client_interview_requests")
        .select("*, application:applications(candidate:candidates(name, current_title)), mandate:mandates(title)")
        .eq("client_user_id", clientId)
        .order("created_at", { ascending: false }),
    ])
    setDetailMandates(mandates || [])
    setDetailFeedback(fb || [])
    setDetailInterviews(ir || [])
    setLoadingDetail(false)
  }

  function updateMandateRow(idx: number, field: string, value: string) {
    setMandateRows(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  async function handleCreate() {
    if (!contactName || !contactEmail || !companyName) { setCreateError("Name, email and company are required."); return }
    if (mandateRows.some(m => !m.title)) { setCreateError("Each mandate needs a job title."); return }
    setCreating(true); setCreateError("")
    const password = generatePassword()
    try {
      const createdIds: string[] = []
      for (const m of mandateRows) {
        const { data: mandate, error: mErr } = await supabase.from("mandates").insert([{
          title: m.title, client_name: companyName,
          location: m.location || null, salary_range: m.salary_range || null,
          job_description: m.job_description || null, status: "active",
        }]).select("id").single()
        if (mErr) { setCreateError("Something went wrong creating the mandate. Please try again."); setCreating(false); return }
        createdIds.push(mandate.id)
      }
      const res = await fetch("/api/create-client-user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: contactName, email: contactEmail, company_name: companyName, mandate_id: createdIds[0], mandate_name: mandateRows[0].title, temp_password: password }),
      })
      const data = await res.json()
      if (data.error) {
        // Delete the mandates we just created since client failed
        for (const mid of createdIds) {
          await supabase.from("mandates").delete().eq("id", mid)
        }
        const friendlyError = data.error.includes("already been registered") || data.error.includes("already registered")
          ? "This email address already has an account. Please use a different email."
          : "Something went wrong. Please check your details and try again."
        setCreateError(friendlyError)
        setCreating(false)
        return
      }
      for (const mid of createdIds) {
        await supabase.from("mandates").update({ client_user_id: data.client_user?.id }).eq("id", mid)
      }
      setCreatedInfo({ email: contactEmail, password })
      setContactName(""); setContactEmail(""); setCompanyName("")
      setMandateRows([{ title: "", location: "", salary_range: "", job_description: "" }])
      setShowForm(false)
      await loadClients()
    } catch { setCreateError("Something went wrong. Please try again.") }
    setCreating(false)
  }

  async function handleAddMandate() {
    if (!newMandate.title || !selected) return
    setAddingMandate(true)
    const { data: mandate, error } = await supabase.from("mandates").insert([{
      title: newMandate.title, client_name: selected.company_name,
      location: newMandate.location || null, salary_range: newMandate.salary_range || null,
      job_description: newMandate.job_description || null, status: "active",
      client_user_id: selected.id,
    }]).select("id").single()
    if (!error) {
      setNewMandate({ title: "", location: "", salary_range: "", job_description: "" })
      setShowAddMandate(false)
      loadDetail(selected.id)
    }
    setAddingMandate(false)
  }

  async function handleRevoke(client: any) {
    setRevoking(true)
    await supabase.from("client_users").update({ is_active: false }).eq("id", client.id)
    setRevokeTarget(null)
    setRevoking(false)
    loadClients()
  }

  async function handleInterviewStatus(id: string, status: string) {
    await supabase.from("client_interview_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
    setDetailInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, status } : ir))
  }

  async function handleInterviewAssign(id: string, name: string) {
    await supabase.from("client_interview_requests").update({ assigned_to_name: name }).eq("id", id)
    setDetailInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, assigned_to_name: name } : ir))
  }

  async function handleSendCommentary() {
    if (!commentaryText.trim() || !commentaryTarget) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    try {
      const res = await fetch("/api/send-commentary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandate_id: commentaryTarget.id, commentary_text: commentaryText.trim(), created_by: user?.id }),
      })
      const data = await res.json()
      if (data.error) { alert("Error: " + data.error); setSending(false); return }
      setCommentaryText(""); setCommentaryTarget(null)
      setSentOk(true); setTimeout(() => setSentOk(false), 4000)
    } catch { alert("Failed to send.") }
    setSending(false)
  }



  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 -mx-6 -my-6 overflow-hidden">

      {/* ── LEFT: Client list ── */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Clients</h1>
            <button onClick={() => { setShowForm(f => !f); setCreateError("") }}
              className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingClients ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin text-teal" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-gray-400 text-sm">No clients yet</p>
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id}
                onClick={() => setSelected(c)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 transition-all ${selected?.id === c.id ? "bg-teal/5 border-l-2 border-l-teal" : "hover:bg-gray-50 border-l-2 border-l-transparent"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {c.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{c.company_name || c.full_name}</div>
                    <div className="text-xs text-gray-400 truncate">{c.full_name}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.is_active ? "bg-teal" : "bg-gray-300"}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Client detail ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Select a client to view details</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">

            {/* Sticky client header + right tabs */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100">
              <div className="px-6 py-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {selected.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{selected.company_name || selected.full_name}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{selected.full_name}</span>
                        <span className="text-teal">{selected.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge text-xs ${selected.is_active ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-400"}`}>
                      {selected.is_active ? "Active" : "Inactive"}
                    </span>
                    {selected.is_active && (
                      <button onClick={() => setRevokeTarget(selected)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors flex items-center gap-1">
                        <Trash2 size={11} /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Right panel tabs */}
              <div className="flex gap-0 px-6 max-w-3xl mx-auto">
                {([
                  { id: "mandates",   label: "Mandates" },
                  { id: "feedback",   label: "Feedback" },
                  { id: "interviews", label: "Interview requests" },
                ]).map(({ id, label }: { id: "mandates" | "feedback" | "interviews"; label: string }) => (
                  <button key={id} onClick={() => setRightTab(id)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                      rightTab === id
                        ? "text-teal border-teal"
                        : "text-gray-400 border-transparent hover:text-gray-600"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-4">

            {/* Add client form */}
            {showForm && (
              <div className="card p-5 space-y-5 border-teal/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">New client</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                {createError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{createError}</div>}
                {createdInfo && (
                  <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-teal font-semibold text-sm mb-2"><CheckCircle size={14} /> Created — share these credentials</div>
                    <div className="font-mono text-xs bg-white rounded-lg p-3 border border-teal/20 space-y-1">
                      <div><span className="text-gray-400">Login:</span> {window.location.origin}/client/login</div>
                      <div><span className="text-gray-400">Email:</span> {createdInfo.email}</div>
                      <div><span className="text-gray-400">Password:</span> {createdInfo.password}</div>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact details</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Full name *", val: contactName, set: setContactName, ph: "Ahmed Hassan" },
                      { label: "Email *", val: contactEmail, set: setContactEmail, ph: "ahmed@company.com" },
                      { label: "Company *", val: companyName, set: setCompanyName, ph: "TechCorp Egypt" },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label}>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                        <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Mandates</p>
                    <button onClick={() => setMandateRows(p => [...p, { title: "", location: "", salary_range: "", job_description: "" }])}
                      className="text-xs text-teal hover:underline flex items-center gap-1"><Plus size={10} /> Add mandate</button>
                  </div>
                  <div className="space-y-3">
                    {mandateRows.map((m, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Mandate {mandateRows.length > 1 ? idx + 1 : ""}</span>
                          {mandateRows.length > 1 && <button onClick={() => setMandateRows(p => p.filter((_, i) => i !== idx))} className="text-xs text-gray-400 hover:text-red-500">Remove</button>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Job title *</label>
                            <input value={m.title} onChange={e => updateMandateRow(idx, "title", e.target.value)} placeholder="e.g. Chief Financial Officer"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                            <input value={m.location} onChange={e => updateMandateRow(idx, "location", e.target.value)} placeholder="e.g. Cairo, Egypt"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Salary range</label>
                            <input value={m.salary_range} onChange={e => updateMandateRow(idx, "salary_range", e.target.value)} placeholder="e.g. 40,000–60,000 EGP"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Job description <span className="text-teal text-xs">✦ AI Ready</span></label>
                            <textarea value={m.job_description} onChange={e => updateMandateRow(idx, "job_description", e.target.value)}
                              rows={3} placeholder="Paste the full job description — AI will use this to score candidates"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><CheckCircle size={13} /> Create client &amp; mandate</>}
                  </button>
                  <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                </div>
              </div>
            )}

            {/* Mandates tab */}
            {rightTab === "mandates" && <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Mandates</h3>
                {selected.is_active && (
                  <button onClick={() => setShowAddMandate(f => !f)} className="text-xs text-teal hover:underline flex items-center gap-1">
                    <Plus size={11} /> Add mandate
                  </button>
                )}
              </div>

              {showAddMandate && (
                <div className="card p-4 mb-3 border-teal/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Job title *</label>
                      <input value={newMandate.title} onChange={e => setNewMandate(p => ({ ...p, title: e.target.value }))} placeholder="e.g. VP Sales"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                      <input value={newMandate.location} onChange={e => setNewMandate(p => ({ ...p, location: e.target.value }))} placeholder="Cairo, Egypt"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Salary range</label>
                      <input value={newMandate.salary_range} onChange={e => setNewMandate(p => ({ ...p, salary_range: e.target.value }))} placeholder="40,000–60,000 EGP"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Job description <span className="text-teal text-xs">✦ AI Ready</span></label>
                      <textarea value={newMandate.job_description} onChange={e => setNewMandate(p => ({ ...p, job_description: e.target.value }))}
                        rows={3} placeholder="Paste the full job description"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddMandate} disabled={addingMandate || !newMandate.title}
                      className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                      {addingMandate ? <><Loader2 size={11} className="animate-spin" /> Adding…</> : "Add mandate"}
                    </button>
                    <button onClick={() => setShowAddMandate(false)} className="btn-ghost text-xs">Cancel</button>
                  </div>
                </div>
              )}

              {loadingDetail ? (
                <div className="card text-center py-8"><Loader2 size={18} className="animate-spin mx-auto text-teal" /></div>
              ) : detailMandates.length === 0 ? (
                <div className="card border-dashed text-center py-8">
                  <p className="text-gray-400 text-sm">No mandates yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detailMandates.map(m => (
                    <MandateCard key={m.id} mandate={m} clientId={selected.id}
                      onSendCommentary={(mandate: any) => { setCommentaryTarget(mandate); setCommentaryText("") }} />
                  ))}
                </div>
              )}
            </div>

            </div>}

            {/* Feedback tab */}
            {rightTab === "feedback" && <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">All client feedback</h3>
              {detailFeedback.length === 0 ? (
                <div className="card border-dashed text-center py-8">
                  <MessageSquare size={24} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-400 text-sm">No feedback yet</p>
                </div>
              ) : (
                <div className="card divide-y divide-gray-50">
                  {detailFeedback.map(fb => (
                    <div key={fb.id} className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setFeedbackPopup(fb)}>
                      <div className="mt-0.5 flex-shrink-0">{sentimentIcon(fb.sentiment)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{fb.application?.candidate?.name || "Unknown candidate"}</span>
                          <span className={`badge text-xs ${sentimentBadge(fb.sentiment || "neutral")}`}>{fb.sentiment || "neutral"}</span>
                          {fb.mandate?.title && <span className="text-xs text-gray-400">{fb.mandate.title}</span>}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{fb.feedback_text}</p>
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0">
                        {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </div>}

            {/* Interview requests tab */}
            {rightTab === "interviews" && <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">All interview requests</h3>
              {detailInterviews.length === 0 ? (
                <div className="card border-dashed text-center py-8">
                  <Calendar size={24} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-400 text-sm">No interview requests yet</p>
                </div>
              ) : (
                <div className="card divide-y divide-gray-50">
                  {detailInterviews.map(ir => {
                    const sc = statusBadge(ir.status)
                    return (
                      <div key={ir.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{ir.application?.candidate?.name || "Unknown"}</span>
                              <span className={`badge text-xs ${sc.cls}`}>{sc.label}</span>
                              {ir.mandate?.title && <span className="text-xs text-gray-400">{ir.mandate.title}</span>}
                            </div>
                            {ir.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">{ir.notes}</p>}
                          </div>
                          <div className="flex flex-col gap-2 items-end flex-shrink-0">
                            <select value={ir.assigned_to_name || ""} onChange={e => handleInterviewAssign(ir.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                              <option value="">Assign to…</option>
                              {TEAM_MEMBERS.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <div className="flex gap-1.5">
                              {ir.status !== "in_progress" && (
                                <button onClick={() => handleInterviewStatus(ir.id, "in_progress")}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">In progress</button>
                              )}
                              {ir.status !== "done" && (
                                <button onClick={() => handleInterviewStatus(ir.id, "done")}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">Done</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

              </div>
            </div>
          </div>
        )}
      </div>



      {/* ── REVOKE MODAL ── */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Revoke access?</div>
                <div className="text-sm text-gray-500 mt-0.5">{revokeTarget.full_name}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              This will immediately remove their access to the client portal. They will no longer be able to log in.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleRevoke(revokeTarget)} disabled={revoking}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
                {revoking ? "Revoking…" : "Yes, revoke access"}
              </button>
              <button onClick={() => setRevokeTarget(null)} className="flex-1 btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FEEDBACK POPUP ── */}

    </div>
  )
}
