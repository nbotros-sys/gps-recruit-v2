"use client"
import { useState, useRef } from "react"
import { Upload, X, CheckCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level (CEO, CFO, COO...)"]

type SubmitState = "idle" | "submitting" | "done_new" | "done_existing"

export default function JoinPage() {
  const [step, setStep] = useState<"info" | "cv">("info")
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<SubmitState>("idle")
  const [form, setForm] = useState({ name: "", email: "", phone: "+20 ", function: "", level: "", location: "" })
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function submit() {
    if (!file || !form.name || !form.email) return
    setState("submitting")
    setError("")
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from("candidates")
        .select("id, name")
        .eq("email", form.email)
        .single()

      if (existing) {
        // Already registered — just send magic link
        await supabase.auth.signInWithOtp({
          email: form.email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        })
        setState("done_existing")
        return
      }

      // New registration — extract CV + build profile
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const { text: cvText } = await extractRes.json()

      const profileRes = await fetch("/api/build-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText || "", filename: file.name })
      })
      const profile = await profileRes.json()

      await supabase.from("candidates").insert([{
        name: form.name || profile.name,
        email: form.email,
        phone: form.phone !== "+20 " ? form.phone : (profile.phone || null),
        current_title: profile.current_title,
        current_company: profile.current_company,
        location: form.location || profile.location,
        cv_text: cvText || "",
        tags: [...(profile.tags || []), form.function, form.level].filter(Boolean),
        source: "direct",
        notes: [profile.summary, form.function ? `Function: ${form.function}` : "", form.level ? `Level: ${form.level}` : ""].filter(Boolean).join(" | "),
      }])

      await supabase.auth.signInWithOtp({
        email: form.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { name: form.name }
        }
      })

      setState("done_new")
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
      setState("idle")
    }
  }

  if (state === "done_existing") return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "460px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", background: "#e6f5f3", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <CheckCircle size={32} color="#028090" />
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>Welcome back!</h1>
        <p style={{ color: "#666", fontSize: "15px", lineHeight: 1.7, marginBottom: "24px" }}>
          You're already in the GPS Talent Network. We've sent a sign-in link to <strong>{form.email}</strong> — click it to access your profile and applications.
        </p>
        <a href="/jobs" style={{ display: "inline-block", padding: "12px 28px", borderRadius: "12px", border: "1.5px solid #ddd", fontSize: "14px", fontWeight: 600, color: "#555", textDecoration: "none" }}>
          Browse open roles
        </a>
      </div>
    </div>
  )

  if (state === "done_new") return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "460px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", background: "#e6f5f3", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <CheckCircle size={32} color="#028090" />
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>You're in the network</h1>
        <p style={{ color: "#666", fontSize: "15px", lineHeight: 1.7, marginBottom: "24px" }}>
          Welcome to GPS Talent, <strong>{form.name}</strong>. We've sent a sign-in link to <strong>{form.email}</strong> — click it to access your account.
        </p>
        <div style={{ background: "#f0faf8", border: "1px solid #A8D5D1", borderRadius: "16px", padding: "20px 24px", textAlign: "left", marginBottom: "28px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#111", marginBottom: "10px" }}>What happens next</p>
          {["Check your email for a sign-in link","GPS consultants will review your profile personally","We'll reach out when a role genuinely matches your background"].map(s => (
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
      <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)", padding: "60px 40px 50px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "20px" }} />
          <h1 style={{ fontSize: "42px", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: "14px" }}>Join GPS Talent</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px", lineHeight: 1.65, maxWidth: "500px", margin: "0 auto" }}>
            Tell us who you are and upload your CV. GPS will reach out when the right opportunity appears.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "40px" }}>
          {["Your details", "Upload CV"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: (step === "info" && i === 0) || (step === "cv" && i === 1) ? "#028090" : i < (step === "cv" ? 1 : 0) ? "#028090" : "#e5e7eb",
                  color: "white", fontSize: "13px", fontWeight: 700
                }}>
                  {i < (step === "cv" ? 1 : 0) ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: (step === "info" && i === 0) || (step === "cv" && i === 1) ? "#028090" : "#9ca3af" }}>{label}</span>
              </div>
              {i < 1 && <div style={{ flex: 1, height: "2px", background: step === "cv" ? "#028090" : "#e5e7eb", margin: "0 8px", marginBottom: "20px" }} />}
            </div>
          ))}
        </div>

        {step === "info" && (
          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#111", marginBottom: "6px" }}>Tell us about yourself</h2>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>Let's get to know you. We'll use this to find the right opportunities for you.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Full Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your full name"
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com"
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>What do you do?</label>
                <select value={form.function} onChange={e => setForm({...form, function: e.target.value})}
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", boxSizing: "border-box" }}>
                  <option value="">Select function</option>
                  {FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Level</label>
                <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", boxSizing: "border-box" }}>
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Cairo, Egypt"
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => { if (form.name && form.email) setStep("cv"); else setError("Please fill in your name and email.") }}
              style={{ marginTop: "24px", width: "100%", padding: "14px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer" }}>
              Continue →
            </button>
            {error && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px", textAlign: "center" }}>{error}</p>}
          </div>
        )}

        {step === "cv" && (
          <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#111", marginBottom: "6px" }}>Upload your CV</h2>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "28px" }}>PDF or Word. Our AI will read it intelligently — the more detail the better.</p>
            {file ? (
              <div style={{ background: "#f0faf8", border: "1.5px solid #A8D5D1", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>{file.name}</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{(file.size / 1024).toFixed(0)} KB · Ready to submit</div>
                </div>
                <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>✕</button>
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "48px 24px", border: "2px dashed #d1e8e5", borderRadius: "16px", cursor: "pointer", marginBottom: "20px", background: "#fafffe" }}>
                <div style={{ width: "52px", height: "52px", background: "#e6f5f3", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>📄</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#111" }}>Drop your CV here</div>
                  <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>or click to browse — PDF or Word</div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
            {error && <p style={{ color: "#ef4444", fontSize: "12px", marginBottom: "12px", textAlign: "center" }}>{error}</p>}
            <button onClick={submit} disabled={!file || state === "submitting"}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: file ? "#028090" : "#d1d5db", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: file ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {state === "submitting" ? "Building your profile..." : "Join GPS Talent Network →"}
            </button>
            <button onClick={() => setStep("info")} style={{ width: "100%", marginTop: "12px", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "13px" }}>
              ← Back
            </button>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#bbb", marginTop: "16px", lineHeight: 1.6 }}>
              Already registered? <a href="/login" style={{ color: "#028090", fontWeight: 600 }}>Sign in here</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
