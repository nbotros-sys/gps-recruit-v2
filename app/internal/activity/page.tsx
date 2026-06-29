"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import {
  Plus, Check, Trash2, Loader2, ArrowUpRight,
  GitBranch, Star, Zap, MessageSquare, Briefcase,
  UserCheck, Bell, Calendar, User, CheckSquare
} from "lucide-react"

const STAFF = ["Nader", "Mona", "Juana"]

const NOTIF_META: Record<string, { emoji: string; bg: string }> = {
  stage_changed:    { emoji: "📋", bg: "#dbeafe" },
  candidate_placed: { emoji: "🎯", bg: "#dcfce7" },
  cv_scored:        { emoji: "⭐", bg: "#ede9fe" },
  candidate_added:  { emoji: "➕", bg: "#ccfbf1" },
  mandate_created:  { emoji: "📁", bg: "#ccfbf1" },
  commentary_sent:  { emoji: "💬", bg: "#fef3c7" },
  scan_complete:    { emoji: "⚡", bg: "#e0e7ff" },
  new_client:       { emoji: "🏢", bg: "#fce7f3" },
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return "Yesterday"
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

type DueInfo = { label: string; cls: string; border: string } | null

function getDueInfo(date: string | null): DueInfo {
  if (!date) return null
  const d = new Date(date); d.setHours(0,0,0,0)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d < today) return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), cls: "text-red-500 font-semibold", border: "border-l-[3px] border-l-red-400 rounded-l-none" }
  if (d.getTime() === today.getTime()) return { label: "Today", cls: "text-orange-500 font-semibold", border: "border-l-[3px] border-l-orange-400 rounded-l-none" }
  if (d.getTime() === tomorrow.getTime()) return { label: "Tomorrow", cls: "text-amber-500", border: "" }
  return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), cls: "text-gray-400", border: "" }
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tasks and platform notifications</p>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* LEFT: Tasks */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} className="text-gray-700" />
              <span className="text-xs font-semibold text-gray-900 tracking-wide">Tasks</span>
              {pendingTasks.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: "#fff3e8", color: "#c25d00" }}>
                  {pendingTasks.length}
                </span>
              )}
            </div>
          </div>

          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-teal hover:text-teal transition-all mb-2 bg-white">
              <Plus size={13} /> Add a task
            </button>
          ) : (
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
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancel</button>
              </div>
            </form>
          )}

          {loadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
          ) : pendingTasks.length === 0 && !showForm ? (
            <div className="text-center py-10">
              <CheckSquare size={24} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">All clear</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pendingTasks.map(task => {
                const due = getDueInfo(task.due_date)
                return (
                  <div key={task.id}
                    className={`bg-white border border-gray-100 rounded-xl p-3 flex items-start gap-2.5 group ${due?.border || ""}`}>
                    <button onClick={() => toggleTask(task)} disabled={completing === task.id}
                      className="mt-0.5 w-[17px] h-[17px] rounded-[4px] border-2 border-gray-300 hover:border-teal flex items-center justify-center flex-shrink-0 transition-colors">
                      {completing === task.id && <Loader2 size={10} className="animate-spin text-gray-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
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
                          <Link href={task.link} className="flex items-center gap-0.5 text-xs text-teal hover:underline">
                            <ArrowUpRight size={10} /> {task.link_label || "View"}
                          </Link>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} disabled={deleting === task.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-0.5 flex-shrink-0">
                      {deleting === task.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <Check size={12} className="text-green-500" />
                {showDone ? "Hide" : "Show"} {doneTasks.length} completed
              </button>
              {showDone && (
                <div className="space-y-1.5 mt-2">
                  {doneTasks.map(task => (
                    <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-start gap-2.5 opacity-50">
                      <button onClick={() => toggleTask(task)} disabled={completing === task.id}
                        className="mt-0.5 w-[17px] h-[17px] rounded-[4px] border-2 border-green-400 bg-green-400 flex items-center justify-center flex-shrink-0">
                        {completing === task.id
                          ? <Loader2 size={10} className="animate-spin text-white" />
                          : <Check size={10} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-400 line-through leading-snug">{task.title}</p>
                        {task.done_by_name && task.done_at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {task.done_by_name} · {timeAgo(task.done_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Activity feed */}
        <div className="w-72 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-gray-700" />
              <span className="text-xs font-semibold text-gray-900 tracking-wide">Activity feed</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: "#fef2f2", color: "#dc2626" }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-teal hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
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
                const meta = NOTIF_META[n.type] || { emoji: "🔔", bg: "#f3f4f6" }
                return (
                  <div key={n.id}
                    className={`flex items-start gap-2.5 px-3.5 py-3 ${!n.read ? "bg-teal/[0.02]" : ""}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${!n.read ? "bg-teal" : ""}`} />
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ background: meta.bg }}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
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
    </div>
  )
}
