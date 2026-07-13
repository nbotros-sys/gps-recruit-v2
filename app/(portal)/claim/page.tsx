"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react"

function ClaimPage() {
  const supabase = createClient()
  const [token, setToken] = useState("")
  const [checking, setChecking] = useState(true)
  const [state, setState] = useState<"form" | "invalid" | "exists" | "done">("form")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || ""
    setToken(t)
    if (!t) { setState("invalid"); setChecking(false); return }
    fetch(`/api/claim-account?token=${encodeURIComponent(t)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.valid) { setState("invalid") }
        else { setName(d.name); setEmail(d.email); setPhone(d.phone) }
      })
      .catch(() => setState("invalid"))
      .finally(() => setChecking(false))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirm) { setError("Passwords do not match."); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name, phone }),
      })
      const d = await res.json()
      if (d.alreadyExists) { setState("exists"); setLoading(false); return }
      if (!res.ok || d.error) { setError(d.error || "Something went wrong."); setLoading(false); return }
      // Account created — sign them straight in.
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) { setState("done"); setLoading(false); return }
      window.location.href = "/account"
    } catch {
      setError("Something went wrong. Please try again."); setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px",
    fontSize: "14px", outline: "none", boxSizing: "border-box",
  }
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px",
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>Set up your account</h1>
          <p style={{ color: "#888", fontSize: "14px" }}>Create a password to track your application.</p>
        </div>

        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>
          {checking ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "24px 0" }}>
              <Loader2 size={22} className="animate-spin" style={{ color: "#028090" }} />
              <p style={{ color: "#888", fontSize: "13px" }}>Checking your link...</p>
            </div>
          ) : state === "invalid" ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ color: "#444", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
                This link is invalid or has expired.
              </p>
              <a href="/login" style={{ color: "#028090", fontWeight: 700, textDecoration: "none", fontSize: "14px" }}>Go to sign in →</a>
            </div>
          ) : state === "exists" ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ color: "#444", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
                You already have an account with this email.
              </p>
              <a href="/login" style={{ color: "#028090", fontWeight: 700, textDecoration: "none", fontSize: "14px" }}>Sign in instead →</a>
            </div>
          ) : state === "done" ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <CheckCircle size={40} style={{ color: "#028090", margin: "0 auto 12px" }} />
              <p style={{ color: "#111", fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>Account created</p>
              <a href="/login" style={{ color: "#028090", fontWeight: 700, textDecoration: "none", fontSize: "14px" }}>Sign in →</a>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={email} disabled style={{ ...inputStyle, background: "#f3f4f6", color: "#888" }} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="Optional" />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input required type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: "44px" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm password</label>
                <input required type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password" style={inputStyle} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : "Create account →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClaimPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 className="animate-spin" style={{ color: "#028090" }} /></div>}>
      <ClaimPage />
    </Suspense>
  )
}
