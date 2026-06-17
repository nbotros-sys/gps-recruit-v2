"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, CheckCircle } from "lucide-react"

export default function CandidateLogin() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"email" | "code">("email")
  const [error, setError] = useState("")
  const supabase = createClient()

  async function sendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (error) {
      setError("Could not send code. Please try again.")
    } else {
      setStep("code")
    }
    setLoading(false)
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    })
    if (error) {
      setError("Invalid or expired code. Please try again.")
    } else {
      window.location.href = "/account"
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>Sign in to GPS Talent</h1>
          <p style={{ color: "#888", fontSize: "14px" }}>
            {step === "email" ? "Enter your email and we'll send you a 6-digit code." : `We sent a code to ${email}`}
          </p>
        </div>

        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>
          {step === "email" ? (
            <form onSubmit={sendOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Email address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send sign-in code →"}
              </button>
              <p style={{ textAlign: "center", fontSize: "12px", color: "#aaa", margin: 0 }}>
                New to GPS? <a href="/join" style={{ color: "#028090", fontWeight: 600 }}>Register here</a>
              </p>
            </form>
          ) : (
            <form onSubmit={verifyOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>6-digit code</label>
                <input required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" maxLength={6} autoFocus
                  style={{ width: "100%", padding: "16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "24px", fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.3em" }} />
                <p style={{ fontSize: "11px", color: "#aaa", marginTop: "6px", textAlign: "center" }}>Check your inbox — the code expires in 10 minutes</p>
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading || code.length < 6}
                style={{ width: "100%", padding: "13px", borderRadius: "12px", background: code.length === 6 ? "#028090" : "#d1d5db", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: code.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Verifying...</> : "Sign in →"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setCode(""); setError("") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "13px" }}>
                ← Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
