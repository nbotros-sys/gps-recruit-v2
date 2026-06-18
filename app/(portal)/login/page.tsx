"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function CandidateLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "reset">("login")
  const [resetSent, setResetSent] = useState(false)
  const supabase = createClient()

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Invalid email or password.")
    } else {
      window.location.href = "/account"
    }
    setLoading(false)
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) setError("Could not send reset email.")
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>Sign in to GPS Talent</h1>
          <p style={{ color: "#888", fontSize: "14px" }}>
            {mode === "login" ? "Welcome back." : "Reset your password."}
          </p>
        </div>

        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>
          {resetSent ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✉️</div>
              <h3 style={{ fontWeight: 700, color: "#111", marginBottom: "8px" }}>Check your email</h3>
              <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
                We sent a reset link to <strong>{email}</strong>. Click it to set a new password.
              </p>
              <button onClick={() => { setResetSent(false); setMode("login") }}
                style={{ color: "#028090", fontWeight: 600, fontSize: "13px", background: "none", border: "none", cursor: "pointer" }}>
                Back to sign in
              </button>
            </div>
          ) : mode === "login" ? (
            <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input required type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", paddingRight: "44px" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : "Sign in →"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <button type="button" onClick={() => { setMode("reset"); setError("") }}
                  style={{ color: "#888", background: "none", border: "none", cursor: "pointer" }}>
                  Forgot password?
                </button>
                <a href="/join" style={{ color: "#028090", fontWeight: 600, textDecoration: "none" }}>
                  Register →
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={sendReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send reset link →"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError("") }}
                style={{ color: "#888", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>
                ← Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
