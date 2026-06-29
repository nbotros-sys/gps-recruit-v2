"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import {
  Bell, CheckSquare, Plus, Check, Trash2, Loader2,
  ArrowUpRight, GitBranch, Star, Zap, MessageSquare,
  Briefcase, UserCheck, X, Calendar, User
} from "lucide-react"

const STAFF = ["Nader", "Mona", "Juana"]

const NOTIF_ICON: Record<string, any> = {
  stage_changed: GitBranch,
  candidate_placed: UserCheck,
  cv_scored: Star,
  candidate_added: Plus,
  mandate_created: Briefcase,
  commentary_sent: MessageSquare,
  scan_complete: Zap,
  new_client: Briefcase,
}

const NOTIF_COLOR: Record<string, string> = {
  stage_changed: "bg-blue-100 text-blue-600",
  candidate_placed: "bg-green-100 text-green-600",
  cv_scored: "bg-purple-100 text-purple-600",
  candidate_added: "bg-teal/10 text-teal",
  mandate_created: "bg-teal/10 text-teal",
  commentary_sent: "bg-amber-100 text-amber-600",
  scan_complete: "bg-indigo-100 text-indigo-600",
  new_client: "bg-pink-100 text-pink-600",
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function formatDue(date: string | null) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  d.setHours(0,0,0,0)
  if (d.getTime() === today.getTime()) return { label: "Today", cls: "text-amber-600 font-semibold" }
  if (d.getTime() === tomorrow.getTime()) return { label: "Tomorrow", cls: "text-amber-500" }
  if (d < today) return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), cls: "text-red-500 font-semibold" }
  return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), cls: "text-gray-400" }
}

export default function ActivityPage() {
  const [tab, setTab] = useState<"tasks" | "activity">("tasks")
  const [notifications, setNotifications] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null)

  // New task form
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newAssignee, setNewAssignee] = useState("")
  const [newDue, setNewDue] = useState("")
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: staff } = await supabase.from("staff_users")
          .select("full_name, email").eq("email", user.email).maybeSingle()
        setCurrentUser({ email: user.email || "", name: staff?.full_name || user.email?.split("@")[0] || "You" })
      }
    }
    getUser()
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
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_all: true }) })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function toggleTask(task: any) {
    setCompleting(task.id)
    const newDone = !task.done
    await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" },
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
    await fetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }) })
    setTasks(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
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
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tasks and platform notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("tasks")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "tasks" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>
            Tasks {pendingTasks.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingTasks.length}</span>}
          </button>
          <button
            onClick={() => { setTab("activity"); if (unreadCount > 0) markAllRead() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "activity" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>
            Activity {unreadCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </button>
        </div>
      </div>

      {/* ── TASKS TAB ── */}
      {tab === "tasks" && (
        <div className="space-y-4">
          {/* New task button */}
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-teal hover:text-teal transition-all">
              <Plus size={16} /> Add a task
            </button>
          ) : (
            <form onSubmit={createTask} className="card p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-800">New task</p>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Task title" required autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)" rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="btn-primary flex items-center gap-2 text-sm">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Create task
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancel</button>
              </div>
            </form>
          )}

          {/* Pending tasks */}
          {loadingTasks ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 size={14} className="animate-spin" /> Loading tasks...
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map(task => {
                const due = formatDue(task.due_date)
                return (
                  <div key={task.id} className="card p-4 flex items-start gap-3 group">
                    <button onClick={() => toggleTask(task)} disabled={completing === task.id}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 hover:border-teal flex items-center justify-center flex-shrink-0 transition-colors">
                      {completing === task.id ? <Loader2 size={11} className="animate-spin text-gray-400" /> : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {task.assigned_to && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User size={11} /> {task.assigned_to}
                          </span>
                        )}
                        {due && (
                          <span className={`flex items-center gap-1 text-xs ${due.cls}`}>
                            <Calendar size={11} /> {due.label}
                          </span>
                        )}
                        {task.auto_generated && (
                          <span className="text-xs bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">auto</span>
                        )}
                        {task.link && (
                          <Link href={task.link} className="flex items-center gap-1 text-xs text-teal hover:underline">
                            <ArrowUpRight size={11} /> {task.link_label || "View"}
                          </Link>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} disabled={deleting === task.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 flex-shrink-0">
                      {deleting === task.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Completed tasks toggle */}
          {doneTasks.length > 0 && (
            <div>
              <button onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 py-2">
                <Check size={14} className="text-green-500" />
                {showDone ? "Hide" : "Show"} {doneTasks.length} completed task{doneTasks.length !== 1 ? "s" : ""}
              </button>
              {showDone && (
                <div className="space-y-2 mt-2">
                  {doneTasks.map(task => (
                    <div key={task.id} className="card p-4 flex items-start gap-3 opacity-60">
                      <button onClick={() => toggleTask(task)} disabled={completing === task.id}
                        className="mt-0.5 w-5 h-5 rounded border-2 border-green-400 bg-green-400 flex items-center justify-center flex-shrink-0">
                        {completing === task.id
                          ? <Loader2 size={11} className="animate-spin text-white" />
                          : <Check size={11} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 line-through">{task.title}</p>
                        {task.done_by_name && task.done_at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Completed by {task.done_by_name} · {timeAgo(task.done_at)}
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
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === "activity" && (
        <div className="space-y-2">
          {loadingNotifs ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 size={14} className="animate-spin" /> Loading activity...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Events will appear here as you use the platform</p>
            </div>
          ) : (
            notifications.map(n => {
              const Icon = NOTIF_ICON[n.type] || Bell
              const color = NOTIF_COLOR[n.type] || "bg-gray-100 text-gray-500"
              return (
                <div key={n.id} className={`card p-4 flex items-start gap-3 transition-all ${!n.read ? "border-l-2 border-teal" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    {n.link && (
                      <Link href={n.link} className="flex items-center gap-1 text-xs text-teal hover:underline mt-1.5">
                        <ArrowUpRight size={11} /> View
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
