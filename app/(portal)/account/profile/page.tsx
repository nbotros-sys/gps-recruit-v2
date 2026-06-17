"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Save, Loader2, CheckCircle, ArrowLeft } from "lucide-react"

const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level"]

export default function ProfilePage() {
  const [candidate, setCandidate] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
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
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const field = (label: string, key: string, type = "text", placeholder = "") => (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "6px" }}>{label}</label>
      <input type={type} value={form[key] || ""} onChange={e => setForm({...form, [key]: e.target.value})}
        placeholder={placeholder}
        style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" }} />
    </div>
  )

  if (loading) return <div style={{ textAlign: "center", padding: "80px" }}><Loader2 size={24} className="animate-spin" style={{ color: "#028090" }} /></div>

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px" }}>
      <a href="/account" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#888", fontSize: "13px", textDecoration: "none", marginBottom: "28px" }}>
        <ArrowLeft size={14} /> Back to my account
      </a>
      <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>My Profile</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "32px" }}>Keep your details up to date so GPS can match you to the right roles.</p>

      <form onSubmit={save}>
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {field("Full Name *", "name")}
            {field("Phone", "phone")}
            {field("Current Job Title", "current_title", "text", "e.g. Finance Manager")}
            {field("Current Company", "current_company", "text", "e.g. ABC Corporation")}
            {field("Location", "location", "text", "e.g. Cairo, Egypt")}
            {field("LinkedIn URL", "linkedin_url", "url", "https://linkedin.com/in/...")}
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
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
             : saved ? <><CheckCircle size={15} /> Saved!</>
             : <><Save size={15} /> Save changes</>}
          </button>
        </div>
      </form>
    </div>
  )
}
