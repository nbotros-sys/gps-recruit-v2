"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"
import { cleanCvText } from "@/lib/clean-cv"
import { openSecureFile } from "@/lib/secure-file"
import {
  MessageSquare, Send, Phone, Mail, MapPin, ExternalLink, Search, Loader2, CheckCheck,
  X, FileText, Briefcase, Star, ArrowRight, CalendarClock, StickyNote, Archive,
  Download, Users, Building2, Link2, Plus, Clock,
} from "lucide-react"

const STAGE_ORDER = ["new", "screening", "interview", "shortlisted", "offered", "placed"]
const STAGE_LABEL: Record<string, string> = {
  new: "Received", screening: "Screening", interview: "Interview",
  shortlisted: "Shortlisted", offered: "Offer", placed: "Placed", rejected: "Rejected", on_hold: "On hold",
}
const SOURCE_LABELS: Record<string, string> = {
  direct: "CV Import", linkedin: "LinkedIn", portal: "Job Portal", referral: "Referral",
  wuzzuf: "Wuzzuf", bayt: "Bayt", whatsapp: "WhatsApp", other: "Other",
}
const scoreColor = (s: number) => (s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af")

type Candidate = { id: string; name: string; current_title?: string; current_company?: string; avatar_url?: string | null; email?: string; phone?: string; location?: string; source?: string; dob?: string; notes?: string; internal_notes?: string; cv_text?: string; cv_pdf_url?: string; cv_file_url?: string; cv_file_type?: string; cv_source?: string }
type App = { id: string; stage: string; ai_score?: number | null; created_at?: string; ai_summary?: string; mandate?: { id: string; title?: string; client_name?: string; location?: string } }
type Convo = {
  id: string; phone: string; candidate_id: string | null; wa_profile_name?: string | null
  unread_count: number; last_message_at?: string | null; last_message_preview?: string | null
  last_direction?: string | null; session_expires_at?: string | null; archived: boolean
  candidate?: Candidate | null; app?: App | null
}
type Msg = { id: string; direction: "in" | "out"; body?: string | null; template_name?: string | null; status?: string | null; created_at: string }

const CONVO_SELECT =
  "id,phone,candidate_id,wa_profile_name,unread_count,last_message_at,last_message_preview,last_direction,session_expires_at,archived,candidate:candidates(id,name,current_title,current_company,avatar_url,email,phone,location,source)"

function timeShort(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso), now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "short" })
}
const sessionOpen = (c?: Convo | null) => !!(c?.session_expires_at && new Date(c.session_expires_at) > new Date())
const convoName = (c: Convo) => c.candidate?.name || c.wa_profile_name || c.phone
const folderLabel = (a?: App | null) => (a?.mandate ? `${a.mandate.title || "Mandate"} · ${a.mandate.client_name || "—"}` : null)

export default function MessagesPage() {
  const supabase = createClient()
  const [convos, setConvos] = useState<Convo[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<"all" | "unread" | "unlinked" | "archived">("all")
  const [folder, setFolder] = useState("all")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any | null>(null)
  const [profileTab, setProfileTab] = useState<"overview" | "cv" | "roles" | "notes">("overview")
  const [showInterview, setShowInterview] = useState(false)
  const [linkModal, setLinkModal] = useState(false)
  const [toast, setToast] = useState("")
  const msgEnd = useRef<HTMLDivElement>(null)
  const selRef = useRef<string | null>(null)
  selRef.current = selId

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600) }

  const attachApps = useCallback(async (list: Convo[]) => {
    const ids = Array.from(new Set(list.filter(c => c.candidate_id).map(c => c.candidate_id))) as string[]
    if (ids.length === 0) return list
    const { data } = await supabase
      .from("applications")
      .select("id,candidate_id,stage,ai_score,created_at,mandate:mandates(id,title,client_name,location)")
      .in("candidate_id", ids)
      .order("created_at", { ascending: false })
    const byCand: Record<string, App> = {}
    for (const a of (data as any[]) || []) if (!byCand[a.candidate_id]) byCand[a.candidate_id] = a
    return list.map(c => ({ ...c, app: c.candidate_id ? byCand[c.candidate_id] || null : null }))
  }, [])

  const loadConvos = useCallback(async () => {
    const { data } = await supabase
      .from("wa_conversations").select(CONVO_SELECT)
      .order("last_message_at", { ascending: false, nullsFirst: false })
    const withApps = await attachApps(((data as any) || []) as Convo[])
    setConvos(withApps)
    setLoading(false)
  }, [attachApps])

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from("wa_messages")
      .select("id,direction,body,template_name,status,created_at")
      .eq("conversation_id", id).order("created_at", { ascending: true })
    setMsgs((data as any) || [])
  }, [])

  useEffect(() => { loadConvos() }, [loadConvos])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    const ping = () => { if (t) clearTimeout(t); t = setTimeout(() => { loadConvos(); if (selRef.current) loadMsgs(selRef.current) }, 500) }
    const ch = supabase.channel("wa-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_messages" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, ping)
      .subscribe()
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch) }
  }, [loadConvos, loadMsgs])

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])

  async function openConvo(c: Convo) {
    setSelId(c.id)
    loadMsgs(c.id)
    if (c.unread_count > 0) {
      await supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", c.id)
      setConvos(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x))
    }
  }

  async function send() {
    const text = draft.trim()
    if (!text || !selId || sending) return
    setSending(true); setDraft("")
    const temp: Msg = { id: "tmp" + Date.now(), direction: "out", body: text, status: "sending", created_at: new Date().toISOString() }
    setMsgs(prev => [...prev, temp])
    try {
      const r = await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selId, body: text }) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); setMsgs(prev => prev.map(m => m.id === temp.id ? { ...m, status: "failed" } : m)); flash(e.error || "Send failed") }
      else loadMsgs(selId)
    } catch { setMsgs(prev => prev.map(m => m.id === temp.id ? { ...m, status: "failed" } : m)) }
    setSending(false)
  }

  async function archive(c: Convo, val: boolean) {
    await supabase.from("wa_conversations").update({ archived: val }).eq("id", c.id)
    setConvos(prev => prev.map(x => x.id === c.id ? { ...x, archived: val } : x))
    if (selId === c.id) setSelId(null)
    flash(val ? "Archived" : "Restored to inbox")
  }

  async function advanceStage(c: Convo) {
    if (!c.app) { flash("No active application to advance"); return }
    const idx = STAGE_ORDER.indexOf(c.app.stage)
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) { flash("Already at final stage"); return }
    const next = STAGE_ORDER[idx + 1]
    await supabase.from("applications").update({ stage: next }).eq("id", c.app.id)
    if (["shortlisted", "rejected", "placed"].includes(next))
      fetch("/api/notify-candidate-stage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ application_id: c.app.id, stage: next }) }).catch(() => {})
    setConvos(prev => prev.map(x => x.id === c.id && x.app ? { ...x, app: { ...x.app, stage: next } } : x))
    flash(`Moved to “${STAGE_LABEL[next]}”`)
  }

  async function openProfile(c: Convo) {
    if (!c.candidate_id) return
    setProfileTab("overview")
    const { data } = await supabase.from("candidates").select("*").eq("id", c.candidate_id).maybeSingle()
    const { data: apps } = await supabase.from("applications")
      .select("id,stage,ai_score,ai_summary,created_at,mandate:mandates(id,title,client_name,location)")
      .eq("candidate_id", c.candidate_id).order("created_at", { ascending: false })
    setProfile({ ...(data as any), applications: apps || [] })
  }

  async function saveNote(text: string) {
    if (!profile) return
    await supabase.from("candidates").update({ internal_notes: text }).eq("id", profile.id)
    setProfile((p: any) => ({ ...p, internal_notes: text }))
    flash("Note saved to record")
  }

  async function sendRegisterInvite(c: Convo) {
    await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: c.id, body: "Thanks for your interest in GPS Recruitment! Register and upload your CV here so we can match you to roles: https://talnt.gps4hr.com/register" }) })
    loadMsgs(c.id); flash("Register invite sent")
  }

  async function sendTemplate(c: Convo) {
    const first = (c.candidate?.name || "").split(" ")[0] || "there"
    await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: c.id, body: `Hi ${first}, following up on the role we discussed — are you still interested in moving forward?` }) })
    loadMsgs(c.id); flash("Template sent · session reopens when they reply")
  }

  const sel = convos.find(c => c.id === selId) || null

  const folders: { id: string; label: string }[] = []
  const seen: Record<string, boolean> = {}
  for (const c of convos) if (c.app?.mandate?.id && !seen[c.app.mandate.id]) { seen[c.app.mandate.id] = true; folders.push({ id: c.app.mandate.id, label: folderLabel(c.app) || "" }) }

  const filtered = convos.filter(c => {
    if (filter === "archived") { if (!c.archived) return false } else if (c.archived) return false
    if (filter === "unread" && c.unread_count === 0) return false
    if (filter === "unlinked" && c.candidate_id) return false
    if (folder === "unlinked") { if (c.candidate_id) return false } else if (folder !== "all" && c.app?.mandate?.id !== folder) return false
    if (q) { const s = q.toLowerCase(); if (!(c.phone.toLowerCase().includes(s) || convoName(c).toLowerCase().includes(s))) return false }
    return true
  })

  return (
    <div className="flex h-full bg-cream overflow-hidden">
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-teal"><MessageSquare size={18} /><span className="font-semibold text-gray-800">WhatsApp</span></div>
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-teal" />
          </div>
          <select value={folder} onChange={e => setFolder(e.target.value)} className="w-full mt-2 px-2 py-1.5 text-xs bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-teal text-gray-600">
            <option value="all">📥 All conversations</option>
            {folders.map(f => <option key={f.id} value={f.id}>📁 {f.label}</option>)}
            <option value="unlinked">📁 Unlinked numbers</option>
          </select>
          <div className="flex gap-1.5 mt-2">
            {(["all", "unread", "unlinked", "archived"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[11px] px-2.5 py-1 rounded-full capitalize transition ${filter === f ? "bg-teal/10 text-teal font-medium" : "text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" size={18} /></div>
            : filtered.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm px-4">No conversations here.</div>
            : filtered.map(c => {
              const active = c.id === selId
              return (
                <div key={c.id} onClick={() => openConvo(c)} className={`group relative w-full flex gap-3 px-4 py-3 border-b border-gray-50 text-left cursor-pointer transition-colors ${active ? "bg-teal/5" : "hover:bg-gray-50"}`}>
                  {c.candidate ? <CandidateAvatar name={c.candidate.name} avatarUrl={c.candidate.avatar_url} size={42} />
                    : <div className="w-[42px] h-[42px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Phone size={16} /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium text-sm text-gray-800 truncate">{convoName(c)}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{timeShort(c.last_message_at)}</span>
                    </div>
                    {c.candidate
                      ? (c.app?.mandate && <div className="text-[11px] text-teal truncate">{c.app.mandate.title} · {c.app.mandate.client_name}</div>)
                      : <span className="inline-block text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium mt-0.5">Not in database</span>}
                    <div className="flex justify-between items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 truncate">{c.last_direction === "out" ? "You: " : ""}{c.last_message_preview || ""}</span>
                      {c.unread_count > 0 && <span className="flex-shrink-0 bg-teal text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-medium">{c.unread_count}</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); archive(c, !c.archived) }} title={c.archived ? "Restore" : "Archive"}
                    className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 w-6 h-6 rounded bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:border-amber-200 flex items-center justify-center transition"><Archive size={12} /></button>
                </div>
              )
            })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0" style={{ background: "#efeae2" }}>
        {!sel ? <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a conversation</div> : (
          <>
            <div className="h-14 bg-white border-b border-gray-100 flex items-center px-5 gap-3 flex-shrink-0">
              {sel.candidate ? <CandidateAvatar name={sel.candidate.name} avatarUrl={sel.candidate.avatar_url} size={34} />
                : <div className="w-[34px] h-[34px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Phone size={14} /></div>}
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{convoName(sel)}</div>
                <div className={`text-[11px] flex items-center gap-1 ${sessionOpen(sel) ? "text-green-600" : "text-amber-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sessionOpen(sel) ? "bg-green-500" : "bg-amber-500"}`} />
                  {sessionOpen(sel) ? "Session open · replies free for 24h" : "Session closed"}
                </div>
              </div>
              {sel.candidate_id && (
                <div className="ml-auto flex gap-2">
                  <button onClick={() => openProfile(sel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-teal hover:text-teal transition"><Users size={13} /> Profile</button>
                  <button onClick={() => advanceStage(sel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal text-white rounded-lg hover:bg-teal/90 transition"><ArrowRight size={13} /> Move stage</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {msgs.map(m => (
                <div key={m.id} className={`max-w-[70%] px-3 py-2 rounded-lg text-sm shadow-sm ${m.direction === "out" ? "ml-auto bg-[#d9fdd3]" : "bg-white"}`}>
                  {m.template_name && <div className="text-[9px] font-semibold uppercase tracking-wide text-green-700 mb-0.5">Template</div>}
                  <div className="text-gray-800 whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="text-[10px] text-gray-400 text-right mt-0.5 flex items-center justify-end gap-1">
                    {timeShort(m.created_at)}
                    {m.direction === "out" && m.status && <CheckCheck size={12} className={m.status === "failed" ? "text-red-400" : "text-gray-400"} />}
                  </div>
                </div>
              ))}
              <div ref={msgEnd} />
            </div>

            {sessionOpen(sel) ? (
              <div className="bg-white border-t border-gray-100 p-3 flex items-center gap-2 flex-shrink-0">
                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Type a message" className="flex-1 px-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-full outline-none focus:border-teal" />
                <button onClick={send} disabled={sending || !draft.trim()} className="w-10 h-10 rounded-full bg-teal text-white flex items-center justify-center disabled:opacity-40 hover:bg-teal/90 transition">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <div className="bg-amber-50 border-t border-gray-100 px-5 py-2 text-[11.5px] text-amber-700 flex items-center gap-2">⚠ 24h window closed — first message must be an approved template.</div>
                <div className="bg-white border-t border-gray-100 p-3 flex items-center gap-2">
                  <button onClick={() => sendTemplate(sel)} className="flex-1 text-left px-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-full text-gray-400 hover:text-teal hover:border-teal transition">Send an approved template to reopen…</button>
                  <button onClick={() => sendTemplate(sel)} className="w-10 h-10 rounded-full bg-teal text-white flex items-center justify-center hover:bg-teal/90 transition"><Send size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {sel && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
          {sel.candidate ? (
            <>
              <div className="p-5 text-center border-b border-gray-100">
                <div className="flex justify-center mb-2"><CandidateAvatar name={sel.candidate.name} avatarUrl={sel.candidate.avatar_url} size={64} /></div>
                <div className="font-semibold text-gray-800">{sel.candidate.name}</div>
                {sel.candidate.current_title && <div className="text-xs text-gray-500 mt-0.5">{sel.candidate.current_title}{sel.candidate.current_company ? ` @ ${sel.candidate.current_company}` : ""}</div>}
                <div className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-2 font-medium"><CheckCheck size={12} /> Linked to candidate</div>
              </div>

              {sel.app && (
                <div className="p-4 border-b border-gray-100">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Active application</div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/internal/mandates/${sel.app.mandate?.id}`} className="text-sm font-semibold text-gray-800 hover:text-teal truncate">{sel.app.mandate?.title || "Mandate"}</Link>
                      {sel.app.ai_score != null && <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor(sel.app.ai_score) }}>{sel.app.ai_score}</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{sel.app.mandate?.client_name}{sel.app.mandate?.location ? ` · ${sel.app.mandate.location}` : ""}</div>
                    <div className="flex gap-1 mt-2">
                      {STAGE_ORDER.map((s, i) => <div key={s} style={{ height: "4px", flex: 1, borderRadius: "2px", background: i <= STAGE_ORDER.indexOf(sel.app!.stage) ? "#028090" : "#e5e7eb" }} />)}
                    </div>
                    <div className="text-[11px] text-teal font-medium mt-1">Stage: {STAGE_LABEL[sel.app.stage] || sel.app.stage}</div>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-2 text-sm border-b border-gray-100">
                {sel.candidate.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" />{sel.candidate.phone}</div>}
                {sel.candidate.email && <div className="flex items-center gap-2 text-gray-600 truncate"><Mail size={14} className="text-gray-400" />{sel.candidate.email}</div>}
                {sel.candidate.source && <div className="flex items-center gap-2 text-gray-600"><Briefcase size={14} className="text-gray-400" />{SOURCE_LABELS[sel.candidate.source] || sel.candidate.source}</div>}
                {sel.last_message_at && <div className="flex items-center gap-2 text-gray-600"><Clock size={14} className="text-gray-400" />Last activity {timeShort(sel.last_message_at)}</div>}
              </div>

              <div className="p-4 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Quick actions</div>
                {[
                  { icon: Users, label: "Open full profile", fn: () => openProfile(sel) },
                  { icon: ArrowRight, label: "Advance pipeline stage", fn: () => advanceStage(sel) },
                  { icon: CalendarClock, label: "Schedule interview", fn: () => setShowInterview(true) },
                  { icon: StickyNote, label: "Log a note to record", fn: () => { openProfile(sel); setProfileTab("notes") } },
                ].map(({ icon: Icon, label, fn }) => (
                  <button key={label} onClick={fn} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 border border-gray-100 rounded-lg hover:border-teal hover:text-teal hover:bg-teal/5 transition"><Icon size={15} className="text-teal" /> {label}</button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3"><Phone size={26} /></div>
              <div className="font-semibold text-gray-800">Unknown number</div>
              <div className="text-sm text-gray-500 mt-1">{sel.phone}</div>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">Not linked to any candidate yet. Link it, or invite them to register.</p>
              <button onClick={() => setLinkModal(true)} className="flex items-center justify-center gap-2 w-full py-2 mt-4 text-sm bg-teal text-white rounded-lg hover:bg-teal/90 transition"><Link2 size={14} /> Link to existing candidate</button>
              <Link href="/internal/candidates" className="flex items-center justify-center gap-2 w-full py-2 mt-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:border-teal hover:text-teal transition"><Plus size={14} /> Create new candidate</Link>
              <button onClick={() => sendRegisterInvite(sel)} className="flex items-center justify-center gap-2 w-full py-2 mt-2 text-sm border border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"><Send size={14} /> Send “register” invite</button>
            </div>
          )}
        </div>
      )}

      {profile && <ProfileModal candidate={profile} tab={profileTab} setTab={setProfileTab} onClose={() => setProfile(null)} onSaveNote={saveNote} />}
      {showInterview && sel && <InterviewModal convo={sel} onClose={() => setShowInterview(false)} onDone={(m) => { setShowInterview(false); flash(m); loadConvos() }} />}
      {linkModal && sel && <LinkModal convo={sel} onClose={() => setLinkModal(false)} onLinked={() => { setLinkModal(false); loadConvos(); flash("Linked to candidate") }} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl z-[60]">{toast}</div>}
    </div>
  )
}

function ProfileModal({ candidate, tab, setTab, onClose, onSaveNote }: { candidate: any, tab: string, setTab: (t: any) => void, onClose: () => void, onSaveNote: (t: string) => void }) {
  const [note, setNote] = useState(candidate.internal_notes || "")
  const apps: App[] = candidate.applications || []
  const cvFile = candidate.cv_pdf_url || candidate.cv_file_url
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.45)" }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <CandidateAvatar name={candidate.name} avatarUrl={candidate.avatar_url} size={48} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">{candidate.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{candidate.current_title}{candidate.current_company ? ` @ ${candidate.current_company}` : ""}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                {candidate.email && <span className="flex items-center gap-1"><Mail size={11} />{candidate.email}</span>}
                {candidate.phone && <span className="flex items-center gap-1"><Phone size={11} />{candidate.phone}</span>}
                {candidate.location && <span className="flex items-center gap-1"><MapPin size={11} />{candidate.location}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {candidate.source && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{SOURCE_LABELS[candidate.source] || candidate.source}</span>}
            <Link href={`/internal/candidates/${candidate.id}`} className="p-1.5 text-gray-400 hover:text-teal rounded-lg hover:bg-gray-50" title="Full page"><ExternalLink size={15} /></Link>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X size={18} /></button>
          </div>
        </div>
        <div className="flex gap-1 px-6 pt-3 flex-shrink-0 border-b border-gray-100">
          {[{ id: "overview", label: "Overview" }, { id: "cv", label: "CV" }, { id: "roles", label: `Roles${apps.length ? ` (${apps.length})` : ""}` }, { id: "notes", label: "Notes" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${tab === t.id ? "border-teal text-teal" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "overview" && (
            <div className="space-y-4">
              {candidate.notes && <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs font-bold text-teal uppercase tracking-wide mb-2">AI Summary</div><p className="text-sm text-gray-600 leading-relaxed">{cleanCvText(candidate.notes)}</p></div>}
              {apps.length === 0 ? <div className="text-center py-6 text-gray-400 text-sm"><Briefcase size={26} className="mx-auto mb-2 text-gray-200" />Not assigned to any mandates yet.</div>
                : apps.map(app => (
                  <div key={app.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-800">{app.mandate?.title}</span>
                      <div className="flex items-center gap-2">
                        {app.ai_score != null && <span className="flex items-center gap-1 text-sm font-bold" style={{ color: scoreColor(app.ai_score) }}><Star size={12} className="fill-current" />{app.ai_score}</span>}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{STAGE_LABEL[app.stage] || app.stage}</span>
                      </div>
                    </div>
                    {app.mandate?.client_name && <div className="text-xs text-gray-500 mt-0.5">{app.mandate.client_name}</div>}
                    {app.ai_summary && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{app.ai_summary}</p>}
                  </div>
                ))}
            </div>
          )}
          {tab === "cv" && (
            <div>
              {cvFile && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <FileText size={15} className="text-teal" /><span className="text-sm font-medium text-gray-700 flex-1">Original CV{candidate.cv_file_type ? ` (${candidate.cv_file_type.toUpperCase()})` : ""}</span>
                  <button onClick={() => openSecureFile(cvFile)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal text-white text-xs font-semibold hover:opacity-90"><Download size={12} /> Download</button>
                </div>
              )}
              {candidate.cv_text ? <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-5">{cleanCvText(candidate.cv_text)}</pre>
                : <div className="text-center py-12 text-gray-400 text-sm"><FileText size={30} className="mx-auto mb-3 text-gray-200" />No CV stored for this candidate.</div>}
            </div>
          )}
          {tab === "roles" && (
            <div className="space-y-3">
              {apps.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No applications yet</div>
                : apps.map(app => {
                  const idx = STAGE_ORDER.indexOf(app.stage)
                  return (
                    <div key={app.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between"><span className="font-semibold text-sm text-gray-800">{app.mandate?.title || "Role"}</span>{app.ai_score != null && <span className="text-xs font-bold" style={{ color: scoreColor(app.ai_score) }}>{app.ai_score}</span>}</div>
                      {app.mandate?.client_name && <div className="text-xs text-gray-500">{app.mandate.client_name}</div>}
                      <div className="flex gap-1 mt-2">{STAGE_ORDER.map((s, i) => <div key={s} style={{ height: "3px", flex: 1, borderRadius: "2px", background: i <= idx ? "#028090" : "#e5e7eb" }} />)}</div>
                      <div className="text-[11px] text-teal mt-1">{STAGE_LABEL[app.stage] || app.stage}</div>
                    </div>
                  )
                })}
            </div>
          )}
          {tab === "notes" && (
            <div>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={8} placeholder="Add an internal note about this candidate…" className="w-full p-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal resize-none" />
              <button onClick={() => onSaveNote(note)} className="mt-3 px-4 py-2 bg-teal text-white text-sm font-medium rounded-lg hover:bg-teal/90">Save note</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InterviewModal({ convo, onClose, onDone }: { convo: Convo, onClose: () => void, onDone: (m: string) => void }) {
  const supabase = createClient()
  const [type, setType] = useState<"" | "gps" | "client">("")
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [format, setFormat] = useState("Video call")
  const [busy, setBusy] = useState(false)
  const app = convo.app

  async function submit() {
    if (!app) { onDone("No active application — assign a mandate first"); return }
    setBusy(true)
    try {
      if (type === "client") {
        const { data: ir } = await supabase.from("client_interview_requests")
          .insert({ application_id: app.id, mandate_id: app.mandate?.id, confirmed_date: date || null, confirmed_time: time || null, format, status: "pending" })
          .select("id").maybeSingle()
        if (ir?.id) fetch("/api/notify-interview-confirmed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interview_request_id: ir.id }) }).catch(() => {})
        if (STAGE_ORDER.indexOf(app.stage) < STAGE_ORDER.indexOf("interview")) await supabase.from("applications").update({ stage: "interview" }).eq("id", app.id)
        onDone("Client interview logged · candidate + client notified")
      } else {
        if (STAGE_ORDER.indexOf(app.stage) < STAGE_ORDER.indexOf("screening")) await supabase.from("applications").update({ stage: "screening" }).eq("id", app.id)
        onDone("GPS screening scheduled · candidate to be notified")
      }
    } catch (e: any) { onDone(e?.message || "Could not schedule") }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.45)" }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900">Schedule interview</h3>
        {!type ? (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-4">Which interview for {convoName(convo)}?</p>
            <button onClick={() => setType("gps")} className="w-full flex gap-3 items-start text-left border border-gray-100 rounded-xl p-3 mb-2 hover:border-teal hover:bg-teal/5 transition">
              <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center flex-shrink-0"><Building2 size={16} /></div>
              <div><div className="font-medium text-sm text-gray-800">GPS screening call</div><div className="text-xs text-gray-500 mt-0.5">Internal — just your team and the candidate. Notifies the candidate only.</div></div>
            </button>
            <button onClick={() => setType("client")} className="w-full flex gap-3 items-start text-left border border-gray-100 rounded-xl p-3 hover:border-teal hover:bg-teal/5 transition">
              <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center flex-shrink-0"><Users size={16} /></div>
              <div><div className="font-medium text-sm text-gray-800">Client interview</div><div className="text-xs text-gray-500 mt-0.5">Candidate meets the client. Emails both sides and logs a client interview request.</div></div>
            </button>
            <button onClick={onClose} className="w-full mt-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500 font-medium">Cancel</button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-4">{type === "client" ? "Client interview" : "GPS screening call"} · {app?.mandate?.title || "—"}</p>
            <div className="flex gap-3">
              <div className="flex-1"><label className="text-xs font-medium text-gray-500">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal" /></div>
              <div className="flex-1"><label className="text-xs font-medium text-gray-500">Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal" /></div>
            </div>
            <label className="text-xs font-medium text-gray-500 block mt-3">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal">
              <option>Video call</option><option>Phone</option><option>In person — GPS office</option>{type === "client" && <option>In person — client site</option>}
            </select>
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5 mt-3">{type === "client" ? "Candidate and the client both get a confirmation email (confidential clients stay hidden from the candidate)." : "The candidate gets a confirmation. Nothing is sent to any client."}</div>
            <button onClick={submit} disabled={busy} className="w-full mt-4 py-2.5 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 disabled:opacity-50">{busy ? "Saving…" : type === "client" ? "Send requests & confirm" : "Confirm & notify candidate"}</button>
            <button onClick={() => setType("")} className="w-full mt-2 py-2 bg-gray-100 rounded-lg text-sm text-gray-500 font-medium">Back</button>
          </>
        )}
      </div>
    </div>
  )
}

function LinkModal({ convo, onClose, onLinked }: { convo: Convo, onClose: () => void, onLinked: () => void }) {
  const supabase = createClient()
  const [q, setQ] = useState(""); const [results, setResults] = useState<Candidate[]>([]); const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setResults([]); return }
      const { data } = await supabase.from("candidates").select("id,name,current_title,avatar_url,phone").ilike("name", `%${q.trim()}%`).limit(8)
      setResults((data as any) || [])
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  async function link(c: Candidate) {
    setBusy(true)
    await supabase.from("wa_conversations").update({ candidate_id: c.id }).eq("id", convo.id)
    setBusy(false); onLinked()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.45)" }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900">Link to candidate</h3>
        <p className="text-sm text-gray-500 mt-1 mb-3">Search your database for {convo.phone}</p>
        <div className="relative"><Search size={14} className="absolute left-3 top-3 text-gray-400" /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name…" className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal" /></div>
        <div className="mt-3 max-h-64 overflow-y-auto">
          {results.map(c => (
            <button key={c.id} disabled={busy} onClick={() => link(c)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left transition">
              <CandidateAvatar name={c.name} avatarUrl={c.avatar_url} size={36} />
              <div className="min-w-0"><div className="font-medium text-sm text-gray-800 truncate">{c.name}</div>{c.current_title && <div className="text-xs text-gray-500 truncate">{c.current_title}</div>}</div>
            </button>
          ))}
          {q.trim().length >= 2 && results.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No matches</div>}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500 font-medium">Cancel</button>
      </div>
    </div>
  )
}
