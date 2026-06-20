"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, Building2,
  Edit3, Save, X, Star, FileText, MessageSquare,
  CheckCircle, AlertCircle, Linkedin, ExternalLink, User, Camera, Loader2, Download, Eye
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"

const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  shortlisted: "bg-teal/10 text-teal",
  offered: "bg-amber-100 text-amber-700",
  placed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
}

export default function CandidateProfile() {
  const { id } = useParams()
  const router = useRouter()
  const [candidate, setCandidate] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !candidate?.id) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      // If it's a docx, use extract-photo to pull the embedded image
      // If it's an image, use upload-photo directly
      const isDocx = file.name.match(/\.docx?$/i)
      fd.append("file", file)
      fd.append("candidateId", candidate.id)
      const endpoint = isDocx ? "/api/extract-photo" : "/api/upload-photo"
      const res = await fetch(endpoint, { method: "POST", body: fd })
      const data = await res.json()
      if (data.avatar_url) {
        setCandidate((prev: any) => ({ ...prev, avatar_url: data.avatar_url }))
      }
    } catch (err) { console.error(err) }
    setUploadingPhoto(false)
  }
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "cv" | "notes">("overview")
  const [form, setForm] = useState<any>({})
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from("candidates").select("*").eq("id", id).single()
      if (c) {
        setCandidate(c)
        setForm(c)
        setNotes(c.notes || "")
      }
      const { data: apps } = await supabase
        .from("applications")
        .select("*, mandate:mandates(id, title, client_name, status)")
        .eq("candidate_id", id)
        .order("created_at", { ascending: false })
      setApplications(apps || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from("candidates").update({
      name: form.name,
      email: form.email,
      phone: form.phone,
      current_title: form.current_title,
      current_company: form.current_company,
      location: form.location,
      linkedin_url: form.linkedin_url,
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (!error) {
      setCandidate({ ...candidate, ...form })
      setEditing(false)
    }
    setSaving(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    await supabase.from("candidates").update({ notes }).eq("id", id)
    setCandidate({ ...candidate, notes })
    setSavingNotes(false)
  }

  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (!candidate) return <div className="text-center py-16 text-gray-400">Candidate not found.</div>

  const initials = candidate.name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link href="/internal/candidates" className="text-gray-400 hover:text-teal text-sm flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to Candidates
      </Link>

      {/* Hero card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            {/* Avatar — shows photo if available, otherwise monogram. Click to upload. */}
            <div className="relative group flex-shrink-0" style={{ cursor: "pointer" }} onClick={() => photoRef.current?.click()}>
              <CandidateAvatar
                name={candidate.name || "?"}
                avatarUrl={candidate.avatar_url}
                size={64}
                className="rounded-2xl"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingPhoto
                  ? <Loader2 size={18} color="white" className="animate-spin" />
                  : <Camera size={18} color="white" />}
              </div>
              <input ref={photoRef} type="file" accept="image/*,.docx,.doc" className="hidden"
                onChange={handlePhotoUpload} />
            </div>
            <div>
              {editing ? (
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="text-2xl font-bold text-gray-900 border-b-2 border-teal outline-none bg-transparent w-80" />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                {editing ? (
                  <div className="flex gap-2">
                    <input value={form.current_title} onChange={e => setForm({ ...form, current_title: e.target.value })}
                      placeholder="Job title"
                      className="text-sm text-gray-600 border-b border-gray-300 outline-none bg-transparent w-48" />
                    <span className="text-gray-300">@</span>
                    <input value={form.current_company} onChange={e => setForm({ ...form, current_company: e.target.value })}
                      placeholder="Company"
                      className="text-sm text-gray-600 border-b border-gray-300 outline-none bg-transparent w-48" />
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {candidate.current_title}{candidate.current_company ? ` @ ${candidate.current_company}` : ""}
                  </p>
                )}
              </div>
              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {editing ? (
                  <>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="Email" type="email"
                      className="text-xs text-gray-500 border-b border-gray-300 outline-none bg-transparent w-52" />
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="Phone"
                      className="text-xs text-gray-500 border-b border-gray-300 outline-none bg-transparent w-36" />
                    <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                      placeholder="Location"
                      className="text-xs text-gray-500 border-b border-gray-300 outline-none bg-transparent w-36" />
                    <input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })}
                      placeholder="LinkedIn URL"
                      className="text-xs text-gray-500 border-b border-gray-300 outline-none bg-transparent w-52" />
                  </>
                ) : (
                  <>
                    {candidate.email && (
                      <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal transition-colors">
                        <Mail size={12} /> {candidate.email}
                      </a>
                    )}
                    {candidate.phone && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone size={12} /> {candidate.phone}
                      </span>
                    )}
                    {candidate.location && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} /> {candidate.location}
                      </span>
                    )}
                    {candidate.linkedin_url && (
                      <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
                        <ExternalLink size={12} /> LinkedIn
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badges + actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {/* Source badge */}
            <span className="badge bg-gray-100 text-gray-500 text-xs">{candidate.source}</span>

            {/* GPS CV badge — shown when CV was built through the GPS builder */}
            {candidate.cv_source === "gps_builder" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal/10 text-teal border border-teal/20">
                <span style={{ fontSize: "9px" }}>★</span> GPS CV
              </span>
            )}

            {/* Preview + Download CV — only shown when a stored PDF exists */}
            {candidate.cv_pdf_url && (
              <>
                <a
                  href={candidate.cv_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <Eye size={14} /> Preview CV
                </a>
                <a
                  href={candidate.cv_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-1.5 text-sm"
                  download={`${candidate.name || "CV"}.pdf`}
                >
                  <Download size={14} /> Download CV
                </a>
              </>
            )}

            {editing ? (
              <>
                <button onClick={saveProfile} disabled={saving}
                  className="btn-primary flex items-center gap-1.5 text-sm">
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setForm(candidate); setEditing(false) }}
                  className="btn-secondary flex items-center gap-1.5 text-sm">
                  <X size={14} /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="btn-secondary flex items-center gap-1.5 text-sm">
                <Edit3 size={14} /> Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "overview", label: "Overview & Mandates" },
          { id: "cv", label: "CV" },
          { id: "notes", label: "Notes" },
        ].map(({ id: tid, label }) => (
          <button key={tid} onClick={() => setActiveTab(tid as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tid ? "bg-white shadow-sm text-teal" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="card text-center py-12">
              <Briefcase size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Not assigned to any mandates yet.</p>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link href={`/internal/mandates/${app.mandate?.id}`}
                      className="font-semibold text-gray-900 hover:text-teal transition-colors flex items-center gap-1.5">
                      {app.mandate?.title}
                      <ExternalLink size={13} className="text-gray-400" />
                    </Link>
                    {app.mandate?.client_name && (
                      <p className="text-sm text-gray-500 mt-0.5">{app.mandate.client_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STAGE_COLORS[app.stage] || "bg-gray-100 text-gray-500"} capitalize`}>{app.stage}</span>
                    {app.ai_score && (
                      <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold" style={{ color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI score bar */}
                {app.ai_score && (
                  <div className="mb-4">
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${app.ai_score}%`, background: scoreColor(app.ai_score) }} />
                    </div>
                  </div>
                )}

                {/* AI summary */}
                {app.ai_summary && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{app.ai_summary}</p>
                )}

                {/* Strengths + Concerns */}
                {(app.ai_strengths?.length > 0 || app.ai_concerns?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    {app.ai_strengths?.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-3">
                        <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                          <CheckCircle size={11} /> Strengths
                        </div>
                        <ul className="space-y-1">
                          {app.ai_strengths.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-green-800 flex gap-2"><span className="flex-shrink-0">•</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {app.ai_concerns?.length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3">
                        <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                          <AlertCircle size={11} /> Areas to probe
                        </div>
                        <ul className="space-y-1">
                          {app.ai_concerns.map((c: string, i: number) => (
                            <li key={i} className="text-xs text-amber-800 flex gap-2"><span className="flex-shrink-0">•</span>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Stage changer */}
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 mr-1">Move to:</span>
                    {["new","screening","interview","shortlisted","offered","placed","rejected"]
                      .filter(s => s !== app.stage)
                      .map(s => (
                        <button key={s} onClick={async () => {
                          await supabase.from("applications").update({ stage: s }).eq("id", app.id)
                          setApplications(prev => prev.map(a => a.id === app.id ? { ...a, stage: s } : a))
                        }}
                          className={`badge ${STAGE_COLORS[s] || "bg-gray-100 text-gray-500"} capitalize cursor-pointer hover:opacity-80 transition-opacity`}>
                          {s}
                        </button>
                      ))
                    }
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CV tab */}
      {activeTab === "cv" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={16} className="text-teal" /> CV Text
            </h3>
            <span className="text-xs text-gray-400">{candidate.cv_text ? `${candidate.cv_text.length.toLocaleString()} characters` : "No CV stored"}</span>
          </div>
          {candidate.cv_text ? (
            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-5 max-h-[600px] overflow-y-auto">
              {candidate.cv_text}
            </pre>
          ) : (
            <div className="text-center py-12">
              <FileText size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">No CV text stored for this candidate.</p>
              <p className="text-gray-300 text-xs mt-1">CV text is captured automatically when uploading via Bulk CV Upload.</p>
            </div>
          )}
        </div>
      )}

      {/* Notes tab */}
      {activeTab === "notes" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare size={16} className="text-teal" /> Recruiter Notes
            </h3>
            <span className="text-xs text-gray-400">Private — only visible to GPS team</span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none text-gray-700 leading-relaxed"
            placeholder="Add your notes about this candidate here...&#10;&#10;e.g. Spoke on 17 June — very strong on FP&A, open to a move within 3 months. Prefers Cairo-based roles. Salary expectation: 45k EGP."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{notes.length} characters</span>
            <button onClick={saveNotes} disabled={savingNotes}
              className="btn-primary flex items-center gap-2 text-sm">
              <Save size={14} /> {savingNotes ? "Saving..." : "Save notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
