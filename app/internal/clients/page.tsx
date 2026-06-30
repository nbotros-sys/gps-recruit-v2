"use client"
import { useState, useEffect } from "react"
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

function getSentimentIcon(s: string) {
  if (s === "positive") return <ThumbsUp size={13} className="text-teal" />
  if (s === "negative") return <ThumbsDown size={13} className="text-amber-500" />
  return <Minus size={13} className="text-gray-400" />
}

function getSentimentBadge(s: string): string {
  if (s === "positive") return "bg-teal/10 text-teal"
  if (s === "negative") return "bg-amber-100 text-amber-700"
  return "bg-gray-100 text-gray-500"
}

function ratingToSentiment(rating: string | null | undefined): string {
  if (!rating) return "neutral"
  const r = rating.toLowerCase()
  if (r.includes("strong yes") || r === "yes") return "positive"
  if (r === "no") return "negative"
  return "neutral"
}

function getStatusBadge(s: string): { label: string; cls: string } {
  if (s === "in_progress") return { label: "In progress", cls: "bg-amber-100 text-amber-700" }
  if (s === "done") return { label: "Done", cls: "bg-green-100 text-green-700" }
  return { label: "New", cls: "bg-blue-100 text-blue-700" }
}

function InterviewRequestCard({ ir, showMandate, onAssign, onStatus, onConfirmDetails }: {
  ir: any
  showMandate?: boolean
  onAssign: (id: string, name: string) => void
  onStatus: (id: string, status: string) => void
  onConfirmDetails: (id: string, details: { confirmed_date: string; confirmed_time: string; format: string; interviewer: string }) => Promise<void>
}) {
  const sc = getStatusBadge(ir.status)
  const [editingDetails, setEditingDetails] = useState(false)
  const [confirmedDate, setConfirmedDate] = useState(ir.confirmed_date || "")
  const [confirmedTime, setConfirmedTime] = useState(ir.confirmed_time || "")
  const [format, setFormat] = useState(ir.format || "Video call")
  const [interviewer, setInterviewer] = useState(ir.interviewer || "")
  const [saving, setSaving] = useState(false)
  const hasConfirmed = !!ir.confirmed_date

  async function save() {
    setSaving(true)
    await onConfirmDetails(ir.id, { confirmed_date: confirmedDate, confirmed_time: confirmedTime, format, interviewer })
    setSaving(false)
    setEditingDetails(false)
  }

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 text-sm">{ir.application?.candidate?.name || "Unknown"}</span>
            <span className={"badge text-xs " + sc.cls}>{sc.label}</span>
            {showMandate && ir.mandate?.title && <span className="text-xs text-gray-400">{ir.mandate.title}</span>}
          </div>
          {ir.preferred_dates && <p className="text-xs text-gray-400">Client preferred: {ir.preferred_dates}</p>}
          {ir.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-1.5">{ir.notes}</p>}
          {hasConfirmed && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-teal bg-teal/5 border border-teal/15 rounded-lg px-2.5 py-1.5 w-fit">
              <Calendar size={11} />
              {new Date(ir.confirmed_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {ir.confirmed_time && ` · ${ir.confirmed_time}`}
              {ir.format && ` · ${ir.format}`}
              {ir.interviewer && ` · ${ir.interviewer}`}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          <select
            value={ir.assigned_to_name || ""}
            onChange={e => onAssign(ir.id, e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
          >
            <option value="">Assign to...</option>
            {TEAM_MEMBERS.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          {ir.status !== "done" && (
            <div className="flex gap-1.5">
              <button onClick={() => setEditingDetails(e => !e)}
                className="text-xs px-2 py-1 rounded-lg border border-teal/30 text-teal hover:bg-teal/5 transition-colors">
                {hasConfirmed ? "Edit details" : "Confirm details"}
              </button>
              {ir.status !== "in_progress" && !hasConfirmed && (
                <button onClick={() => onStatus(ir.id, "in_progress")} className="text-xs px-2 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">In progress</button>
              )}
              <button onClick={() => onStatus(ir.id, "done")} className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>

      {editingDetails && (
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Confirmed date</label>
            <input type="date" value={confirmedDate} onChange={e => setConfirmedDate(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Time</label>
            <input type="time" value={confirmedTime} onChange={e => setConfirmedTime(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
              <option>Video call</option>
              <option>In-person</option>
              <option>Phone</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Interviewer</label>
            <input type="text" value={interviewer} onChange={e => setInterviewer(e.target.value)}
              placeholder="e.g. Sarah, Head of Sales"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <button onClick={save} disabled={saving || !confirmedDate}
              className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
              style={{ background: "#028090" }}>
              {saving ? "Saving..." : "Save details"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type RightTab = "mandates" | "feedback" | "interviews"
type MandateTabId = "overview" | "commentary" | "feedback" | "interviews"

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandate_id: mandateId, commentary_text: text.trim(), created_by: user?.id }),
      })
      const data = await res.json()
      if (data.error) { alert("Error: " + data.error); setSending(false); return }
      setText("")
      setSent(true)
      setTimeout(() => setSent(false), 4000)
      onSend()
    } catch { alert("Failed to send.") }
    setSending(false)
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder="Write market commentary here. Share search progress, market insights, and updates relevant to this mandate."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-y leading-relaxed min-h-[120px]"
      />
      {sent && (
        <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-3 flex items-center gap-2 text-teal text-sm font-semibold">
          <CheckCircle size={14} /> Sent successfully
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={sending || !text.trim()}
        className="btn-primary flex items-center gap-2 disabled:opacity-40"
      >
        {sending ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Send to client</>}
      </button>
    </div>
  )
}

function MandateCard({ mandate, clientId, onStatusChange }: { mandate: any; clientId: string; onStatusChange: (mandateId: string, status: string) => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<MandateTabId>("overview")
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null)
  const [pendingStatusValue, setPendingStatusValue] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])
  const [commentary, setCommentary] = useState<any[]>([])
  const [loadedTabs, setLoadedTabs] = useState<string[]>([])
  const [fbPopup, setFbPopup] = useState<any>(null)

  function markLoaded(tab: string) {
    setLoadedTabs(prev => prev.includes(tab) ? prev : [...prev, tab])
  }

  async function switchTab(tab: MandateTabId) {
    setActiveTab(tab)
    if (loadedTabs.includes(tab)) return
    markLoaded(tab)
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

  async function updateStatus(id: string, status: string) {
    await supabase.from("client_interview_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, status } : ir))
  }

  async function updateAssignee(id: string, name: string) {
    await supabase.from("client_interview_requests").update({ assigned_to_name: name }).eq("id", id)
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, assigned_to_name: name } : ir))
  }

  async function updateInterviewDetails(id: string, details: { confirmed_date: string; confirmed_time: string; format: string; interviewer: string }) {
    const current = interviews.find(ir => ir.id === id)
    const nextStatus = current?.status === "new" ? "in_progress" : current?.status
    const payload = {
      confirmed_date: details.confirmed_date || null,
      confirmed_time: details.confirmed_time || null,
      format: details.format || null,
      interviewer: details.interviewer || null,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }
    await supabase.from("client_interview_requests").update(payload).eq("id", id)
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, ...payload } : ir))
  }

  function refreshCommentary() {
    const newLoaded = loadedTabs.filter(t => t !== "commentary")
    setLoadedTabs(newLoaded)
    switchTab("commentary")
  }

  function handleStatusChange(newStatus: string) {
    if (newStatus === "filled" || newStatus === "cancelled") {
      setPendingStatusValue(newStatus)
      setConfirmStatus(newStatus)
    } else {
      saveStatus(newStatus)
    }
  }

  async function saveStatus(newStatus: string) {
    await supabase.from("mandates").update({ status: newStatus }).eq("id", mandate.id)
    onStatusChange(mandate.id, newStatus)
  }

  async function confirmStatusChange() {
    if (!confirmStatus || !pendingStatusValue) return
    await supabase.from("mandates").update({ status: pendingStatusValue }).eq("id", mandate.id)
    await supabase.from("client_users").update({ is_active: false }).eq("mandate_id", mandate.id)
    onStatusChange(mandate.id, pendingStatusValue)
    setConfirmStatus(null)
    setPendingStatusValue(null)
  }

  const tabs: { id: MandateTabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "commentary", label: "Commentary" },
    { id: "feedback", label: "Feedback" },
    { id: "interviews", label: "Interview requests" },
  ]

  const generalFeedback = feedback.filter(fb => !fb.application_id)
  const candidateFeedback = feedback.filter(fb => !!fb.application_id)

  return (
    <div className="card overflow-hidden">
      <div
        onClick={() => setOpen(o => !o)}
        className={"flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors " + (open ? "border-b border-gray-100" : "")}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">{mandate.title}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            {mandate.location && <span className="flex items-center gap-1"><MapPin size={10} />{mandate.location}</span>}
            {mandate.salary_range && <span className="flex items-center gap-1"><DollarSign size={10} />{mandate.salary_range}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={"badge text-xs " + (mandate.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
            {mandate.status}
          </span>
          <ChevronRight size={14} className={"text-gray-400 transition-transform " + (open ? "rotate-90" : "")} />
        </div>
      </div>

      {open && (
        <div>
          <div className="flex border-b border-gray-100 px-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={"px-3 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px " + (activeTab === t.id ? "text-teal border-teal" : "text-gray-400 border-transparent hover:text-gray-600")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
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
                    <select
                      value={pendingStatusValue || mandate.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 capitalize"
                    >
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="filled">Filled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {confirmStatus && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800 font-medium mb-1">Close this mandate?</p>
                    <p className="text-xs text-amber-700 mb-3">
                      This will mark the mandate as <strong>{confirmStatus}</strong> and revoke client portal access.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={confirmStatusChange} className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">Confirm</button>
                      <button onClick={() => { setConfirmStatus(null); setPendingStatusValue(null) }} className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <a href={"/internal/mandates/" + mandate.id} className="btn-ghost text-xs flex items-center gap-1">
                    <ExternalLink size={10} /> Open mandate
                  </a>
                  <a href={"/client/" + mandate.id} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs flex items-center gap-1">
                    <ExternalLink size={10} /> View portal
                  </a>
                </div>
              </div>
            )}

            {activeTab === "commentary" && (
              <div className="space-y-4">
                <CommentaryComposer mandateId={mandate.id} onSend={refreshCommentary} />
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
                              {c.email_sent && <span className="ml-2 text-teal">Delivered</span>}
                            </div>
                          </div>
                          {c.pdf_url && (
                            <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs flex items-center gap-1 flex-shrink-0">
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

            {activeTab === "feedback" && (
              <div className="space-y-4">
                {generalFeedback.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">General feedback</div>
                    {generalFeedback.map(fb => (
                      <div key={fb.id} className="py-3 border-b border-gray-50 last:border-0">
                        <p className="text-sm text-gray-700 leading-relaxed">{fb.comment}</p>
                        <div className="text-xs text-gray-400 mt-1">{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Candidate feedback</div>
                  {candidateFeedback.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No candidate feedback yet</p>
                  ) : (
                    candidateFeedback.map(fb => {
                      const sentiment = ratingToSentiment(fb.rating)
                      return (
                      <div
                        key={fb.id}
                        onClick={() => setFbPopup(fb)}
                        className="flex items-start gap-3 py-3 cursor-pointer hover:bg-gray-50 rounded-xl -mx-2 px-2 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="mt-0.5 flex-shrink-0">{getSentimentIcon(sentiment)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-gray-900 text-sm">{fb.application?.candidate?.name || "Unknown"}</span>
                            {fb.rating && <span className={"badge text-xs " + getSentimentBadge(sentiment)}>{fb.rating}</span>}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{fb.comment}</p>
                        </div>
                        <span className="text-xs text-gray-300 flex-shrink-0">{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === "interviews" && (
              <div>
                {interviews.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No interview requests for this mandate</p>
                ) : (
                  interviews.map(ir => (
                    <InterviewRequestCard key={ir.id} ir={ir}
                      onAssign={updateAssignee} onStatus={updateStatus} onConfirmDetails={updateInterviewDetails} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {fbPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setFbPopup(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-bold text-gray-900">Feedback on {fbPopup.application?.candidate?.name}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(fbPopup.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {fbPopup.rating && <span className={"badge text-xs " + getSentimentBadge(ratingToSentiment(fbPopup.rating))}>{fbPopup.rating}</span>}
                <button onClick={() => setFbPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-5">{fbPopup.comment}</p>
            <div className="flex gap-3">
              {fbPopup.application?.candidate?.id && (
                <a href={"/internal/candidates/" + fbPopup.application.candidate.id} className="btn-primary text-sm">Open candidate profile</a>
              )}
              <button onClick={() => setFbPopup(null)} className="btn-ghost text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [rightTab, setRightTab] = useState<RightTab>("mandates")

  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [mandateRows, setMandateRows] = useState([{ title: "", location: "", salary_range: "", job_description: "" }])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null)
  const [duplicateClient, setDuplicateClient] = useState<any>(null)
  const [pendingMandates, setPendingMandates] = useState<any[]>([])

  const [detailFeedback, setDetailFeedback] = useState<any[]>([])
  const [detailInterviews, setDetailInterviews] = useState<any[]>([])
  const [detailMandates, setDetailMandates] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<any>(null)
  const [revoking, setRevoking] = useState(false)
  const [showAddMandate, setShowAddMandate] = useState(false)
  const [mandateView, setMandateView] = useState<"active" | "history">("active")
  const [newMandate, setNewMandate] = useState({ title: "", location: "", salary_range: "", job_description: "" })
  const [addingMandate, setAddingMandate] = useState(false)

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    if (selected) {
      loadDetail(selected.id)
      const params = new URLSearchParams(window.location.search)
      setRightTab((params.get("tab") as RightTab) || "mandates")
      setMandateView("active")
    }
  }, [selected])

  async function loadClients() {
    setLoadingClients(true)
    const { data } = await supabase.from("client_users").select("*").order("created_at", { ascending: false })
    setClients(data || [])
    if (data && data.length > 0 && !selected) {
      const params = new URLSearchParams(window.location.search)
      const targetId = params.get("client")
      const target = targetId ? data.find(c => c.id === targetId) : null
      setSelected(target || data[0])
    }
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

  async function confirmInterviewDetails(id: string, details: { confirmed_date: string; confirmed_time: string; format: string; interviewer: string }) {
    const current = detailInterviews.find(ir => ir.id === id)
    const nextStatus = current?.status === "new" ? "in_progress" : current?.status
    await supabase.from("client_interview_requests").update({
      confirmed_date: details.confirmed_date || null,
      confirmed_time: details.confirmed_time || null,
      format: details.format || null,
      interviewer: details.interviewer || null,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (selected) loadDetail(selected.id)
  }

  function updateMandateRow(idx: number, field: string, value: string) {
    setMandateRows(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  async function handleCreate() {
    if (!contactName || !contactEmail || !companyName) { setCreateError("Name, email and company are required."); return }
    if (mandateRows.some(m => !m.title)) { setCreateError("Each mandate needs a job title."); return }
    setCreating(true)
    setCreateError("")

    // Check for duplicate email BEFORE creating anything
    const emailNorm = contactEmail.toLowerCase().trim()
    const { data: existingCheck } = await supabase
      .from("client_users")
      .select("id, full_name, company_name, email")
      .ilike("email", emailNorm)
      .maybeSingle()

    if (existingCheck) {
      // Duplicate found — create the mandates then show warning
      const createdIds: string[] = []
      for (const m of mandateRows) {
        const { data: mandate, error: mErr } = await supabase.from("mandates").insert([{
          title: m.title, client_name: companyName,
          location: m.location || null, salary_range: m.salary_range || null,
          job_description: m.job_description || null, status: "active",
        }]).select("id").single()
        if (!mErr && mandate) createdIds.push(mandate.id)
      }
      setPendingMandates(createdIds.map((mid, i) => ({ id: mid, title: mandateRows[i]?.title })))
      setDuplicateClient(existingCheck)
      setCreating(false)
      return
    }

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: contactName, email: contactEmail, phone: contactPhone || undefined, company_name: companyName, mandate_id: createdIds[0], mandate_name: mandateRows[0].title, temp_password: password }),
      })
      const data = await res.json()
      if (data.error) {
        // Check if API returned an existing client (duplicate email caught server-side)
        if (data.existing_client || data.error.includes("already been registered") || data.error.includes("already registered")) {
          const existingInfo = data.existing_client || existingCheck
          if (existingInfo) {
            setPendingMandates(createdIds.map((mid: string, i: number) => ({ id: mid, title: mandateRows[i]?.title })))
            setDuplicateClient(existingInfo)
            setCreating(false)
            return
          }
        }
        for (const mid of createdIds) {
          await supabase.from("mandates").delete().eq("id", mid)
        }
        setCreateError("Something went wrong. Please check your details and try again.")
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

  async function handleLinkToExisting() {
    if (!duplicateClient || pendingMandates.length === 0) return
    for (const m of pendingMandates) {
      await supabase.from("mandates").update({ client_user_id: duplicateClient.id }).eq("id", m.id)
    }
    setDuplicateClient(null)
    setPendingMandates([])
    setContactName(""); setContactEmail(""); setCompanyName("")
    setMandateRows([{ title: "", location: "", salary_range: "", job_description: "" }])
    setShowForm(false)
    await loadClients()
    // Select the existing client
    const { data } = await supabase.from("client_users").select("*").eq("id", duplicateClient.id).single()
    if (data) setSelected(data)
  }

  async function handleCancelDuplicate() {
    // Delete the mandates we created since user wants to use a different email
    for (const m of pendingMandates) {
      await supabase.from("mandates").delete().eq("id", m.id)
    }
    setDuplicateClient(null)
    setPendingMandates([])
  }

  async function handleAddMandate() {
    if (!newMandate.title || !selected) return
    setAddingMandate(true)
    const { error } = await supabase.from("mandates").insert([{
      title: newMandate.title, client_name: selected.company_name,
      location: newMandate.location || null, salary_range: newMandate.salary_range || null,
      job_description: newMandate.job_description || null, status: "active",
      client_user_id: selected.id,
    }])
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

  const filtered = clients.filter(c =>
    (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  )

  const RIGHT_TABS: { id: RightTab; label: string }[] = [
    { id: "mandates", label: "Mandates" },
    { id: "feedback", label: "Feedback" },
    { id: "interviews", label: "Interview requests" },
  ]

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 -mx-6 -my-6 overflow-hidden">

      <div className="w-72 border-r border-gray-100 flex flex-col bg-white flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Clients</h1>
            <button onClick={() => {
                setShowForm(f => !f)
                setCreateError("")
                setCreatedInfo(null)
                setDuplicateClient(null)
                setPendingMandates([])
                setContactName("")
                setContactEmail("")
                setCompanyName("")
                setMandateRows([{ title: "", location: "", salary_range: "", job_description: "" }])
              }} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
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
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={"px-4 py-3 cursor-pointer border-b border-gray-50 transition-all border-l-2 " + (selected?.id === c.id ? "bg-teal/5 border-l-teal" : "hover:bg-gray-50 border-l-transparent")}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {(c.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{c.company_name || c.full_name}</div>
                    <div className="text-xs text-gray-400 truncate">{c.full_name}</div>
                  </div>
                  <div className={"w-2 h-2 rounded-full flex-shrink-0 " + (c.is_active ? "bg-teal" : "bg-gray-300")} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Select a client to view details</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-shrink-0 bg-white border-b border-gray-100">
              <div className="px-6 py-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(selected.full_name || "?").charAt(0).toUpperCase()}
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
                    <span className={"badge text-xs " + (selected.is_active ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-400")}>
                      {selected.is_active ? "Active" : "Inactive"}
                    </span>
                    {selected.is_active && (
                      <button
                        onClick={() => setRevokeTarget(selected)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-0 px-6 max-w-3xl mx-auto">
                {RIGHT_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setRightTab(t.id)}
                    className={"px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px " + (rightTab === t.id ? "text-teal border-teal" : "text-gray-400 border-transparent hover:text-gray-600")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-3xl mx-auto p-6 space-y-4">

                {rightTab === "mandates" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        <button
                          onClick={() => setMandateView("active")}
                          className={"px-3 py-1.5 text-xs font-medium rounded-md transition-all " + (mandateView === "active" ? "bg-white text-teal shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => setMandateView("history")}
                          className={"px-3 py-1.5 text-xs font-medium rounded-md transition-all " + (mandateView === "history" ? "bg-white text-teal shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                          History
                        </button>
                      </div>
                      {selected.is_active && mandateView === "active" && (
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
                            <input value={newMandate.title} onChange={e => setNewMandate(p => ({ ...p, title: e.target.value }))} placeholder="e.g. VP Sales" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                            <input value={newMandate.location} onChange={e => setNewMandate(p => ({ ...p, location: e.target.value }))} placeholder="Cairo, Egypt" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Salary range</label>
                            <input value={newMandate.salary_range} onChange={e => setNewMandate(p => ({ ...p, salary_range: e.target.value }))} placeholder="40,000-60,000 EGP" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Job description <span className="text-teal text-xs">AI Ready</span></label>
                            <textarea value={newMandate.job_description} onChange={e => setNewMandate(p => ({ ...p, job_description: e.target.value }))} rows={3} placeholder="Paste the full job description" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleAddMandate} disabled={addingMandate || !newMandate.title} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                            {addingMandate ? <><Loader2 size={11} className="animate-spin" /> Adding...</> : "Add mandate"}
                          </button>
                          <button onClick={() => setShowAddMandate(false)} className="btn-ghost text-xs">Cancel</button>
                        </div>
                      </div>
                    )}

                    {loadingDetail ? (
                      <div className="card text-center py-8"><Loader2 size={18} className="animate-spin mx-auto text-teal" /></div>
                    ) : mandateView === "active" ? (
                      detailMandates.filter(m => m.status === "active" || m.status === "on_hold").length === 0 ? (
                        <div className="card border-dashed text-center py-8">
                          <p className="text-gray-400 text-sm">No active mandates</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {detailMandates.filter(m => m.status === "active" || m.status === "on_hold").map(m => (
                            <MandateCard key={m.id} mandate={m} clientId={selected.id}
                            onStatusChange={(_mandateId, _status) => {
                              if (selected) loadDetail(selected.id)
                            }} />
                          ))}
                        </div>
                      )
                    ) : (
                      detailMandates.filter(m => m.status === "filled" || m.status === "cancelled").length === 0 ? (
                        <div className="card border-dashed text-center py-8">
                          <p className="text-gray-400 text-sm">No historical mandates</p>
                        </div>
                      ) : (
                        <div className="space-y-3 opacity-70">
                          {detailMandates.filter(m => m.status === "filled" || m.status === "cancelled").map(m => (
                            <MandateCard key={m.id} mandate={m} clientId={selected.id}
                            onStatusChange={(_mandateId, _status) => {
                              if (selected) loadDetail(selected.id)
                            }} />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}

                {rightTab === "feedback" && (
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-3">All client feedback</h3>
                    {detailFeedback.length === 0 ? (
                      <div className="card border-dashed text-center py-10">
                        <MessageSquare size={24} className="mx-auto mb-2 text-gray-200" />
                        <p className="text-gray-400 text-sm">No feedback yet</p>
                      </div>
                    ) : (
                      <div className="card divide-y divide-gray-50">
                        {detailFeedback.map(fb => {
                          const sentiment = ratingToSentiment(fb.rating)
                          return (
                          <div key={fb.id} className="flex items-start gap-3 p-4">
                            <div className="mt-0.5 flex-shrink-0">{getSentimentIcon(sentiment)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-gray-900 text-sm">{fb.application?.candidate?.name || "General"}</span>
                                {fb.rating && <span className={"badge text-xs " + getSentimentBadge(sentiment)}>{fb.rating}</span>}
                                {fb.mandate?.title && <span className="text-xs text-gray-400">{fb.mandate.title}</span>}
                              </div>
                              <p className="text-xs text-gray-500">{fb.comment}</p>
                            </div>
                            <span className="text-xs text-gray-300 flex-shrink-0">{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {rightTab === "interviews" && (
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-3">All interview requests</h3>
                    {detailInterviews.length === 0 ? (
                      <div className="card border-dashed text-center py-10">
                        <Calendar size={24} className="mx-auto mb-2 text-gray-200" />
                        <p className="text-gray-400 text-sm">No interview requests yet</p>
                      </div>
                    ) : (
                      <div className="card divide-y divide-gray-50">
                        {detailInterviews.map(ir => (
                          <InterviewRequestCard key={ir.id} ir={ir} showMandate
                            onAssign={(id, name) => supabase.from("client_interview_requests").update({ assigned_to_name: name }).eq("id", id).then(() => loadDetail(selected.id))}
                            onStatus={(id, status) => supabase.from("client_interview_requests").update({ status }).eq("id", id).then(() => loadDetail(selected.id))}
                            onConfirmDetails={confirmInterviewDetails} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && !createdInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-gray-900">New client</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              {createError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{createError}</div>}

              {duplicateClient && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 mb-1">This email is already registered</p>
                      <p className="text-sm text-amber-800 mb-3">
                        <strong>{duplicateClient.full_name}</strong> ({duplicateClient.company_name}) already has an account with this email.
                        Would you like to add {pendingMandates.map(m => m.title).join(", ")} to their existing account instead?
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleLinkToExisting} className="text-xs px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium">
                          Yes, add to {duplicateClient.company_name}
                        </button>
                        <button onClick={handleCancelDuplicate} className="text-xs px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                          No, use a different email
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name *</label>
                    <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ahmed Hassan" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
                    <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="ahmed@company.com" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                    <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+20 100 123 4567" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company *</label>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="TechCorp Egypt" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Mandates</p>
                  <button onClick={() => setMandateRows(p => [...p, { title: "", location: "", salary_range: "", job_description: "" }])} className="text-xs text-teal hover:underline flex items-center gap-1"><Plus size={10} /> Add mandate</button>
                </div>
                <div className="space-y-3">
                  {mandateRows.map((m, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">{mandateRows.length > 1 ? "Mandate " + (idx + 1) : "Mandate"}</span>
                        {mandateRows.length > 1 && <button onClick={() => setMandateRows(p => p.filter((_, i) => i !== idx))} className="text-xs text-gray-400 hover:text-red-500">Remove</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Job title *</label>
                          <input value={m.title} onChange={e => updateMandateRow(idx, "title", e.target.value)} placeholder="e.g. Chief Financial Officer" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                          <input value={m.location} onChange={e => updateMandateRow(idx, "location", e.target.value)} placeholder="Cairo, Egypt" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Salary range</label>
                          <input value={m.salary_range} onChange={e => updateMandateRow(idx, "salary_range", e.target.value)} placeholder="40,000-60,000 EGP" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Job description <span className="text-teal text-xs">AI Ready</span></label>
                          <textarea value={m.job_description} onChange={e => updateMandateRow(idx, "job_description", e.target.value)} rows={4} placeholder="Paste the full job description" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none bg-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {creating ? <><Loader2 size={13} className="animate-spin" /> Creating...</> : <><CheckCircle size={13} /> Create client &amp; mandate</>}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createdInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} className="text-teal" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Client created</div>
                <div className="text-sm text-gray-500 mt-0.5">Share these credentials — not shown again</div>
              </div>
            </div>
            <div className="font-mono text-sm bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 mb-5">
              <div><span className="text-gray-400">Login URL:</span> <span className="text-gray-900">{typeof window !== "undefined" ? window.location.origin : ""}/client/login</span></div>
              <div><span className="text-gray-400">Email:</span> <span className="text-gray-900">{createdInfo.email}</span></div>
              <div><span className="text-gray-400">Password:</span> <span className="text-gray-900 font-bold">{createdInfo.password}</span></div>
            </div>
            <button
              onClick={() => setCreatedInfo(null)}
              className="btn-primary w-full text-center"
            >
              Done
            </button>
          </div>
        </div>
      )}

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
            <p className="text-sm text-gray-600 leading-relaxed mb-5">This will immediately remove their access to the client portal. They will no longer be able to log in.</p>
            <div className="flex gap-3">
              <button onClick={() => handleRevoke(revokeTarget)} disabled={revoking} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
                {revoking ? "Revoking..." : "Yes, revoke access"}
              </button>
              <button onClick={() => setRevokeTarget(null)} className="flex-1 btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
