"use client"
import { useState, useEffect } from "react"
import { Loader2, Database, Zap, Sparkles, Users, Plus, Trash2, Mail, CheckCircle } from "lucide-react"

interface StaffMember {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const [embedding, setEmbedding] = useState(false)
  const [embedResult, setEmbedResult] = useState<any>(null)
  const [extractingStructured, setExtractingStructured] = useState(false)
  const [structuredResult, setStructuredResult] = useState<any>(null)

  // Team state
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState("")

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    setStaffLoading(true)
    try {
      const res = await fetch("/api/invite-staff")
      const data = await res.json()
      setStaff(data.staff || [])
    } catch {}
    setStaffLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError("")
    setInviteSuccess("")
    try {
      const res = await fetch("/api/invite-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || "Failed to invite")
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`)
        setInviteName("")
        setInviteEmail("")
        setInviteOpen(false)
        loadStaff()
      }
    } catch {
      setInviteError("Something went wrong")
    }
    setInviting(false)
  }

  async function removeStaff(id: string) {
    if (!confirm("Remove this team member? They will lose access immediately.")) return
    await fetch("/api/invite-staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    loadStaff()
  }

  async function runBulkEmbed() {
    setEmbedding(true)
    setEmbedResult(null)
    try {
      const res = await fetch("/api/bulk-embed", { method: "POST" })
      const data = await res.json()
      setEmbedResult(data)
    } catch {
      setEmbedResult({ error: "Failed" })
    }
    setEmbedding(false)
  }

  async function runExtractStructured() {
    setExtractingStructured(true)
    setStructuredResult(null)
    try {
      const res = await fetch("/api/bulk-extract-structured", { method: "POST" })
      const data = await res.json()
      setStructuredResult(data)
    } catch {
      setStructuredResult({ error: "Failed" })
    }
    setExtractingStructured(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and maintenance tools.</p>
      </div>

      {/* Team */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-teal" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Team</h3>
              <p className="text-sm text-gray-500 mt-0.5">Manage who has access to the GPS internal platform.</p>
            </div>
          </div>
          <button onClick={() => { setInviteOpen(!inviteOpen); setInviteError(""); setInviteSuccess("") }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Invite
          </button>
        </div>

        {/* Invite form */}
        {inviteOpen && (
          <form onSubmit={handleInvite} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <p className="text-sm font-medium text-gray-700">Invite a new team member</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full name"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
            {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={inviting} className="btn-primary text-sm flex items-center gap-2">
                {inviting ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                {inviting ? "Sending..." : "Send invite"}
              </button>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-sm text-gray-400 hover:text-gray-600 px-3">
                Cancel
              </button>
            </div>
          </form>
        )}

        {inviteSuccess && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 rounded-xl text-sm text-green-700">
            <CheckCircle size={14} /> {inviteSuccess}
          </div>
        )}

        {/* Staff list */}
        {staffLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 size={14} className="animate-spin" /> Loading team...
          </div>
        ) : (
          <div className="space-y-2">
            {staff.filter(s => s.is_active).map(member => (
              <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ background: "#028090" }}>
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 capitalize">{member.role}</span>
                  <button onClick={() => removeStaff(member.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extract Structured Profiles */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Extract Structured Profiles</h3>
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              AI reads each candidate's full CV and extracts a rich structured profile — real responsibilities, skills (explicit and implied), certifications, seniority signals, career trajectory and more. Powers intelligent talent pool matching.
            </p>
            <p className="text-xs text-gray-400 mb-4">Run before generating embeddings. Safe to run anytime — skips candidates already processed.</p>

            {structuredResult && (
              <div className={`rounded-xl p-4 mb-4 text-sm ${structuredResult.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {structuredResult.error
                  ? <p>Error: {structuredResult.error}</p>
                  : <p className="font-semibold">✓ {structuredResult.processed} profiles extracted · {structuredResult.skipped} already done · {structuredResult.failed} failed</p>}
              </div>
            )}

            <button onClick={runExtractStructured} disabled={extractingStructured} className="btn-primary flex items-center gap-2">
              {extractingStructured
                ? <><Loader2 size={14} className="animate-spin" /> Extracting profiles...</>
                : <><Sparkles size={14} /> Extract Structured Profiles</>}
            </button>
          </div>
        </div>
      </div>

      {/* Generate Embeddings */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Generate Embeddings</h3>
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              Creates AI vector embeddings for all candidates — semantic fingerprints that enable intelligent search and talent pool matching. Each embedding captures what a candidate actually does, not just their job title.
            </p>
            <p className="text-xs text-gray-400 mb-4">Run after extracting structured profiles. Processes up to 50 candidates per run. Safe to run multiple times — skips candidates already embedded.</p>

            {embedResult && (
              <div className={`rounded-xl p-4 mb-4 text-sm ${embedResult.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {embedResult.error
                  ? <p>Error: {embedResult.error}</p>
                  : <p className="font-semibold">✓ {embedResult.processed} embeddings created · {embedResult.failed} failed</p>}
              </div>
            )}

            <button onClick={runBulkEmbed} disabled={embedding} className="btn-primary flex items-center gap-2">
              {embedding
                ? <><Loader2 size={14} className="animate-spin" /> Generating embeddings...</>
                : <><Database size={14} /> Generate Embeddings</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
