"use client"
import { useState, useEffect } from "react"
import { Loader2, Database, Zap, Sparkles, Users, Plus, Trash2, Mail, CheckCircle, KeyRound, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface StaffMember {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function SettingsClient({ initialStaff, isAdmin, currentEmail }: { initialStaff: StaffMember[]; isAdmin: boolean; currentEmail: string }) {
  const supabase = createClient()
  const [credits, setCredits] = useState<number | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [creditsError, setCreditsError] = useState("")
  const [embedding, setEmbedding] = useState(false)
  const [embedResult, setEmbedResult] = useState<any>(null)
  const [extractingStructured, setExtractingStructured] = useState(false)
  const [structuredResult, setStructuredResult] = useState<any>(null)

  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState("")

  // Change own password
  const [myPw, setMyPw] = useState("")
  const [myPw2, setMyPw2] = useState("")
  const [myPwBusy, setMyPwBusy] = useState(false)
  const [myPwMsg, setMyPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Admin: set another member's password
  const [pwForId, setPwForId] = useState<string | null>(null)
  const [pwValue, setPwValue] = useState("")
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  async function changeMyPassword(e: React.FormEvent) {
    e.preventDefault()
    setMyPwMsg(null)
    if (myPw.length < 8) { setMyPwMsg({ ok: false, text: "Password must be at least 8 characters." }); return }
    if (myPw !== myPw2) { setMyPwMsg({ ok: false, text: "Passwords don't match." }); return }
    setMyPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: myPw })
    setMyPwBusy(false)
    if (error) { setMyPwMsg({ ok: false, text: error.message }); return }
    setMyPw(""); setMyPw2("")
    setMyPwMsg({ ok: true, text: "Your password has been updated." })
  }

  async function setMemberPassword(member: StaffMember) {
    setPwMsg(null)
    if (pwValue.length < 8) { setPwMsg({ id: member.id, ok: false, text: "Password must be at least 8 characters." }); return }
    setPwBusy(true)
    try {
      const res = await fetch("/api/set-staff-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email, password: pwValue }),
      })
      const data = await res.json().catch(() => ({}))
      setPwBusy(false)
      if (!res.ok) { setPwMsg({ id: member.id, ok: false, text: data.error || "Failed to set password." }); return }
      setPwValue(""); setPwForId(null)
      setPwMsg({ id: member.id, ok: true, text: `Password set for ${member.full_name}. Share it with them to log in.` })
    } catch {
      setPwBusy(false)
      setPwMsg({ id: member.id, ok: false, text: "Something went wrong." })
    }
  }

  async function refreshStaff() {
    const res = await fetch("/api/invite-staff")
    const data = await res.json()
    setStaff(data.staff || [])
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
        refreshStaff()
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
    refreshStaff()
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

  async function loadCredits() {
    setCreditsLoading(true)
    setCreditsError("")
    try {
      const res = await fetch("/api/enrich-credits")
      const data = await res.json()
      if (data.error) setCreditsError(data.error)
      else setCredits(typeof data.credit_balance === "number" ? data.credit_balance : null)
    } catch {
      setCreditsError("Could not load balance")
    }
    setCreditsLoading(false)
  }

  useEffect(() => {
    loadCredits()
  }, [])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and maintenance tools.</p>
      </div>

      {/* Enrich Layer credits */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
              <Wallet size={18} className="text-teal" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">LinkedIn sourcing credits</h3>
              <p className="text-sm text-gray-500 mt-0.5">Enrich Layer balance used for LinkedIn search &amp; enrichment.</p>
              <div className="mt-3">
                {creditsLoading ? (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> Checking…</span>
                ) : creditsError ? (
                  <span className="text-sm text-red-500">{creditsError}</span>
                ) : credits !== null ? (
                  <span className="text-2xl font-bold text-gray-900">{credits.toLocaleString()} <span className="text-sm font-medium text-gray-400">credits left</span></span>
                ) : (
                  <span className="text-sm text-gray-400">Not available</span>
                )}
              </div>
              {credits !== null && !creditsLoading && credits < 300 && (
                <p className="text-xs text-amber-600 mt-2 font-medium">Running low — consider topping up.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button onClick={loadCredits} disabled={creditsLoading}
              className="text-xs text-teal hover:underline disabled:opacity-50">Refresh</button>
            <a href="https://enrichlayer.com/pricing" target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg" style={{ background: "#028090" }}>Top up</a>
          </div>
        </div>
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

        <div className="space-y-2">
          {staff.filter(s => s.is_active).map(member => (
            <div key={member.id} className="rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between py-2.5 px-3">
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
                  {isAdmin && (
                    <button onClick={() => { setPwForId(pwForId === member.id ? null : member.id); setPwValue(""); setPwMsg(null) }}
                      title="Set or reset this member's password"
                      className="text-gray-300 hover:text-teal transition-colors p-1 rounded">
                      <KeyRound size={13} />
                    </button>
                  )}
                  <button onClick={() => removeStaff(member.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {isAdmin && pwForId === member.id && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <input type="password" value={pwValue} onChange={e => setPwValue(e.target.value)}
                    placeholder="New password (min 8 characters)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  <button onClick={() => setMemberPassword(member)} disabled={pwBusy}
                    className="px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: "#028090" }}>
                    {pwBusy ? "Setting..." : "Set"}
                  </button>
                  <button onClick={() => { setPwForId(null); setPwValue("") }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancel</button>
                </div>
              )}
              {pwMsg && pwMsg.id === member.id && (
                <div className={`px-3 pb-2 text-xs ${pwMsg.ok ? "text-green-600" : "text-red-500"}`}>{pwMsg.text}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change my password */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
            <KeyRound size={18} className="text-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Change my password</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Update the password for your own account{currentEmail ? ` (${currentEmail})` : ""}.
            </p>
            <form onSubmit={changeMyPassword} className="space-y-3 max-w-sm">
              <input type="password" value={myPw} onChange={e => setMyPw(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
              <input type="password" value={myPw2} onChange={e => setMyPw2(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
              {myPwMsg && <p className={`text-sm ${myPwMsg.ok ? "text-green-600" : "text-red-500"}`}>{myPwMsg.text}</p>}
              <button type="submit" disabled={myPwBusy}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: "#028090" }}>
                {myPwBusy ? "Updating..." : "Update password"}
              </button>
            </form>
          </div>
        </div>
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
