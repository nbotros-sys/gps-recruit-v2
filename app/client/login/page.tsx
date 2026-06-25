"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"

export default function ClientLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError("Invalid email or password. Please try again."); setLoading(false); return }

      // Look up which mandate this client is linked to
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("mandate_id")
        .eq("email", email.toLowerCase().trim())
        .eq("is_active", true)
        .maybeSingle()

      if (!clientUser?.mandate_id) {
        await supabase.auth.signOut()
        setError("Your account is not linked to any active mandate. Please contact GPS.")
        setLoading(false)
        return
      }

      window.location.href = `/client/${clientUser.mandate_id}`
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8f7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>

      {/* GPS Logo */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0a1f24", letterSpacing: "0.02em" }}>GPS Recruitment</div>
            <div style={{ fontSize: "10px", color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase" }}>Client Portal</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: "white", borderRadius: "20px", padding: "40px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 20px 48px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0a1f24", marginBottom: "6px" }}>Sign in</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "28px", lineHeight: 1.5 }}>
          Access your shortlisted candidates and mandate updates.
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
              onFocus={e => (e.target.style.borderColor = "#028090")}
              onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
              onFocus={e => (e.target.style.borderColor = "#028090")}
              onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 14px", fontSize: "13px", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{ background: loading ? "#9ca3af" : "#028090", color: "white", border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "opacity 0.15s", marginTop: "4px" }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88" }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>
      </div>

      <p style={{ marginTop: "24px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
        Having trouble signing in? Contact your GPS consultant.
      </p>
    </div>
  )
}
