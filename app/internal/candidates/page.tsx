
"use client"
function PhoneInput({ value, onChange, style = {} }: { value: string, onChange: (val: string) => void, style?: any }) {
  const num = value.startsWith("+20") ? value.slice(3).trim() : value.replace(/^00?20/, "").trim()
  return (
    <div style={{ display: "flex", border: "1.5px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", background: "white", ...style }}>
      <div style={{ padding: "12px 14px", background: "#f5f5f5", borderRight: "1.5px solid #e5e7eb", fontSize: "14px", fontWeight: 700, color: "#555", userSelect: "none", flexShrink: 0, display: "flex", alignItems: "center" }}>
        +20
      </div>
      <input
        type="tel"
        value={num}
        onChange={e => {
          const digits = e.target.value.replace(/[^0-9 ]/g, "")
          onChange("+20" + (digits ? " " + digits : ""))
        }}
        placeholder="100 123 4567"
        style={{ flex: 1, padding: "12px 14px", border: "none", outline: "none", fontSize: "14px", background: "transparent" }}
      />
    </div>
  )
}
import CandidateAvatar from "@/components/CandidateAvatar"
import { useState, useEffect } from "react"
import { Plus, Search, Users, MapPin, Mail, Phone, X, ChevronRight, Loader2, Star,
  ExternalLink, CheckCircle, AlertCircle, MessageSquare, FileText, Save, Briefcase } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

const SOURCE_COLORS: Record<string, string> = {
  direct: "bg-teal/10 text-teal",
  referral: "bg-purple-100 text-purple-700",
  linkedin: "bg-blue-100 text-blue-700",
  wuzzuf: "bg-amber-100 text-amber-700",
  bayt: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-600",
}

const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  shortlisted: "bg-teal/10 text-teal",
  offered: "bg-amber-100 text-amber-700",
  placed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
}

function CandidateModal({ candidate, onClose, onNoteSaved }: { candidate: any, onClose: () => void, onNoteSaved: (id: string, internalNotes: string) => void }) {
  const [tab, setTab] = useState<"overview" | "cv" | "applications" | "notes">("overview")
  const [notes, setNotes] = useState(candidate.internal_notes || "")
  // internal_notes is separate from AI notes field
  const [savingNotes, setSavingNotes] = useState(false)
  const supabase = createClient()
  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"

  async function saveNotes() {
    setSavingNotes(true)
    await supabase.from("candidates").update({ internal_notes: notes }).eq("id", candidate.id)
    onNoteSaved(candidate.id, notes)
    setSavingNotes(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative group flex-shrink-0">
              <CandidateAvatar name={candidate?.name || "?"} avatarUrl={candidate?.avatar_url} size={48} />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-white text-xs">📷</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file && candidate) {
                      const fd = new FormData()
                      fd.append("file", file)
                      fd.append("candidateId", candidate.id)
                      const res = await fetch("/api/upload-photo", { method: "POST", body: fd })
                      const data = await res.json()
                      if (data.avatar_url) { window.location.reload() }
                    }
                  }} />
              </label>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{candidate.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {candidate.current_title}{candidate.current_company ? ` @ ${candidate.current_company}` : ""}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                {candidate.email && (
                  <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal transition-colors">
                    <Mail size={11} /> {candidate.email}
                  </a>
                )}
                {candidate.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={11} /> {candidate.phone}
                  </span>
                )}
                {candidate.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={11} /> {candidate.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge ${SOURCE_COLORS[candidate.source] || "bg-gray-100 text-gray-600"} text-xs`}>{candidate.source}</span>
            {(candidate as any).cv_source === "gps_builder" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-teal/10 text-teal border border-teal/20">
                ★ GPS CV
              </span>
            )}
            <Link href={`/internal/candidates/${candidate.id}`}
              className="p-1.5 text-gray-400 hover:text-teal transition-colors rounded-lg hover:bg-gray-50" title="Full profile">
              <ExternalLink size={15} />
            </Link>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 flex-shrink-0 border-b border-gray-100">
          {[
            { id: "overview", icon: Briefcase, label: "Overview" },
            { id: "cv", icon: FileText, label: "CV" },
            { id: "applications", icon: Briefcase, label: `Roles${candidate?.applications?.length ? ` (${candidate.applications.length})` : ""}` },
            { id: "notes", icon: MessageSquare, label: "Notes" },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
                ${tab === id ? "border-teal text-teal" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Overview */}
          {tab === "overview" && (
            <div className="space-y-5">
              {candidate.applications?.length === 0 || !candidate.applications ? (
                <div className="text-center py-10">
                  <Briefcase size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-400 text-sm">Not assigned to any mandates yet.</p>
                </div>
              ) : (
                candidate.applications.map((app: any) => (
                  <div key={app.id} className="border border-gray-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/internal/mandates/${app.mandate?.id}`}
                        className="font-semibold text-gray-900 hover:text-teal transition-colors flex items-center gap-1.5 text-sm">
                        {app.mandate?.title} <ExternalLink size={12} className="text-gray-400" />
                      </Link>
                      <div className="flex items-center gap-2">
                        {app.ai_score && (
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            <span className="text-sm font-bold" style={{ color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                          </div>
                        )}
                        <span className={`badge ${STAGE_COLORS[app.stage] || "bg-gray-100 text-gray-600"} capitalize text-xs`}>{app.stage}</span>
                      </div>
                    </div>
                    {app.ai_score && (
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${app.ai_score}%`, background: scoreColor(app.ai_score) }} />
                      </div>
                    )}
                    {app.ai_summary && (
                      <p className="text-sm text-gray-600 leading-relaxed">{app.ai_summary}</p>
                    )}
                    {(app.ai_strengths?.length > 0 || app.ai_concerns?.length > 0) && (
                      <div className="grid grid-cols-2 gap-3">
                        {app.ai_strengths?.length > 0 && (
                          <div className="bg-green-50 rounded-xl p-3">
                            <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1"><CheckCircle size={11} /> Strengths</div>
                            <ul className="space-y-1">
                              {app.ai_strengths.map((s: string, i: number) => (
                                <li key={i} className="text-xs text-green-800 flex gap-1.5"><span className="flex-shrink-0">•</span>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {app.ai_concerns?.length > 0 && (
                          <div className="bg-amber-50 rounded-xl p-3">
                            <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertCircle size={11} /> Areas to probe</div>
                            <ul className="space-y-1">
                              {app.ai_concerns.map((c: string, i: number) => (
                                <li key={i} className="text-xs text-amber-800 flex gap-1.5"><span className="flex-shrink-0">•</span>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* CV */}
          {tab === "cv" && (
            <div>
              {/* CV file actions — Preview + Download */}
              {(candidate.cv_pdf_url || candidate.cv_file_url) && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <FileText size={15} className="text-teal flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {candidate.cv_source === "gps_builder" ? "GPS-built CV" : `Original CV${candidate.cv_file_type ? ` (${candidate.cv_file_type.toUpperCase()})` : ""}`}
                  </span>
                  {candidate.cv_source === "gps_builder" && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-teal/10 text-teal border border-teal/20">★ GPS CV</span>
                  )}
                  <div className="flex gap-2">
                    {/* Preview — PDF only */}
                    {(candidate.cv_pdf_url || candidate.cv_file_type === "pdf") && (
                      <a href={candidate.cv_pdf_url || candidate.cv_file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-teal hover:text-teal transition-all">
                        <Eye size={12} /> Preview
                      </a>
                    )}
                    {/* Download */}
                    <a href={candidate.cv_pdf_url || candidate.cv_file_url} target="_blank" rel="noopener noreferrer"
                      download={`${candidate.name || "CV"}.${candidate.cv_pdf_url ? "pdf" : candidate.cv_file_type || "pdf"}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal text-white text-xs font-semibold hover:opacity-90 transition-all">
                      <Download size={12} /> Download
                    </a>
                  </div>
                </div>
              )}

              {/* CV text below */}
              {candidate.cv_text ? (
                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-5">
                  {candidate.cv_text}
                </pre>
              ) : (
                <div className="text-center py-12">
                  <FileText size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">No CV stored for this candidate.</p>
                  <p className="text-gray-300 text-xs mt-1">CV text is captured automatically via Bulk CV Upload.</p>
                </div>
              )}
            </div>
          )}

          {/* Applications history */}
          {tab === "applications" && (
            <div className="p-2">
              {!candidate?.applications?.length ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No applications yet</p>
                </div>
              ) : (
                <div>
                  {candidate.applications.map((app: any, idx: number) => {
                    const STAGES = ["new","screening","interview","shortlisted","offered","placed"]
                    const STAGE_LABELS: Record<string,string> = {
                      new:"Received", screening:"Screening", interview:"Interview",
                      shortlisted:"Shortlisted", offered:"Offer", placed:"Placed", on_hold:"On Hold"
                    }
                    const stageIdx = STAGES.indexOf(app.stage)
                    const isPlaced = app.stage === "placed"
                    const isOnHold = app.stage === "on_hold"
                    const dotColor = isPlaced ? "#028090" : isOnHold ? "#ef4444" : "#d97706"
                    const date = app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : ""
                    return (
                      <div key={app.id} className="flex gap-3 px-2">
                        <div className="flex flex-col items-center flex-shrink-0" style={{ width: "14px" }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: "4px" }} />
                          {idx < candidate.applications.length - 1 && (
                            <div style={{ width: "1px", flex: 1, background: "#e5e7eb", minHeight: "28px" }} />
                          )}
                        </div>
                        <div className="flex-1 pb-4 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{app.mandate?.title || "Unknown role"}</p>
                              {app.mandate?.client_name && <p className="text-xs text-gray-500">{app.mandate.client_name}</p>}
                              <p className="text-xs text-gray-400">{date}</p>
                            </div>
                            {app.ai_score != null && (
                              <span className="text-xs font-bold flex-shrink-0" style={{ color: app.ai_score >= 70 ? "#028090" : app.ai_score >= 50 ? "#d97706" : "#9ca3af" }}>
                                {app.ai_score}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 mt-2">
                            {STAGES.slice(0,5).map((s,i) => (
                              <div key={s} style={{ height:"3px", flex:1, borderRadius:"2px", background: i <= stageIdx ? dotColor : "#e5e7eb" }} />
                            ))}
                          </div>
                          <p className="text-xs mt-1" style={{ color: dotColor }}>
                            {STAGE_LABELS[app.stage] || app.stage}{isPlaced ? " ✓" : ""}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {tab === "notes" && (
            <div className="space-y-4">
              {/* AI Summary */}
              {candidate?.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-teal uppercase tracking-wide">AI Summary</span>
                    <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">Auto-generated</span>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed bg-teal/5 border border-teal/10 rounded-xl p-4">
                    {candidate.notes}
                  </div>
                </div>
              )}
              {/* Internal Notes */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Internal Notes</p>
                <p className="text-xs text-gray-400 mb-2">Private — only visible to GPS team</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none text-gray-700 leading-relaxed"
                  placeholder="Add your internal notes, interview feedback, observations..." />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{notes.length} characters</span>
                <button onClick={saveNotes} disabled={savingNotes}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={13} /> {savingNotes ? "Saving..." : "Save notes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [selectedApps, setSelectedApps] = useState<any[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "+20 ", current_title: "", current_company: "",
    location: "", source: "direct", linkedin_url: "", notes: ""
  })
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from("candidates")
      .select("*, avatar_url, internal_notes, cv_file_url, cv_file_type, cv_source, cv_pdf_url, applications(id, stage, ai_score, created_at, mandate:mandates(id, title, client_name))")
      .order("created_at", { ascending: false })
    setCandidates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addCandidate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from("candidates").insert([{ ...form, tags: [] }])
    if (!error) {
      setShowAdd(false)
      setForm({ name: "", email: "", phone: "", current_title: "", current_company: "", location: "", source: "direct", linkedin_url: "", notes: "" })
      load()
    }
    setSaving(false)
  }

  // Smart search — handles phone (with/without spaces/country code), email, name, title, company
  const filtered = (() => {
    if (!search.trim()) return candidates

    const q = search.trim()
    const qLower = q.toLowerCase()

    // Phone search — strip all non-digits and match
    const qDigits = q.replace(/[^0-9]/g, "")
    const looksLikePhone = qDigits.length >= 6 && (q.startsWith("+") || q.startsWith("0") || /^[0-9 \-()]+$/.test(q))

    return candidates.filter(c => {
      // Email match
      if (q.includes("@")) {
        return c.email?.toLowerCase().includes(qLower)
      }

      // Phone match — strip spaces/dashes from stored number and compare digits
      if (looksLikePhone && c.phone) {
        const storedDigits = c.phone.replace(/[^0-9]/g, "")
        // Match if stored contains query digits, or last 8+ digits match
        if (storedDigits.includes(qDigits) || (qDigits.length >= 8 && storedDigits.endsWith(qDigits.slice(-8)))) {
          return true
        }
      }

      // Name, title, company, location, tags, CV text match
      const inStructured = (
        c.name?.toLowerCase().includes(qLower) ||
        c.current_title?.toLowerCase().includes(qLower) ||
        c.current_company?.toLowerCase().includes(qLower) ||
        c.location?.toLowerCase().includes(qLower) ||
        (c.tags || []).some((t: string) => t.toLowerCase().includes(qLower)) ||
        c.email?.toLowerCase().includes(qLower)
      )

      // CV text search — for queries 3+ chars
      const inCV = qLower.length >= 3 && c.cv_text?.toLowerCase().includes(qLower)

      // Tag the result so UI can show "found in CV" badge
      if (inCV && !inStructured) c._foundInCV = true
      return inStructured || inCV
    })
  })()

  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"
  const bestScore = (c: any) => {
    const scores = (c.applications || []).map((a: any) => a.ai_score).filter(Boolean)
    return scores.length > 0 ? Math.max(...scores) : null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 text-sm mt-0.5">{candidates.length} in database</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, title, company, location, tag or keyword in CV..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">No candidates yet.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">Add your first candidate</button>
          </div>
        ) : (
          filtered.map(c => {
            const score = bestScore(c)
            const mandateCount = c.applications?.length || 0
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className="w-full text-left card flex items-center justify-between hover:shadow-md transition-all cursor-pointer group py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                    {c.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-teal transition-colors">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                      {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                      {c.location && <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={10} />{c.location}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {mandateCount > 0 && <span className="text-xs text-gray-400">{mandateCount} mandate{mandateCount > 1 ? "s" : ""}</span>}
                  {score && (
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
                    </div>
                  )}
                  <span className={`badge ${SOURCE_COLORS[c.source] || SOURCE_COLORS.other} text-xs`}>{c.source}</span>
                  {(c as any).cv_source === "gps_builder" && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-teal/10 text-teal border border-teal/20">★ GPS CV</span>
                  )}
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-teal transition-colors" />
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Candidate modal */}
      {selected && (
        <CandidateModal
          candidate={selected}
          onClose={() => setSelected(null)}
          onNoteSaved={(id, internalNotes) => {
            setCandidates(prev => prev.map(c => c.id === id ? { ...c, internal_notes: internalNotes } : c))
            setSelected((prev: any) => ({ ...prev, internal_notes: internalNotes }))
          }}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Candidate</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addCandidate} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name *", key: "name", required: true },
                  { label: "Email *", key: "email", required: true, type: "email" },
                  { label: "Phone", key: "phone" },
                  { label: "Current Title", key: "current_title" },
                  { label: "Current Company", key: "current_company" },
                  { label: "Location", key: "location" },
                  { label: "LinkedIn URL", key: "linkedin_url" },
                ].map(({ label, key, required, type }) => (
                  <div key={key} className={key === "linkedin_url" ? "col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input required={required} type={type || "text"}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                    <option value="direct">Direct</option>
                    <option value="referral">Referral</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="wuzzuf">Wuzzuf</option>
                    <option value="bayt">Bayt</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Add Candidate"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
