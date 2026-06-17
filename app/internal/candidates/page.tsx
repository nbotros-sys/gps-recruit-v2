"use client"
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

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [drawerTab, setDrawerTab] = useState<"overview" | "cv">("overview")
  const [form, setForm] = useState({
    name: "", email: "", phone: "", current_title: "", current_company: "",
    location: "", source: "direct", linkedin_url: "", notes: ""
  })
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from("candidates")
      .select("*, applications(id, stage, ai_score, ai_summary, ai_strengths, ai_concerns, mandate:mandates(id, title, client_name))")
      .order("created_at", { ascending: false })
    setCandidates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openDrawer(c: any) {
    setSelected(c)
    setNotes(c.notes || "")
    setDrawerTab("overview")
  }

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

  async function saveNotes() {
    if (!selected) return
    setSavingNotes(true)
    await supabase.from("candidates").update({ notes }).eq("id", selected.id)
    setCandidates(prev => prev.map(c => c.id === selected.id ? { ...c, notes } : c))
    setSelected({ ...selected, notes })
    setSavingNotes(false)
  }

  const filtered = candidates.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

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
            placeholder="Search by name, title, company or email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
        </div>
      </div>

      {/* List */}
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
              <button key={c.id} onClick={() => openDrawer(c)}
                className={`w-full text-left card flex items-center justify-between hover:shadow-md transition-all cursor-pointer group py-4
                  ${selected?.id === c.id ? "ring-2 ring-teal/30 border-teal/20" : ""}`}>
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
                  {mandateCount > 0 && (
                    <span className="text-xs text-gray-400">{mandateCount} mandate{mandateCount > 1 ? "s" : ""}</span>
                  )}
                  {score && (
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
                    </div>
                  )}
                  <span className={`badge ${SOURCE_COLORS[c.source] || SOURCE_COLORS.other} text-xs`}>{c.source}</span>
                  <ChevronRight size={15} className={`transition-colors ${selected?.id === c.id ? "text-teal" : "text-gray-300 group-hover:text-teal"}`} />
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* ── CANDIDATE DRAWER ── */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-[440px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                  {selected.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selected.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {selected.current_title}{selected.current_company ? ` @ ${selected.current_company}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/internal/candidates/${selected.id}`}
                  className="p-1.5 text-gray-400 hover:text-teal transition-colors rounded-lg hover:bg-gray-50" title="Open full profile">
                  <ExternalLink size={15} />
                </Link>
                <button onClick={() => setSelected(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Drawer tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
              {[{ id: "overview", label: "Overview" }, { id: "cv", label: "CV" }].map(({ id, label }) => (
                <button key={id} onClick={() => setDrawerTab(id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${drawerTab === id ? "bg-teal/10 text-teal" : "text-gray-500 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {drawerTab === "overview" && (
                <>
                  {/* Contact */}
                  <div className="space-y-2">
                    {selected.email && (
                      <a href={`mailto:${selected.email}`} className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-teal transition-colors">
                        <Mail size={13} className="text-gray-400 flex-shrink-0" />{selected.email}
                      </a>
                    )}
                    {selected.phone && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Phone size={13} className="text-gray-400 flex-shrink-0" />{selected.phone}
                      </div>
                    )}
                    {selected.location && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <MapPin size={13} className="text-gray-400 flex-shrink-0" />{selected.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`badge ${SOURCE_COLORS[selected.source] || "bg-gray-100 text-gray-600"} text-xs`}>{selected.source}</span>
                    </div>
                  </div>

                  {/* Mandates */}
                  {selected.applications?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <Briefcase size={11} /> Mandates ({selected.applications.length})
                      </div>
                      <div className="space-y-2">
                        {selected.applications.map((app: any) => (
                          <div key={app.id} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Link href={`/internal/mandates/${app.mandate?.id}`}
                                className="text-sm font-medium text-gray-900 hover:text-teal transition-colors truncate">
                                {app.mandate?.title}
                              </Link>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {app.ai_score && (
                                  <span className="text-xs font-bold" style={{ color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                                )}
                                <span className={`badge ${STAGE_COLORS[app.stage] || "bg-gray-100 text-gray-600"} capitalize text-xs`}>{app.stage}</span>
                              </div>
                            </div>
                            {app.ai_summary && (
                              <p className="text-xs text-gray-500 leading-relaxed mt-1">{app.ai_summary}</p>
                            )}
                            {(app.ai_strengths?.length > 0 || app.ai_concerns?.length > 0) && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {app.ai_strengths?.length > 0 && (
                                  <div className="bg-green-50 rounded-lg p-2">
                                    <div className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><CheckCircle size={10} /> Strengths</div>
                                    <ul className="space-y-0.5">
                                      {app.ai_strengths.slice(0, 2).map((s: string, i: number) => (
                                        <li key={i} className="text-xs text-green-800 flex gap-1"><span>•</span>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {app.ai_concerns?.length > 0 && (
                                  <div className="bg-amber-50 rounded-lg p-2">
                                    <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertCircle size={10} /> Concerns</div>
                                    <ul className="space-y-0.5">
                                      {app.ai_concerns.slice(0, 2).map((c: string, i: number) => (
                                        <li key={i} className="text-xs text-amber-800 flex gap-1"><span>•</span>{c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <MessageSquare size={11} /> Recruiter Notes
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none text-gray-700 leading-relaxed"
                      placeholder="Add notes about this candidate..." />
                    <button onClick={saveNotes} disabled={savingNotes}
                      className="mt-2 btn-primary w-full flex items-center justify-center gap-2 text-sm py-2">
                      <Save size={13} /> {savingNotes ? "Saving..." : "Save notes"}
                    </button>
                  </div>
                </>
              )}

              {drawerTab === "cv" && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText size={11} /> CV Text
                  </div>
                  {selected.cv_text ? (
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4">
                      {selected.cv_text}
                    </pre>
                  ) : (
                    <div className="text-center py-10">
                      <FileText size={28} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-gray-400 text-sm">No CV stored for this candidate.</p>
                      <p className="text-gray-300 text-xs mt-1">CV text is captured via Bulk CV Upload.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
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
