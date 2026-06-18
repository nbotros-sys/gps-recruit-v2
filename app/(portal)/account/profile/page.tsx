"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Save, Loader2, CheckCircle, ArrowLeft, Camera } from "lucide-react"

const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level"]
const COLORS = ["#028090","#3D5A4E","#1d4ed8","#7c3aed","#b45309","#be185d","#0f766e"]

function getColor(name: string) { return COLORS[name.split("").reduce((a,c) => a + c.charCodeAt(0), 0) % COLORS.length] }
function getInitials(name: string) { return name.split(" ").map((w:string) => w[0]).slice(0,2).join("").toUpperCase() }

function completionScore(form: any) {
  const fields = ["name","phone","current_title","current_company","location","linkedin_url","function","level"]
  const filled = fields.filter(f => form[f] && form[f].toString().trim().length > 0).length
  const hasPhoto = !!form.avatar_url
  const hasCV = !!form.cv_text
  return Math.round(((filled + (hasPhoto?1:0) + (hasCV?1:0)) / (fields.length + 2)) * 100)
}

function getMissing(form: any) {
  return [
    { key: "phone", label: "Phone number" },
    { key: "current_title", label: "Job title" },
    { key: "current_company", label: "Current company" },
    { key: "location", label: "Location" },
    { key: "linkedin_url", label: "LinkedIn URL" },
    { key: "function", label: "Function" },
    { key: "level", label: "Seniority level" },
    { key: "avatar_url", label: "Profile photo" },
    { key: "cv_text", label: "CV on file" },
  ].filter(c => !form[c.key] || form[c.key].toString().trim() === "")
}

export default function ProfilePage() {
  const [candidate, setCandidate] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/login"; return }
      const { data: cand } = await supabase.from("candidates").select("*").eq("email", user.email).single()
      if (cand) { setCandidate(cand); setForm(cand) }
      setLoading(false)
    }
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from("candidates").update({
      name: form.name, phone: form.phone,
      current_title: form.current_title, current_company: form.current_company,
      location: form.location, linkedin_url: form.linkedin_url,
    }).eq("id", candidate.id)
    setCandidate({ ...candidate, ...form })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function uploadPhoto(file: File) {
    if (!candidate) return
    setUploadingPhoto(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("candidateId", candidate.id)
    const res = await fetch("/api/upload-photo", { method: "POST", body: fd })
    const data = await res.json()
    if (data.avatar_url) {
      setForm((prev: any) => ({ ...prev, avatar_url: data.avatar_url }))
      setCandidate((prev: any) => ({ ...prev, avatar_url: data.avatar_url }))
    }
    setUploadingPhoto(false)
  }

  if (loading) return <div style={{ textAlign: "center", padding: "80px" }}><Loader2 size={24} style={{ color: "#028090" }} /></div>
  if (!candidate) return null

  const pct = completionScore(form)
  const missing = getMissing(form)
  const initials = form.name ? getInitials(form.name) : "?"
  const color = getColor(form.name || "?")
  const circumference = 2 * Math.PI * 28
  const dash = (pct / 100) * circumference

  const fieldEl = (label: string, key: string, type = "text", placeholder = "") => (
    <div key={key}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "6px" }}>{label}</label>
      <input type={type} value={form[key] || ""} onChange={e => setForm({...form, [key]: e.target.value})}
        placeholder={placeholder}
        style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" }} />
    </div>
  )

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>
      <a href="/account" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#888", fontSize: "13px", textDecoration: "none", marginBottom: "28px" }}>
        <ArrowLeft size={14} /> Back to my account
      </a>

      {/* Header card: avatar + name + completion circle */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "24px 28px" }}>
        
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {form.avatar_url ? (
            <img src={form.avatar_url} alt={form.name} style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", objectPosition: "center top", border: "2px solid #e8e8e8" }} />
          ) : (
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "26px", fontWeight: 700 }}>
              {initials}
            </div>
          )}
          <label style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, cursor: "pointer", transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0"}>
            {uploadingPhoto ? <Loader2 size={18} color="white" /> : <Camera size={18} color="white" />}
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
          </label>
        </div>

        {/* Name + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111", marginBottom: "4px" }}>{form.name || "My Profile"}</h1>
          {form.current_title && (
            <p style={{ color: "#028090", fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>
              {form.current_title}{form.current_company ? ` @ ${form.current_company}` : ""}
            </p>
          )}
          <p style={{ color: "#aaa", fontSize: "13px" }}>{candidate.email}</p>
        </div>

        {/* Completion circle */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: "72px", height: "72px" }}>
            <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke="#f0f0f0" strokeWidth="5" />
              <circle cx="36" cy="36" r="28" fill="none" stroke="#028090" strokeWidth="5"
                strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#111" }}>{pct}%</span>
            </div>
          </div>
          <span style={{ fontSize: "11px", color: "#888", fontWeight: 600, marginTop: "4px" }}>complete</span>
        </div>
      </div>

      {/* Missing fields prompt */}
      {missing.length > 0 && (
        <div style={{ background: "#f0faf8", border: "1px solid #A8D5D1", borderRadius: "16px", padding: "16px 20px", marginBottom: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#028090", marginBottom: "8px" }}>Complete your profile to get matched faster</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {missing.map(m => (
              <span key={m.key} style={{ fontSize: "12px", background: "white", border: "1px solid #A8D5D1", color: "#028090", padding: "3px 10px", borderRadius: "99px", fontWeight: 500 }}>
                + {m.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {pct === 100 && (
        <div style={{ background: "#f0faf8", border: "1px solid #A8D5D1", borderRadius: "16px", padding: "14px 20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle size={16} color="#028090" />
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#028090", margin: 0 }}>Profile complete — GPS consultants can now match you to the right roles.</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={save}>
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {fieldEl("Full Name *", "name")}
            {fieldEl("Phone", "phone")}
            {fieldEl("Current Job Title", "current_title", "text", "e.g. Finance Manager")}
            {fieldEl("Current Company", "current_company", "text", "e.g. ABC Corporation")}
            {fieldEl("Location", "location", "text", "e.g. Cairo, Egypt")}
            {fieldEl("LinkedIn URL", "linkedin_url", "url", "https://linkedin.com/in/...")}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "6px" }}>Function</label>
            <select value={form.function || ""} onChange={e => setForm({...form, function: e.target.value})}
              style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", boxSizing: "border-box" }}>
              <option value="">Select your function</option>
              {FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "6px" }}>Seniority Level</label>
            <select value={form.level || ""} onChange={e => setForm({...form, level: e.target.value})}
              style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", boxSizing: "border-box" }}>
              <option value="">Select your level</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <button type="submit" disabled={saving}
            style={{ padding: "14px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {saving ? <><Loader2 size={15} /> Saving...</>
             : saved ? <><CheckCircle size={15} /> Saved!</>
             : <><Save size={15} /> Save changes</>}
          </button>
        </div>
      </form>
    </div>
  )
}
