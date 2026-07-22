"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"
import { MessageSquare, Send, Phone, Mail, ExternalLink, UserPlus, Search, Loader2, CheckCheck } from "lucide-react"

type Candidate = { id: string; name: string; current_title?: string; avatar_url?: string | null; email?: string; phone?: string }
type Convo = {
  id: string; phone: string; candidate_id: string | null; wa_profile_name?: string | null
  unread_count: number; last_message_at?: string | null; last_message_preview?: string | null
  last_direction?: string | null; session_expires_at?: string | null; archived: boolean
  candidate?: Candidate | null
}
type Msg = { id: string; direction: "in" | "out"; body?: string | null; template_name?: string | null; status?: string | null; created_at: string }

const CONVO_SELECT =
  "id,phone,candidate_id,wa_profile_name,unread_count,last_message_at,last_message_preview,last_direction,session_expires_at,archived,candidate:candidates(id,name,current_title,avatar_url,email,phone)"

function timeShort(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "short" })
}

function sessionOpen(c?: Convo | null) {
  return !!(c?.session_expires_at && new Date(c.session_expires_at) > new Date())
}

export default function MessagesPage() {
  const supabase = createClient()
  const [convos, setConvos] = useState<Convo[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const msgEnd = useRef<HTMLDivElement>(null)
  const selRef = useRef<string | null>(null)
  selRef.current = selId

  const loadConvos = useCallback(async () => {
    const { data } = await supabase
      .from("wa_conversations")
      .select(CONVO_SELECT)
      .eq("archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false })
    setConvos((data as any) || [])
    setLoading(false)
  }, [])

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("wa_messages")
      .select("id,direction,body,template_name,status,created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
    setMsgs((data as any) || [])
  }, [])

  // Initial load
  useEffect(() => { loadConvos() }, [loadConvos])

  // Realtime doorbell: any wa change -> debounced refresh of list + open thread
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    const ping = () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => {
        loadConvos()
        if (selRef.current) loadMsgs(selRef.current)
      }, 500)
    }
    const ch = supabase
      .channel("wa-inbox")
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
    setSending(true)
    setDraft("")
    // optimistic
    const temp: Msg = { id: "tmp-" + Date.now(), direction: "out", body: text, status: "sending", created_at: new Date().toISOString() }
    setMsgs(prev => [...prev, temp])
    try {
      const r = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selId, body: text }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        setMsgs(prev => prev.map(m => m.id === temp.id ? { ...m, status: "failed" } : m))
        alert(e.error || "Send failed")
      } else {
        loadMsgs(selId)
      }
    } catch {
      setMsgs(prev => prev.map(m => m.id === temp.id ? { ...m, status: "failed" } : m))
    }
    setSending(false)
  }

  const sel = convos.find(c => c.id === selId) || null
  const filtered = convos.filter(c => {
    if (!q) return true
    const s = q.toLowerCase()
    return c.phone.toLowerCase().includes(s) ||
      (c.candidate?.name || "").toLowerCase().includes(s) ||
      (c.wa_profile_name || "").toLowerCase().includes(s)
  })

  return (
    <div className="flex h-full bg-cream overflow-hidden">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-teal">
            <MessageSquare size={18} />
            <span className="font-semibold text-gray-800">WhatsApp</span>
          </div>
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-teal" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="animate-spin" size={18} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm px-4">No conversations yet. Inbound WhatsApp messages appear here.</div>
          ) : filtered.map(c => {
            const name = c.candidate?.name || c.wa_profile_name || c.phone
            const active = c.id === selId
            return (
              <button key={c.id} onClick={() => openConvo(c)}
                className={`w-full flex gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors ${active ? "bg-teal/5" : "hover:bg-gray-50"}`}>
                {c.candidate
                  ? <CandidateAvatar name={c.candidate.name} avatarUrl={c.candidate.avatar_url} size={42} />
                  : <div className="w-[42px] h-[42px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Phone size={16} /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-medium text-sm text-gray-800 truncate">{name}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{timeShort(c.last_message_at)}</span>
                  </div>
                  {!c.candidate && <span className="inline-block text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium mt-0.5">Not in database</span>}
                  <div className="flex justify-between items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 truncate">{c.last_direction === "out" ? "You: " : ""}{c.last_message_preview || ""}</span>
                    {c.unread_count > 0 && <span className="flex-shrink-0 bg-teal text-white text-[11px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-medium">{c.unread_count}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "#efeae2" }}>
        {!sel ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a conversation</div>
        ) : (
          <>
            <div className="h-14 bg-white border-b border-gray-100 flex items-center px-5 gap-3 flex-shrink-0">
              {sel.candidate
                ? <CandidateAvatar name={sel.candidate.name} avatarUrl={sel.candidate.avatar_url} size={34} />
                : <div className="w-[34px] h-[34px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Phone size={14} /></div>}
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{sel.candidate?.name || sel.wa_profile_name || sel.phone}</div>
                <div className={`text-[11px] flex items-center gap-1 ${sessionOpen(sel) ? "text-green-600" : "text-amber-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sessionOpen(sel) ? "bg-green-500" : "bg-amber-500"}`} />
                  {sessionOpen(sel) ? "Session open" : "Session closed"}
                </div>
              </div>
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

            <div className="bg-white border-t border-gray-100 p-3 flex items-center gap-2 flex-shrink-0">
              <input value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={sessionOpen(sel) ? "Type a message" : "Session closed — reply may require a template"}
                className="flex-1 px-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-full outline-none focus:border-teal" />
              <button onClick={send} disabled={sending || !draft.trim()}
                className="w-10 h-10 rounded-full bg-teal text-white flex items-center justify-center disabled:opacity-40 hover:bg-teal/90 transition">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Context panel */}
      {sel && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
          {sel.candidate ? (
            <>
              <div className="p-5 text-center border-b border-gray-100">
                <div className="flex justify-center mb-2"><CandidateAvatar name={sel.candidate.name} avatarUrl={sel.candidate.avatar_url} size={64} /></div>
                <div className="font-semibold text-gray-800">{sel.candidate.name}</div>
                {sel.candidate.current_title && <div className="text-xs text-gray-500 mt-0.5">{sel.candidate.current_title}</div>}
                <div className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-2 font-medium">
                  <CheckCheck size={12} /> Linked to candidate
                </div>
              </div>
              <div className="p-4 space-y-2 text-sm border-b border-gray-100">
                {sel.candidate.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" />{sel.candidate.phone}</div>}
                {sel.candidate.email && <div className="flex items-center gap-2 text-gray-600 truncate"><Mail size={14} className="text-gray-400" />{sel.candidate.email}</div>}
              </div>
              <div className="p-4">
                <Link href={`/internal/candidates/${sel.candidate.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:border-teal hover:text-teal transition">
                  <ExternalLink size={14} /> Open full profile
                </Link>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3"><Phone size={26} /></div>
              <div className="font-semibold text-gray-800">Unknown number</div>
              <div className="text-sm text-gray-500 mt-1">{sel.phone}</div>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">This number isn't linked to any candidate yet.</p>
              <Link href="/internal/candidates"
                className="flex items-center justify-center gap-2 w-full py-2 mt-4 text-sm bg-teal text-white rounded-lg hover:bg-teal/90 transition">
                <UserPlus size={14} /> Go to candidates
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
