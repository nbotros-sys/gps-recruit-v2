"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"

type Mode = "login" | "forgot_email" | "forgot_otp" | "forgot_newpassword"

export default function CandidateLogin() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const supabase = createClient()

  // Step 1: Normal login
  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Invalid email or password.")
    else window.location.href = "/account"
    setLoading(false)
  }

  // Step 2: Send OTP for password reset
  async function sendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    if (error) setError("Could not send code. Check your email address.")
    else { setInfo(`A 6-digit code was sent to ${email}`); setMode("forgot_otp") }
    setLoading(false)
  }

  // Step 3: Verify OTP
  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email"
    })
    if (error) setError("Invalid or expired code. Try again.")
    else { setInfo(""); setMode("forgot_newpassword") }
    setLoading(false)
  }

  // Step 4: Set new password
  async function setNewPw(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true); setError("")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setError("Could not update password. Please try again.")
    else window.location.href = "/account"
    setLoading(false)
  }

  const titles: Record<Mode, string> = {
    login: "Sign in to GPS Talent",
    forgot_email: "Reset your password",
    forgot_otp: "Enter your code",
    forgot_newpassword: "Set a new password",
  }
  const subtitles: Record<Mode, string> = {
    login: "Welcome back.",
    forgot_email: "We'll send a code to your email.",
    forgot_otp: info || "Check your inbox.",
    forgot_newpassword: "Almost done — choose a new password.",
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "16px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>{titles[mode]}</h1>
          <p style={{ color: "#888", fontSize: "14px" }}>{subtitles[mode]}</p>
        </div>

        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>

          {/* ── LOGIN ── */}
          {mode === "login" && (
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
                    style={{ width: "100%", padding: "12px 16px", paddingRight: "44px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : "Sign in →"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <button type="button" onClick={() => { setMode("forgot_email"); setError("") }}
                  style={{ color: "#888", background: "none", border: "none", cursor: "pointer" }}>
                  Forgot password?
                </button>
                <a href="/join" style={{ color: "#028090", fontWeight: 600, textDecoration: "none" }}>Register →</a>
              </div>
            </form>
          )}

          {/* ── FORGOT — ENTER EMAIL ── */}
          {mode === "forgot_email" && (
            <form onSubmit={sendOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send code →"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError("") }}
                style={{ color: "#888", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ── FORGOT — ENTER OTP ── */}
          {mode === "forgot_otp" && (
            <form onSubmit={verifyOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>6-digit code</label>
                <input required type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" autoFocus maxLength={6}
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "22px", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.3em", fontWeight: 700 }} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading || otp.length < 6}
                style={{ padding: "13px", borderRadius: "12px", background: otp.length === 6 ? "#028090" : "#d1d5db", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: otp.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Verifying...</> : "Verify code →"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <button type="button" onClick={() => { setMode("forgot_email"); setError(""); setOtp("") }}
                  style={{ color: "#888", background: "none", border: "none", cursor: "pointer" }}>
                  ← Different email
                </button>
                <button type="button" onClick={sendOTP}
                  style={{ color: "#028090", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* ── FORGOT — SET NEW PASSWORD ── */}
          {mode === "forgot_newpassword" && (
            <form onSubmit={setNewPw} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>New password</label>
                <div style={{ position: "relative" }}>
                  <input required type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters" autoFocus
                    style={{ width: "100%", padding: "12px 16px", paddingRight: "44px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>Confirm new password</label>
                <input required type={showNew ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ padding: "13px", borderRadius: "12px", background: "#028090", color: "white", fontWeight: 800, fontSize: "15px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : "Set new password →"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
