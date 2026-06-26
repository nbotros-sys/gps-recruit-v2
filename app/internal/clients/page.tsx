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
  const [showAddMandate, setShowAddMandate] = useState(false)
  const [newMandate, setNewMandate] = useState({ title: "", location: "", salary_range: "", job_description: "" })
  const [addingMandate, setAddingMandate] = useState(false)

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    if (selected) loadDetail(selected.id)
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
        if (mErr) { setCreateError("Failed to create mandate: " + mErr.message); setCreating(false); return }
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
          : data.error
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
    } catch (e: any) { setCreateError("Something went wrong: " + e.message) }
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

  const sentimentIcon = (s: string) => {
    if (s === "positive") return <ThumbsUp size={13} className="text-teal" />
    if (s === "negative") return <ThumbsDown size={13} className="text-amber-500" />
    return <Minus size={13} className="text-gray-400" />
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
          <div className="max-w-3xl mx-auto p-6 space-y-6">

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

            {/* Client header */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {selected.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-base">{selected.full_name}</div>
                    {selected.company_name && <div className="text-sm text-gray-600 mt-0.5">{selected.company_name}</div>}
                    <div className="text-sm text-teal mt-0.5">{selected.email}</div>
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

            {/* Mandates */}
            <div>
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
                    <div key={m.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{m.title}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {m.location && <span className="flex items-center gap-1"><MapPin size={10} />{m.location}</span>}
                            {m.salary_range && <span className="flex items-center gap-1"><DollarSign size={10} />{m.salary_range}</span>}
                          </div>
                        </div>
                        <span className={`badge text-xs flex-shrink-0 ${m.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a href={`/internal/mandates/${m.id}`}
                          className="btn-ghost text-xs flex items-center gap-1">
                          <ExternalLink size={10} /> Open mandate
                        </a>
                        <button onClick={() => { setCommentaryTarget(m); setCommentaryText("") }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-teal/5 border border-teal/20 text-teal hover:bg-teal/10 transition-colors flex items-center gap-1">
                          <Send size={10} /> Send commentary
                        </button>
                        <a href={`/client/${m.id}`} target="_blank" rel="noopener noreferrer"
                          className="btn-ghost text-xs flex items-center gap-1">
                          <ExternalLink size={10} /> View portal
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Client feedback</h3>
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

            {/* Interview requests */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Interview requests</h3>
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
        )}
      </div>

      {/* ── COMMENTARY MODAL ── */}
      {commentaryTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-bold text-gray-900">Send market commentary</div>
                <div className="text-xs text-gray-400 mt-1">{commentaryTarget.title} · {selected?.company_name}</div>
              </div>
              <button onClick={() => setCommentaryTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <textarea value={commentaryText} onChange={e => setCommentaryText(e.target.value)} rows={8}
              placeholder="Write your market commentary here&#x2026;"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none leading-relaxed mb-4" />
            {sentOk && (
              <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-3 flex items-center gap-2 text-teal text-sm font-semibold mb-3">
                <CheckCircle size={14} /> Sent — PDF generated, email delivered, portal updated
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleSendCommentary} disabled={sending || !commentaryText.trim()}
                className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-40">
                {sending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send to client</>}
              </button>
              <button onClick={() => setCommentaryTarget(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

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
      {feedbackPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setFeedbackPopup(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-bold text-gray-900">Feedback on {feedbackPopup.application?.candidate?.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {feedbackPopup.mandate?.title && `${feedbackPopup.mandate.title} · `}
                  {new Date(feedbackPopup.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
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
                <a href={`/internal/candidates/${feedbackPopup.application.candidate.id}`} className="btn-primary text-sm">
                  Open candidate profile
                </a>
              )}
              <button onClick={() => setFeedbackPopup(null)} className="btn-ghost text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
