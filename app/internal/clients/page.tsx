"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Plus, Building2, ExternalLink, Trash2, MessageSquare,
  Send, FileText, CheckCircle, Loader2,
  ThumbsUp, ThumbsDown, Minus, RefreshCw, X, AlertTriangle
} from "lucide-react"

const TEAM_MEMBERS = ["Mona", "Juana"]

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

type TabId = "accounts" | "feedback" | "interviews" | "commentary"

export default function ClientsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabId>("accounts")

  const [clients, setClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [mandateName, setMandateName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<any>(null)
  const [revoking, setRevoking] = useState(false)

  const [feedback, setFeedback] = useState<any[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [feedbackPopup, setFeedbackPopup] = useState<any>(null)

  const [interviews, setInterviews] = useState<any[]>([])
  const [loadingInterviews, setLoadingInterviews] = useState(false)

  const [mandates, setMandates] = useState<any[]>([])
  const [selectedMandate, setSelectedMandate] = useState("")
  const [commentaryText, setCommentaryText] = useState("")
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [pastCommentary, setPastCommentary] = useState<any[]>([])

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    if (tab === "feedback") loadFeedback()
    if (tab === "interviews") loadInterviews()
    if (tab === "commentary") loadCommentaryData()
  }, [tab])

  async function loadClients() {
    setLoadingClients(true)
    const { data } = await supabase.from("client_users").select("*").order("created_at", { ascending: false })
    setClients(data || [])
    setLoadingClients(false)
  }

  async function loadFeedback() {
    setLoadingFeedback(true)
    const { data } = await supabase
      .from("client_feedback")
      .select("*, application:applications(id, candidate:candidates(id, name, current_title)), client_user:client_users(full_name, company_name)")
      .order("created_at", { ascending: false })
    setFeedback(data || [])
    setLoadingFeedback(false)
  }

  async function loadInterviews() {
    setLoadingInterviews(true)
    const { data } = await supabase
      .from("client_interview_requests")
      .select("*, application:applications(candidate:candidates(name, current_title)), client_user:client_users(full_name, company_name), mandate:mandates(title)")
      .order("created_at", { ascending: false })
    setInterviews(data || [])
    setLoadingInterviews(false)
  }

  async function loadCommentaryData() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from("mandates").select("id, title, client_name").in("status", ["active", "open"]).order("created_at", { ascending: false }),
      supabase.from("mandate_commentary").select("*, mandate:mandates(title)").order("created_at", { ascending: false }),
    ])
    setMandates(m || [])
    setPastCommentary(c || [])
    if (m && m.length > 0 && !selectedMandate) setSelectedMandate(m[0].id)
  }

  async function handleCreateClient() {
    if (!fullName || !email || !mandateName) {
      setCreateError("Name, email and mandate are required.")
      return
    }
    setCreating(true)
    setCreateError("")
    const password = generatePassword()
    try {
      const res = await fetch("/api/create-client-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          company_name: company,
          mandate_name: mandateName,
          temp_password: password,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setCreateError(data.error)
        setCreating(false)
        return
      }
      setCreatedInfo({ email, password })
      setFullName(""); setEmail(""); setCompany(""); setMandateName("")
      setShowForm(false)
      loadClients()
    } catch {
      setCreateError("Failed to create account.")
    }
    setCreating(false)
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
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, status } : ir))
  }

  async function handleInterviewAssign(id: string, name: string) {
    await supabase.from("client_interview_requests").update({ assigned_to_name: name }).eq("id", id)
    setInterviews(prev => prev.map(ir => ir.id === id ? { ...ir, assigned_to_name: name } : ir))
  }

  async function handleSendCommentary() {
    if (!commentaryText.trim() || !selectedMandate) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    try {
      const res = await fetch("/api/send-commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandate_id: selectedMandate, commentary_text: commentaryText.trim(), created_by: user?.id }),
      })
      const data = await res.json()
      if (data.error) { alert("Error: " + data.error); setSending(false); return }
      setCommentaryText("")
      setSentOk(true)
      setTimeout(() => setSentOk(false), 5000)
      loadCommentaryData()
    } catch {
      alert("Failed to send.")
    }
    setSending(false)
  }

  const sentimentBadge = (s: string) => {
    if (s === "positive") return "bg-teal/10 text-teal"
    if (s === "negative") return "bg-amber-100 text-amber-700"
    return "bg-gray-100 text-gray-500"
  }

  const statusBadge = (s: string) => {
    if (s === "in_progress") return { label: "In progress", cls: "bg-amber-100 text-amber-700" }
    if (s === "done") return { label: "Done", cls: "bg-green-100 text-green-700" }
    return { label: "New", cls: "bg-blue-100 text-blue-700" }
  }

  const activeClients = clients.filter(c => c.is_active)
  const inactiveClients = clients.filter(c => !c.is_active)
  const pendingInterviews = interviews.filter(ir => ir.status !== "done")
  const doneInterviews = interviews.filter(ir => ir.status === "done")

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">Accounts, feedback, interview requests and commentary</p>
        </div>
        {tab === "accounts" && (
          <button onClick={() => { setShowForm(f => !f); setCreateError(""); setCreatedInfo(null) }}
            className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Add client
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <TabButton id="accounts"   label="Accounts"           count={activeClients.length}    current={tab} onClick={setTab} />
        <TabButton id="feedback"   label="Feedback"           count={feedback.length}          current={tab} onClick={setTab} />
        <TabButton id="interviews" label="Interview requests" count={pendingInterviews.length} current={tab} onClick={setTab} />
        <TabButton id="commentary" label="Commentary"         count={null}                     current={tab} onClick={setTab} />
      </div>

      {tab === "accounts" && (
        <div className="space-y-4">

          {createdInfo && (
            <div className="card p-4 border border-teal/30 bg-teal/5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-teal font-semibold text-sm">
                    <CheckCircle size={15} /> Account created — share these credentials with the client
                  </div>
                  <div className="text-xs font-mono bg-white rounded-lg p-3 border border-teal/20 space-y-1">
                    <div><span className="text-gray-400">Login:</span> {window.location.origin}/client/login</div>
                    <div><span className="text-gray-400">Email:</span> {createdInfo.email}</div>
                    <div><span className="text-gray-400">Password:</span> {createdInfo.password}</div>
                  </div>
                  <p className="text-xs text-gray-400">Share via WhatsApp or phone — not shown again</p>
                </div>
                <button onClick={() => setCreatedInfo(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {showForm && (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">New client account</h3>
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{createError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full name *</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Ahmed Hassan"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@company.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mandate *</label>
                  <input value={mandateName} onChange={e => setMandateName(e.target.value)} placeholder="e.g. CFO Search — TechCorp"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Company</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. TechCorp Egypt"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateClient} disabled={creating}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><CheckCircle size={13} /> Create &amp; send welcome email</>}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              </div>
              <p className="text-xs text-gray-400">A welcome email with login credentials is sent automatically.</p>
            </div>
          )}

          {loadingClients ? (
            <div className="card text-center py-12"><Loader2 size={20} className="animate-spin mx-auto text-teal" /></div>
          ) : clients.length === 0 ? (
            <div className="card border-dashed text-center py-14">
              <Building2 size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">No client accounts yet</p>
              <p className="text-gray-300 text-sm mt-1">Click &quot;Add client&quot; to create the first one</p>
            </div>
          ) : (
            <div className="card divide-y divide-gray-50">
              {activeClients.map(cu => (
                <div key={cu.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {cu.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{cu.full_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cu.email}{cu.company_name ? ` · ${cu.company_name}` : ""}</div>
                    {cu.mandate_name && <div className="text-xs text-gray-400 mt-0.5">{cu.mandate_name}</div>}
                  </div>
                  <span className="badge bg-teal/10 text-teal text-xs">Active</span>
                  <div className="flex gap-2 flex-shrink-0">
                    {cu.mandate_id && (
                      <a href={`/client/${cu.mandate_id}`} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost text-xs flex items-center gap-1">
                        <ExternalLink size={11} /> Portal
                      </a>
                    )}
                    <button onClick={() => setRevokeTarget(cu)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-1">
                      <Trash2 size={11} /> Revoke
                    </button>
                  </div>
                </div>
              ))}
              {inactiveClients.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Inactive</span>
                  </div>
                  {inactiveClients.map(cu => (
                    <div key={cu.id} className="flex items-center gap-3 p-4 opacity-50">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm flex-shrink-0">
                        {cu.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-700 text-sm">{cu.full_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{cu.email}</div>
                        {cu.mandate_name && <div className="text-xs text-gray-300 mt-0.5">{cu.mandate_name}</div>}
                      </div>
                      <span className="badge bg-gray-100 text-gray-400 text-xs">Inactive</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">All client feedback — click any row to read in full</p>
            <button onClick={loadFeedback} className="text-xs text-teal hover:underline flex items-center gap-1">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
          {loadingFeedback ? (
            <div className="card text-center py-10"><Loader2 size={20} className="animate-spin mx-auto text-teal" /></div>
          ) : feedback.length === 0 ? (
            <div className="card border-dashed text-center py-12">
              <MessageSquare size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">No feedback yet</p>
            </div>
          ) : (
            <div className="card divide-y divide-gray-50">
              {feedback.map(fb => (
                <div key={fb.id} className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setFeedbackPopup(fb)}>
                  {fb.sentiment === "positive" ? <ThumbsUp size={15} className="mt-0.5 flex-shrink-0 text-teal" /> : fb.sentiment === "negative" ? <ThumbsDown size={15} className="mt-0.5 flex-shrink-0 text-amber-500" /> : <Minus size={15} className="mt-0.5 flex-shrink-0 text-gray-400" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{fb.application?.candidate?.name || "Unknown"}</span>
                      <span className={`badge text-xs ${sentimentBadge(fb.sentiment || "neutral")}`}>{fb.sentiment || "neutral"}</span>
                      <span className="text-xs text-gray-400">{fb.client_user?.full_name}</span>
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
      )}

      {tab === "interviews" && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Assign to a team member to avoid duplication</p>
            <button onClick={loadInterviews} className="text-xs text-teal hover:underline flex items-center gap-1">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
          {loadingInterviews ? (
            <div className="card text-center py-10"><Loader2 size={20} className="animate-spin mx-auto text-teal" /></div>
          ) : interviews.length === 0 ? (
            <div className="card border-dashed text-center py-12">
              <p className="text-gray-400 font-medium">No interview requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInterviews.length > 0 && (
                <div className="card divide-y divide-gray-50">
                  {pendingInterviews.map(ir => {
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
                            {ir.client_user && (
                              <div className="text-xs text-gray-500 mb-2">
                                Requested by {ir.client_user.full_name}{ir.client_user.company_name ? ` · ${ir.client_user.company_name}` : ""}
                              </div>
                            )}
                            {ir.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">{ir.notes}</p>}
                            <div className="text-xs text-gray-300">
                              {new Date(ir.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
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
                                  className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">
                                  In progress
                                </button>
                              )}
                              <button onClick={() => handleInterviewStatus(ir.id, "done")}
                                className="text-xs px-2.5 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {doneInterviews.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Completed</p>
                  <div className="card divide-y divide-gray-50 opacity-60">
                    {doneInterviews.map(ir => (
                      <div key={ir.id} className="flex items-center gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-700 text-sm">{ir.application?.candidate?.name || "Unknown"}</span>
                            <span className="badge text-xs bg-green-100 text-green-700">Done</span>
                            {ir.assigned_to_name && <span className="text-xs text-gray-400">assigned to {ir.assigned_to_name}</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {ir.mandate?.title} · {new Date(ir.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "commentary" && (
        <div className="grid grid-cols-2 gap-6 items-start max-w-4xl">
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Send size={13} className="text-teal" /> Send market commentary
              </h3>
              <p className="text-xs text-gray-400 mt-1">Generates a branded PDF, emails the client, posts to their portal</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mandate</label>
              <select value={selectedMandate} onChange={e => setSelectedMandate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white">
                {mandates.map(m => (
                  <option key={m.id} value={m.id}>{m.title}{m.client_name ? ` — ${m.client_name}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Commentary</label>
              <textarea value={commentaryText} onChange={e => setCommentaryText(e.target.value)} rows={8}
                placeholder="Write your market commentary here&#x2026;"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none leading-relaxed" />
            </div>
            {sentOk && (
              <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-3 flex items-center gap-2 text-teal text-sm font-semibold">
                <CheckCircle size={14} /> Sent — PDF generated, email delivered, portal updated
              </div>
            )}
            <button onClick={handleSendCommentary} disabled={sending || !commentaryText.trim() || !selectedMandate}
              className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-40">
              {sending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send to client</>}
            </button>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Sent commentary</h3>
            {pastCommentary.length === 0 ? (
              <div className="card border-dashed text-center py-10">
                <FileText size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-gray-400 text-sm">No commentary sent yet</p>
              </div>
            ) : (
              <div className="card divide-y divide-gray-50">
                {pastCommentary.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{c.mandate?.title || "Unknown mandate"}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {c.email_sent && <span className="ml-2 text-teal">Delivered</span>}
                      </div>
                    </div>
                    {c.pdf_url && (
                      <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost text-xs flex items-center gap-1">
                        <FileText size={11} /> PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
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

      {feedbackPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          onClick={() => setFeedbackPopup(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-bold text-gray-900">Feedback on {feedbackPopup.application?.candidate?.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {feedbackPopup.client_user?.full_name} · {new Date(feedbackPopup.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge text-xs ${sentimentBadge(feedbackPopup.sentiment || "neutral")}`}>{feedbackPopup.sentiment || "neutral"}</span>
                <button onClick={() => setFeedbackPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-5">{feedbackPopup.feedback_text}</p>
            <div className="flex gap-3">
              {feedbackPopup.application?.candidate?.id && (
                <a href={`/internal/candidates/${feedbackPopup.application.candidate.id}`}
                  className="btn-primary text-sm">Open candidate profile</a>
              )}
              <button onClick={() => setFeedbackPopup(null)} className="btn-ghost text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function TabButton({ id, label, count, current, onClick }: {
  id: TabId; label: string; count: number | null; current: TabId; onClick: (id: TabId) => void
}) {
  const active = id === current
  return (
    <button onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${active ? "bg-white text-teal shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
      {label}
      {count !== null && count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-teal/10 text-teal" : "bg-gray-200 text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  )
}
