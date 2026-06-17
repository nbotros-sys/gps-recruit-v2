"use client"
import { useState, useRef } from "react"
import { Upload, X, CheckCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

export default function SendCVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("+20 ")
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError("")

    try {
      // Extract CV text
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const { text: cvText } = await extractRes.json()

      // Build AI profile
      const profileRes = await fetch("/api/build-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText || "", filename: file.name })
      })
      const profile = await profileRes.json()

      // Check if already exists
      const { data: existing } = await supabase
        .from("candidates")
        .select("id")
        .eq("email", email)
        .single()

      if (!existing) {
        await supabase.from("candidates").insert([{
          name: name || profile.name,
          email,
          phone: phone !== "+20 " ? phone : profile.phone,
          current_title: profile.current_title,
          current_company: profile.current_company,
          location: profile.location,
          cv_text: cvText || "",
          tags: profile.tags || [],
          source: "direct",
          notes: profile.summary || "",
        }])
      }

      // Send magic link — this is the registration prompt email
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { name }
        }
      })

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
    }
    setSubmitting(false)
  }

  if (submitted) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "460px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", background: "#e6f5f3", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <CheckCircle size={32} color="#028090" />
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>CV received</h1>
        <p style={{ color: "#666", fontSize: "15px", lineHeight: 1.7, marginBottom: "24px" }}>
          Thank you, <strong>{name}</strong>. Your CV is now in the GPS Talent Network.<br />
          We've sent a link to <strong>{email}</strong> — click it to access your account and track your profile.
        </p>
        <div style={{ background: "#f0faf8", border: "1px solid #A8D5D1", borderRadius: "16px", padding: "20px 24px", textAlign: "left", marginBottom: "28px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#111", marginBottom: "10px" }}>What happens next</p>
          {[
            "Check your email for a sign-in link",
            "GPS consultants will review your CV personally",
            "We'll reach out when the right opportunity appears",
          ].map(s => (
            <div key={s} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#028090", flexShrink: 0, marginTop: "6px" }} />
              <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>{s}</p>
            </div>
          ))}
        </div>
        <a href="/jobs" style={{ display: "inline-block", padding: "12px 28px", borderRadius: "12px", border: "1.5px solid #ddd", fontSize: "14px", fontWeight: 600, color: "#555", textDecoration: "none" }}>
          Browse open roles
        </a>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)", padding: "60px 40px 50px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "20px" }} />
          <h1 style={{ fontSize: "38px", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: "12px" }}>
            Send us your CV
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px", lineHeight: 1.65 }}>
            No account needed. Drop your CV and we'll reach out when something genuinely fits your profile.
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "48px 24px" }}>
        <form onSubmit={submit}>
          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px", display: "flex", flexDirection: "column", gap: "18px" }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Full Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Email *</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* CV Upload */}
            {file ? (
              <div style={{ background: "#f0faf8", border: "1.5px solid #A8D5D1", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>{file.name}</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{(file.size / 1024).toFixed(0)} KB</div>
                </div>
                <button type="button" onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
              </div>
            ) : (
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "36px 24px", border: `2px dashed ${dragOver ? "#028090" : "#d1e8e5"}`, borderRadius: "16px", cursor: "pointer", background: dragOver ? "#f0faf8" : "#fafffe", transition: "all 0.15s" }}>
                <div style={{ width: "48px", height: "48px", background: "#e6f5f3", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload size={20} color="#028090" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>Drop your CV here</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>or click to browse · PDF or Word</div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
                  onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            )}

            {error && <p style={{ color: "#ef4444", fontSize: "12px", textAlign: "center", margin: 0 }}>{error}</p>}

            <button type="submit" disabled={!file || !name || !email || submitting}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: file && name && email ? "#028090" : "#d1d5db", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: file && name && email ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending CV...</> : "Send CV to GPS →"}
            </button>

            <p style={{ textAlign: "center", fontSize: "11px", color: "#bbb", margin: 0, lineHeight: 1.6 }}>
              No account required. Your CV is never shared without your consent.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
