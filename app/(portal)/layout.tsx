"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"
import { usePathname } from "next/navigation"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const pathname = usePathname()

  const isLoggedInPage = pathname?.startsWith("/account")

  useEffect(() => {
    let mounted = true

    async function resolveCandidate(u: any) {
      if (!u) { if (mounted) setCandidate(null); return }
      const { data: cand } = await supabase
        .from("candidates")
        .select("name, current_title, avatar_url")
        .eq("email", u.email)
        .maybeSingle()
      if (mounted) setCandidate(cand)
    }

    // Authoritative initial check (server-verified)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return
      setUser(user)
      setLoading(false)
      resolveCandidate(user)
    })

    // Keep the header in sync with the real auth state, so it never shows
    // "Sign in / Register" while a valid session actually exists.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      setLoading(false)
      setTimeout(() => { if (mounted) resolveCandidate(u) }, 0)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = "/jobs"
  }

  const firstName = candidate?.name?.split(" ")[0] || ""

  const navLink = (href: string, label: string, active?: boolean) => (
    <a key={href} href={href}
      style={{
        color: active ? "white" : "rgba(255,255,255,0.55)",
        fontSize: "13px", fontWeight: active ? 600 : 500,
        textDecoration: "none", letterSpacing: "0.01em",
        paddingBottom: "2px",
        borderBottom: active ? "2px solid #028090" : "2px solid transparent",
        transition: "color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "white"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = active ? "white" : "rgba(255,255,255,0.55)"}
    >
      {label}
    </a>
  )

  return (
    <div className="min-h-screen" style={{ background: "#F4F8F7" }}>
      <style>{`
        .pnav-mobile { display: none; }
        @media (max-width: 820px) {
          .pnav-desktop { display: none !important; }
          .pnav-mobile { display: flex !important; }
          .phead-inner { padding: 0 16px !important; }
          .pfoot-row { flex-wrap: wrap !important; gap: 16px !important; }
          .pfoot-pad { padding: 32px 20px !important; }
        }
      `}</style>
      <header style={{ background: "#0a1f24", position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="phead-inner" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <a href="/jobs" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img src="/gps-logo.png" alt="GPS" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
              Talent Network
            </div>
          </a>

          {/* Nav */}
          <nav className="pnav-desktop" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {/* Open Roles — smooth scrolls to #roles if already on /jobs, otherwise navigates */}
            <a
              href="/jobs#roles"
              onClick={e => {
                if (window.location.pathname === "/jobs") {
                  e.preventDefault()
                  const el = document.getElementById("roles")
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80
                    window.scrollTo({ top, behavior: "smooth" })
                  }
                }
              }}
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "13px", fontWeight: 500,
                textDecoration: "none", letterSpacing: "0.01em",
                paddingBottom: "2px",
                borderBottom: "2px solid transparent",
                transition: "color 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "white"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"}
            >
              Open Roles
            </a>
            {navLink("/how-it-works", "How it works")}

            {!loading && (
              user ? (
                <>
                  {/* Dashboard link — only when logged in */}
                  {navLink("/account", "My Dashboard", isLoggedInPage)}

                  {/* Avatar dropdown */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      style={{
                        display: "flex", alignItems: "center", gap: "9px",
                        background: menuOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "99px", padding: "5px 12px 5px 5px",
                        cursor: "pointer", transition: "background 0.15s"
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = menuOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}
                    >
                      <CandidateAvatar name={candidate?.name || user?.email || "?"} avatarUrl={candidate?.avatar_url} size={28} />
                      <span style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{firstName || "Account"}</span>
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.4, transition: "transform 0.2s", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                        <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {menuOpen && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                        <div style={{
                          position: "absolute", right: 0, top: "calc(100% + 10px)",
                          background: "white", borderRadius: "18px",
                          boxShadow: "0 8px 12px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.16)",
                          width: "268px", overflow: "hidden", zIndex: 50,
                          border: "1px solid rgba(0,0,0,0.07)"
                        }}>

                          {/* Header — dark GPS brand block */}
                          <div style={{ background: "#0a1f24", padding: "20px 20px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "13px", marginBottom: "14px" }}>
                              <CandidateAvatar name={candidate?.name || user?.email || "?"} avatarUrl={candidate?.avatar_url} size={42} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: "14px", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                                  {candidate?.name || "My Account"}
                                </div>
                                <div style={{ fontSize: "12px", color: "rgba(168,213,209,0.7)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {candidate?.current_title || "GPS Talent Network"}
                                </div>
                              </div>
                            </div>
                            {/* GPS network pill */}
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(2,128,144,0.25)", border: "1px solid rgba(2,128,144,0.4)", borderRadius: "99px", padding: "4px 10px" }}>
                              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#028090" }} />
                              <span style={{ fontSize: "11px", color: "#A8D5D1", fontWeight: 600, letterSpacing: "0.04em" }}>GPS Talent Network</span>
                            </div>
                          </div>

                          {/* Nav items */}
                          <div style={{ padding: "6px 8px" }}>
                            {[
                              { label: "My Dashboard",  href: "/account",         sub: "Applications & activity" },
                              { label: "My Profile",    href: "/account/profile", sub: "Edit your details" },
                              { label: "Build my CV",   href: "/cv-builder",      sub: "AI-powered CV studio" },
                              { label: "Browse Roles",  href: "/jobs#roles",      sub: "Open mandates" },
                            ].map(({ label, href, sub }) => (
                              <a key={label} href={href} onClick={() => setMenuOpen(false)}
                                style={{ display: "flex", flexDirection: "column", gap: "1px", padding: "7px 12px", borderRadius: "10px", textDecoration: "none", transition: "background 0.1s" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f0fdf4"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#0a1f24" }}>{label}</span>
                                <span style={{ fontSize: "11px", color: "#9ca3af" }}>{sub}</span>
                              </a>
                            ))}
                          </div>

                          {/* Sign out */}
                          <div style={{ borderTop: "1px solid #f3f4f6", padding: "4px 8px 6px" }}>
                            <button onClick={signOut}
                              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", borderRadius: "10px", width: "100%", transition: "background 0.1s" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fef2f2"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "#ef4444" }}>Sign out</span>
                            </button>
                          </div>

                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <a href="/login" style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.8)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "white" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)" }}>
                    Sign in
                  </a>
                  <a href="/join" style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", textDecoration: "none", background: "#028090", transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.88"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
                    Register →
                  </a>
                </div>
              )
            )}
          </nav>

          {/* Mobile: hamburger + quick Register */}
          <div className="pnav-mobile" style={{ alignItems: "center", gap: "10px" }}>
            {!loading && !user && (
              <a href="/join" onClick={() => setMobileNavOpen(false)} style={{ padding: "7px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", textDecoration: "none", background: "#028090", whiteSpace: "nowrap" }}>
                Register →
              </a>
            )}
            {!loading && user && (
              <CandidateAvatar name={candidate?.name || user?.email || "?"} avatarUrl={candidate?.avatar_url} size={28} />
            )}
            <button aria-label="Menu" onClick={() => setMobileNavOpen(!mobileNavOpen)}
              style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: mobileNavOpen ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", cursor: "pointer", flexShrink: 0 }}>
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                {mobileNavOpen
                  ? <path d="M2 1l14 12M16 1L2 13" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  : <path d="M1 1h16M1 7h16M1 13h16" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown panel */}
        {mobileNavOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)" }} onClick={() => setMobileNavOpen(false)} />
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0d262c", borderBottom: "1px solid rgba(255,255,255,0.08)", zIndex: 50, padding: "8px 12px 14px", boxShadow: "0 24px 48px rgba(0,0,0,0.45)" }}>
              {(user ? [
                { label: "My Dashboard", href: "/account" },
                { label: "My Profile", href: "/account/profile" },
                { label: "Open Roles", href: "/jobs#roles" },
                { label: "How it works", href: "/how-it-works" },
              ] : [
                { label: "Open Roles", href: "/jobs#roles" },
                { label: "How it works", href: "/how-it-works" },
                { label: "Sign in", href: "/login" },
                { label: "Register →", href: "/join" },
              ]).map(({ label, href }) => (
                <a key={label} href={href} onClick={() => setMobileNavOpen(false)}
                  style={{ display: "block", padding: "13px 12px", borderRadius: "10px", color: "rgba(255,255,255,0.88)", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}>
                  {label}
                </a>
              ))}
              {user && (
                <button onClick={signOut}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 12px", background: "none", border: "none", color: "#f87171", fontSize: "15px", fontWeight: 600, cursor: "pointer", borderRadius: "10px" }}>
                  Sign out
                </button>
              )}
            </div>
          </>
        )}
      </header>

      <main>{children}</main>

      <footer style={{ background: "#0a1f24", marginTop: "80px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="pfoot-pad" style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 32px" }}>
          <div className="pfoot-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img src="/gps-logo.png" alt="GPS" style={{ width: "30px", height: "30px", objectFit: "contain", opacity: 0.6 }} />
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>Talent Network</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 48px", fontSize: "13px" }}>
              {[
                { label: "Open Roles", href: "/jobs#roles" },
                { label: "How it works", href: "/how-it-works" },
                { label: "Send your CV", href: "/send-cv" },
                { label: "Register", href: "/join" },
                { label: "Sign in", href: "/login" },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.8)"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.35)"}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="pfoot-row" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", margin: 0 }}>© 2026 GPS — Your Trusted HR Partner. Egypt.</p>
            <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "12px", margin: 0 }}>AI-Matched Recruitment · GPS Talent Network</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
