"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: cand } = await supabase
          .from("candidates")
          .select("name, current_title, avatar_url")
          .eq("email", user.email)
          .single()
        setCandidate(cand)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = "/jobs"
  }

  const initials = candidate?.name
    ? candidate.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?"

  const firstName = candidate?.name?.split(" ")[0] || ""

  return (
    <div className="min-h-screen" style={{ background: "#F4F8F7" }}>
      <header style={{ background: "#0a1f24", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <a href="/jobs" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img src="/gps-logo.png" alt="GPS" style={{ width: "38px", height: "38px", objectFit: "contain" }} />
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
              Talent Network
            </div>
          </a>

          {/* Nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <a href="/jobs#roles" style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "white"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"}>
              Open Roles
            </a>
            <a href="/how-it-works" style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "white"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"}>
              How it works
            </a>

            {/* Auth area */}
            {!loading && (
              user ? (
                /* Logged in — avatar dropdown */
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "99px", padding: "6px 14px 6px 6px", cursor: "pointer" }}>
                    <CandidateAvatar name={candidate?.name || user?.email || "?"} avatarUrl={candidate?.avatar_url} size={30} />
                    <span style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{firstName || "My Account"}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>▾</span>
                  </button>

                  {menuOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "white", borderRadius: "16px", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", width: "220px", overflow: "hidden", zIndex: 50, border: "1px solid #e8e8e8" }}>
                        {/* Profile header */}
                        <div style={{ padding: "16px 18px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>{candidate?.name || "My Account"}</div>
                          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{candidate?.current_title || user?.email}</div>
                        </div>
                        {/* Menu items */}
                        {[
                          { label: "My Applications", href: "/account", icon: "📋" },
                          { label: "My Profile", href: "/account/profile", icon: "👤" },
                          { label: "My CV", href: "/account/cv", icon: "📄" },
                          { label: "Browse Roles", href: "/jobs", icon: "🔍" },
                        ].map(({ label, href, icon }) => (
                          <a key={label} href={href} onClick={() => setMenuOpen(false)}
                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 18px", textDecoration: "none", color: "#333", fontSize: "13px", fontWeight: 500 }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f5f5"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            <span style={{ fontSize: "15px" }}>{icon}</span>
                            {label}
                          </a>
                        ))}
                        <div style={{ borderTop: "1px solid #f3f4f6" }}>
                          <button onClick={signOut}
                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 18px", background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "13px", fontWeight: 500, width: "100%", textAlign: "left" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fef2f2"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            <span style={{ fontSize: "15px" }}>🚪</span>
                            Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Not logged in */
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <a href="/login" style={{ padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)" }}>
                    Sign in
                  </a>
                  <a href="/join" style={{ padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", textDecoration: "none", background: "#028090" }}>
                    Register →
                  </a>
                </div>
              )
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer style={{ background: "#0a1f24", marginTop: "80px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
            <div>
              <div style={{ color: "white", fontSize: "18px", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.8 }}>GPS</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 48px", fontSize: "13px" }}>
              {[
                { label: "Open Roles", href: "/jobs" },
                { label: "How it works", href: "/how-it-works" },
                { label: "Send your CV", href: "/send-cv" },
                { label: "Register", href: "/join" },
                { label: "Sign in", href: "/login" },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "white"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.45)"}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px", display: "flex", justifyContent: "space-between" }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", margin: 0 }}>© 2026 GPS — Your Trusted HR Partner. Egypt.</p>
            <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px", margin: 0 }}>AI-Matched Recruitment · GPS Talent Network</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
