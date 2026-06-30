"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { Plus, Check, Trash2, Loader2, ArrowUpRight, Bell, Calendar, User, CheckSquare, X, Send } from "lucide-react"

const STAFF = ["Nader", "Mona", "Juana"]

const NOTIF_META: Record<string, { emoji: string; bg: string; color: string }> = {
  stage_changed:    { emoji: "📋", bg: "#dbeafe", color: "#1d4ed8" },
  candidate_placed: { emoji: "🎯", bg: "#dcfce7", color: "#15803d" },
  cv_scored:        { emoji: "⭐", bg: "#ede9fe", color: "#7c3aed" },
  candidate_added:  { emoji: "➕", bg: "#ccfbf1", color: "#0f766e" },
  mandate_created:  { emoji: "📁", bg: "#ccfbf1", color: "#0f766e" },
  commentary_sent:  { emoji: "💬", bg: "#fef3c7", color: "#92400e" },
  scan_complete:    { emoji: "⚡", bg: "#e0e7ff", color: "#4338ca" },
  new_client:       { emoji: "🏢", bg: "#fce7f3", color: "#9d174d" },
}

function NotifIcon({ type }: { type: string }) {
  // Colours and icons by notification type
  const configs: Record<string, { bg: string; color: string; icon: string }> = {
    stage_changed:    { bg: "#dbeafe", color: "#1d4ed8", icon: "arrow" },
    candidate_placed: { bg: "#dcfce7", color: "#15803d", icon: "check" },
    cv_scored:        { bg: "#ede9fe", color: "#7c3aed", icon: "star" },
    candidate_added:  { bg: "#ccfbf1", color: "#0f766e", icon: "person" },
    mandate_created:  { bg: "#ccfbf1", color: "#0f766e", icon: "briefcase" },
    commentary_sent:  { bg: "#fef3c7", color: "#92400e", icon: "chat" },
    scan_complete:    { bg: "#e0e7ff", color: "#4338ca", icon: "zap" },
    new_client:       { bg: "#fce7f3", color: "#9d174d", icon: "building" },
    client_feedback:  { bg: "#fef3c7", color: "#92400e", icon: "chat" },
    interview_requested: { bg: "#dbeafe", color: "#1d4ed8", icon: "calendar" },
    client_rejected: { bg: "#fcebeb", color: "#a32d2d", icon: "x" },
  }
  const c = configs[type] || { bg: "#f3f4f6", color: "#6b7280", icon: "bell" }
  const svgs: Record<string, React.ReactNode> = {
    arrow: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    star: <svg width="13" height="13" viewBox="0 0 24 24" fill={c.color} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    person: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    briefcase: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
    chat: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    zap: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    building: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    x: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    bell: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
      {svgs[c.icon]}
    </div>
  )
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return "Yesterday"
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

type DueInfo = { label: string; cls: string; border: string; cardBorder: string } | null

function getDueInfo(date: string | null): DueInfo {
  if (!date) return null
  const d = new Date(date); d.setHours(0,0,0,0)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d < today) return {
    label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    cls: "text-red-500 font-semibold",
    border: "border-l-[3px] border-l-red-400",
    cardBorder: "border-red-100",
  }
  if (d.getTime() === today.getTime()) return {
    label: "Today",
    cls: "text-orange-500 font-semibold",
    border: "border-l-[3px] border-l-orange-400",
    cardBorder: "border-orange-100",
  }
  if (d.getTime() === tomorrow.getTime()) return { label: "Tomorrow", cls: "text-amber-500", border: "", cardBorder: "border-gray-100" }
  return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), cls: "text-gray-400", border: "", cardBorder: "border-gray-100" }
}

export default function ActivityPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newAssignee, setNewAssignee] = useState("")
  const [newDue, setNewDue] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [taskNotes, setTaskNotes] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: staff } = await supabase.from("staff_users")
          .select("full_name, email").eq("email", user.email).maybeSingle()
        setCurrentUser({ email: user.email || "", name: staff?.full_name || user.email?.split("@")[0] || "You" })
      }
    }
    init()
    loadNotifications()
    loadTasks()
  }, [])

  async function loadNotifications() {
    setLoadingNotifs(true)
    const res = await fetch("/api/notifications")
    const data = await res.json()
    setNotifications(data.notifications || [])
    setLoadingNotifs(false)
  }

  async function loadTasks() {
    setLoadingTasks(true)
    const res = await fetch("/api/tasks")
    const data = await res.json()
    setTasks(data.tasks || [])
    setLoadingTasks(false)
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_all: true }) })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function toggleTask(task: any) {
    setCompleting(task.id)
    const newDone = !task.done
    await fetch("/api/tasks", { method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, done: newDone,
        done_by_email: currentUser?.email || "",
        done_by_name: currentUser?.name || "" }) })
    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t, done: newDone,
      done_by_email: newDone ? currentUser?.email : null,
      done_by_name: newDone ? currentUser?.name : null,
      done_at: newDone ? new Date().toISOString() : null
    } : t))
    setCompleting(null)
  }

  async function deleteTask(id: string) {
    setDeleting(id)
    await fetch("/api/tasks", { method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }) })
    setTasks(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  async function openTask(task: any) {
    setSelectedTask(task)
    setLoadingNotes(true)
    const res = await fetch(`/api/task-notes?task_id=${task.id}`)
    const data = await res.json()
    setTaskNotes(data.notes || [])
    setLoadingNotes(false)
  }

  async function addNote() {
    if (!newNote.trim() || !selectedTask) return
    setSavingNote(true)
    const res = await fetch("/api/task-notes", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: selectedTask.id,
        note_text: newNote,
        author_email: currentUser?.email || "",
        author_name: currentUser?.name || "Someone",
      }) })
    const data = await res.json()
    if (data.note) {
      setTaskNotes(prev => [...prev, data.note])
      setNewNote("")
    }
    setSavingNote(false)
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    const res = await fetch("/api/tasks", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc || undefined,
        assigned_to: newAssignee || undefined, due_date: newDue || undefined }) })
    const data = await res.json()
    if (data.task) {
      setTasks(prev => [data.task, ...prev])
      setNewTitle(""); setNewDesc(""); setNewAssignee(""); setNewDue("")
      setShowForm(false)
    }
    setSaving(false)
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const pendingTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tasks and platform notifications</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ background: "#0a1f24" }}>
          <Plus size={14} /> New task
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 items-start">

        {/* ── LEFT: Tasks ── */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} className="text-gray-800" />
              <span className="text-xs font-semibold text-gray-900">Tasks</span>
              {pendingTasks.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#fff3e8", color: "#c25d00" }}>
                  {pendingTasks.length} pending
                </span>
              )}
            </div>
            {doneTasks.length > 0 && (
              <button onClick={() => setShowDone(!showDone)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {showDone ? "Hide" : "Show"} {doneTasks.length} completed
              </button>
            )}
          </div>

          {/* New task form */}
          {showForm && (
            <form onSubmit={createTask} className="card p-4 mb-3 space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Task title" required autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)" rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assign to</label>
                  <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                    <option value="">Anyone</option>
                    {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Due date</label>
                  <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 text-sm text-white px-4 py-2 rounded-lg font-semibold"
                  style={{ background: "#028090" }}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancel</button>
              </div>
            </form>
          )}

          {loadingTasks ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
          ) : pendingTasks.length === 0 && !showForm ? (
            <div className="text-center py-14">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <CheckSquare size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">All clear</p>
              <p className="text-xs text-gray-400 mt-1">No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map(task => {
                const due = getDueInfo(task.due_date)
                return (
                  <div key={task.id}
                    onClick={() => openTask(task)}
                    className={`bg-white border rounded-xl p-3.5 flex items-start gap-2.5 group transition-all cursor-pointer hover:border-teal/40 shadow-sm ${due?.border || ""} ${due?.cardBorder || "border-gray-100"}`}
                    style={{ borderRadius: due?.border ? "0 12px 12px 0" : "12px" }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleTask(task) }} disabled={completing === task.id}
                      className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-gray-300 hover:border-teal flex items-center justify-center flex-shrink-0 transition-colors">
                      {completing === task.id && <Loader2 size={10} className="animate-spin text-gray-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                        {task.assigned_to && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User size={10} /> {task.assigned_to}
                          </span>
                        )}
                        {due && (
                          <span className={`flex items-center gap-1 text-xs ${due.cls}`}>
                            <Calendar size={10} /> {due.label}
                          </span>
                        )}
                        {task.auto_generated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: "#f3e8ff", color: "#7c3aed" }}>auto</span>
                        )}
                        {task.link && (
                          <Link href={task.link} onClick={(e) => e.stopPropagation()} className="flex items-center gap-0.5 text-xs text-teal hover:underline">
                            <ArrowUpRight size={10} /> {task.link_label || "View"}
                          </Link>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }} disabled={deleting === task.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-0.5 flex-shrink-0">
                      {deleting === task.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Completed */}
          {showDone && doneTasks.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
              {doneTasks.map(task => (
                <div key={task.id}
                  onClick={() => openTask(task)}
                  className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-start gap-2.5 opacity-50 hover:opacity-90 cursor-pointer transition-opacity group">
                  <button onClick={(e) => { e.stopPropagation(); toggleTask(task) }} disabled={completing === task.id}
                    title="Click to mark as not done"
                    className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-green-400 bg-green-400 hover:bg-white flex items-center justify-center flex-shrink-0 group/check">
                    {completing === task.id
                      ? <Loader2 size={10} className="animate-spin text-white" />
                      : <Check size={10} className="text-white group-hover/check:hidden" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 line-through leading-snug">{task.title}</p>
                    {task.done_by_name && task.done_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {task.done_by_name} · {timeAgo(task.done_at)}
                      </p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleTask(task) }} disabled={completing === task.id}
                    className="opacity-0 group-hover:opacity-100 text-xs text-teal hover:underline flex-shrink-0 transition-all px-1">
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Activity feed ── */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-gray-800" />
              <span className="text-xs font-semibold text-gray-900">Recent activity</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#fef2f2", color: "#dc2626" }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-teal hover:underline">Mark all read</button>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 shadow-sm">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={16} className="animate-spin text-gray-200" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell size={20} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No activity yet</p>
                <p className="text-xs text-gray-300 mt-1">Events appear as you use the platform</p>
              </div>
            ) : (
              notifications.map(n => {
                return (
                  <div key={n.id}
                    className={`flex items-start gap-2.5 px-3.5 py-3 ${!n.read ? "bg-teal/[0.02]" : ""}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${!n.read ? "bg-teal" : ""}`} />
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                        <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5" style={{ fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed truncate">{n.message}</p>
                      {n.link && (
                        <Link href={n.link} className="text-[11px] text-teal hover:underline flex items-center gap-0.5 mt-0.5">
                          <ArrowUpRight size={10} /> View
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* ── Task detail modal ── */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-semibold text-gray-900 leading-snug ${selectedTask.done ? "line-through text-gray-400" : ""}`}>
                  {selectedTask.title}
                </p>
                {selectedTask.description && (
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{selectedTask.description}</p>
                )}
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  {selectedTask.assigned_to && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <User size={10} /> {selectedTask.assigned_to}
                    </span>
                  )}
                  {selectedTask.due_date && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={10} /> {new Date(selectedTask.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {selectedTask.link && (
                    <Link href={selectedTask.link} className="flex items-center gap-0.5 text-xs text-teal hover:underline">
                      <ArrowUpRight size={10} /> {selectedTask.link_label || "View"}
                    </Link>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex-1 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
                <button
                  onClick={() => { toggleTask(selectedTask); setSelectedTask({ ...selectedTask, done: !selectedTask.done }) }}
                  className="text-xs text-teal hover:underline">
                  {selectedTask.done ? "Mark as not done" : "Mark as done"}
                </button>
              </div>
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={14} className="animate-spin text-gray-300" />
                </div>
              ) : taskNotes.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No notes yet — log availability, delegation, or anything useful for whoever picks this up next.</p>
              ) : (
                <div className="space-y-3">
                  {taskNotes.map(note => (
                    <div key={note.id} className="bg-gray-50 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{note.author_name || "Someone"}</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(note.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{note.note_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 flex items-end gap-2">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note for the team..." rows={2}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote() } }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
              <button onClick={addNote} disabled={!newNote.trim() || savingNote}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-white flex-shrink-0 disabled:opacity-40"
                style={{ background: "#028090" }}>
                {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
