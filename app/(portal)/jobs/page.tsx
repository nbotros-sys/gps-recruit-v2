"use client"
import { useEffect, useState } from "react"
import { MapPin, ArrowRight, Briefcase, Sparkles, Users, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function JobsPage() {
  const [mandates, setMandates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("mandates")
        .select("id, title, client_name, location, job_description, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
      setMandates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (user && candidate) return <LoggedInHome candidate={candidate} applications={applications} mandates={mandates} />

  return (
    <div>
                  {/* ── HERO ── */}
      <section style={{ position: "relative", width: "100%", minHeight: "92vh", background: "#071f24", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px 88px", isolation: "isolate" }}>
        
        {/* Animations */}
        <style>{`
          @keyframes gpsFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes gpsGlow { 0%,100% { opacity: .55; } 50% { opacity: .85; } }
          .gps-btn-solid:hover { background: #0596a8 !important; transform: translateY(-2px); box-shadow: 0 18px 38px -8px rgba(2,128,144,.85) !important; }
          .gps-btn-ghost:hover { border-color: rgba(168,213,209,.85) !important; background: rgba(168,213,209,.08) !important; transform: translateY(-2px); }
        `}</style>

        {/* Radial glow */}
        <div style={{ position: "absolute", top: "-12%", left: "50%", transform: "translateX(-50%)", width: "min(1100px, 140%)", height: "760px", background: "radial-gradient(ellipse at center, rgba(2,128,144,.42) 0%, rgba(2,128,144,.14) 38%, rgba(7,31,36,0) 70%)", filter: "blur(8px)", animation: "gpsGlow 9s ease-in-out infinite", pointerEvents: "none" }} />

        {/* Dot pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(168,213,209,.10) 1.2px, transparent 1.2px)", backgroundSize: "34px 34px", WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 50% 42%, #000 35%, transparent 100%)", maskImage: "radial-gradient(ellipse 80% 75% at 50% 42%, #000 35%, transparent 100%)", pointerEvents: "none" }} />

        {/* Top line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(168,213,209,.30), transparent)" }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "780px", width: "100%" }}>
          
          <img src="/gps-logo.png" alt="GPS" style={{ width: "clamp(120px, 17vw, 188px)", height: "auto", marginBottom: "14px", filter: "drop-shadow(0 14px 40px rgba(2,128,144,.35))", animation: "gpsFloat 7s ease-in-out infinite" }} />

          <div style={{ fontSize: "12px", letterSpacing: ".32em", textTransform: "uppercase", color: "#a8d5d1", fontWeight: 600, marginBottom: "26px" }}>
            Executive Recruitment · Egypt
          </div>

          <h1 style={{ margin: "0 0 22px", fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "clamp(38px, 6.4vw, 76px)", lineHeight: 1.04, letterSpacing: "-.015em", color: "#f4f8f7" }}>
            Your next role,<br />placed by{" "}
            <span style={{ color: "#36b0bd", fontStyle: "italic" }}>GPS</span>.
          </h1>

          <p style={{ margin: "0 0 40px", fontSize: "clamp(16px, 1.7vw, 20px)", lineHeight: 1.6, color: "rgba(225,238,236,.74)", maxWidth: "560px" }}>
            Egypt&apos;s specialist recruitment network. Senior roles across finance, HR, operations and technology.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
            <a href="#roles" className="gps-btn-solid" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: 600, fontSize: "16px", whiteSpace: "nowrap", padding: "16px 30px", borderRadius: "10px", textDecoration: "none", transition: "transform .2s ease, box-shadow .2s ease, background .2s ease", background: "#028090", color: "#fff", boxShadow: "0 12px 30px -8px rgba(2,128,144,.7)" }}>
              Browse open roles <span aria-hidden="true">→</span>
            </a>
            <a href="/send-cv" className="gps-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: 600, fontSize: "16px", whiteSpace: "nowrap", padding: "16px 30px", borderRadius: "10px", textDecoration: "none", transition: "transform .2s ease, border-color .2s ease, background .2s ease", background: "transparent", color: "#d8eae8", border: "1px solid rgba(168,213,209,.38)" }}>
              Send us your CV
            </a>
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <h2 id="roles" style={{ fontSize: "28px", fontWeight: 800, color: "#111", scrollMarginTop: "90px" }}>Open roles</h2>
            <p style={{ color: "#888", fontSize: "14px", marginTop: "4px" }}>Active mandates — all reviewed by GPS consultants</p>
          </div>
          <span style={{ fontSize: "13px", color: "#aaa" }}>{loading ? "..." : mandates.length} active</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>Loading roles...</div>
        ) : mandates.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: "20px", textAlign: "center", padding: "80px 40px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>◎</div>
            <p style={{ color: "#666", fontWeight: 600, marginBottom: "8px" }}>No active roles right now</p>
            <p style={{ color: "#aaa", fontSize: "13px", marginBottom: "24px" }}>Join our network and we'll reach out when something fits.</p>
            <a href="/join" style={{ background: "#028090", color: "white", padding: "12px 28px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", display: "inline-block" }}>
              Join GPS Talent Network
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {mandates.map((m, i) => (
              <Link key={m.id} href={`/jobs/${m.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "white", border: "1px solid #e8f4f2", borderRadius: "16px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#028090"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(2,128,144,0.08)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e8f4f2"; (e.currentTarget as HTMLElement).style.boxShadow = "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                    <div style={{ width: "44px", height: "44px", background: "linear-gradient(135deg, #028090, #3D5A4E)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#111" }}>{m.title}</div>
                      <div style={{ fontSize: "13px", color: "#888", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px" }}>
                        {m.location && <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>📍 {m.location}</span>}
                        {m.location && <span style={{ color: "#ddd" }}>·</span>}
                        <span>GPS — Your Trusted HR Partner</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <span style={{ background: "#e6f5f3", color: "#028090", fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "99px" }}>Active</span>
                    <div style={{ width: "32px", height: "32px", background: "#028090", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "white", fontSize: "14px" }}>→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── TALENT NETWORK CTA ── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px 80px" }}>
        <div style={{ background: "linear-gradient(135deg, #028090 0%, #3D5A4E 100%)", borderRadius: "24px", padding: "48px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 3 L47 16 L47 34 L25 47 L3 34 L3 16 Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: "50px 50px" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <img src="/gps-logo.png" alt="GPS" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: 600 }}>GPS Talent Network</span>
            </div>
            <h3 style={{ fontSize: "26px", fontWeight: 800, color: "white", marginBottom: "10px" }}>Don't see the right role?</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", maxWidth: "480px", lineHeight: 1.6 }}>
              Join our network. GPS works on new mandates every week and always reaches out to our talent network first — before posting publicly.
            </p>
          </div>
          <a href="/join" style={{ background: "white", color: "#028090", padding: "16px 32px", borderRadius: "14px", fontWeight: 800, fontSize: "15px", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap", position: "relative" }}>
            Join GPS Talent →
          </a>
        </div>
      </section>
    </div>
  )
}

function LoggedInHome({ candidate, applications, mandates }: { candidate: any, applications: any[], mandates: any[] }) {
  const pct = completionScore(candidate)
  const firstName = candidate.name?.split(" ")[0] || "there"
  const circumference = 2 * Math.PI * 22
  const dash = (pct / 100) * circumference

  const STAGE_LABELS: Record<string,{label:string,color:string}> = {
    new: { label: "Received", color: "#6b7280" },
    screening: { label: "Under Review", color: "#d97706" },
    interview: { label: "Interview", color: "#028090" },
    shortlisted: { label: "Shortlisted", color: "#7c3aed" },
    offered: { label: "Offer Stage", color: "#059669" },
    placed: { label: "Placed ✓", color: "#028090" },
    on_hold: { label: "On Hold", color: "#ef4444" },
  }

  // Rank mandates — ones matching candidate tags/function first
  const candidateTags = (candidate.tags || []).map((t: string) => t.toLowerCase())
  const ranked = [...mandates].sort((a, b) => {
    const aMatch = candidateTags.some((t: string) =>
      (a.title + " " + a.client_name).toLowerCase().includes(t))
    const bMatch = candidateTags.some((t: string) =>
      (b.title + " " + b.client_name).toLowerCase().includes(t))
    return (bMatch ? 1 : 0) - (aMatch ? 1 : 0)
  })

  // Applied mandate IDs
  const appliedIds = new Set(applications.map((a: any) => a.mandate_id))

  return (
    <div style={{ background: "#F4F8F7", minHeight: "80vh" }}>
      
      {/* Personal header */}
      <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)", padding: "40px 40px 48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
            <CandidateAvatar name={candidate.name || "?"} avatarUrl={candidate.avatar_url} size={64} />
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "white", marginBottom: "4px" }}>
                Good to see you, {firstName}
              </h1>
              {candidate.current_title && (
                <p style={{ color: "#A8D5D1", fontSize: "15px", fontWeight: 500 }}>
                  {candidate.current_title}{candidate.current_company ? ` @ ${candidate.current_company}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            
            {/* Profile completion */}
            <a href="/account/profile" style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" }}>
                <div style={{ position: "relative", width: "52px", height: "52px", flexShrink: 0 }}>
                  <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke="#A8D5D1" strokeWidth="4"
                      strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "white" }}>{pct}%</div>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "white", margin: 0 }}>Profile</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>{pct < 100 ? "Tap to complete" : "Complete ✓"}</p>
                </div>
              </div>
            </a>

            {/* Applications */}
            <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(2,128,144,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Briefcase size={22} color="#A8D5D1" />
              </div>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "white", margin: 0 }}>{applications.length}</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Application{applications.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* CV status */}
            <a href="/account/cv" style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: candidate.cv_text ? "rgba(2,128,144,0.3)" : "rgba(217,119,6,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={22} color={candidate.cv_text ? "#A8D5D1" : "#fbbf24"} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "white", margin: 0 }}>CV</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>{candidate.cv_text ? "On file ✓" : "Not uploaded"}</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px", alignItems: "start" }}>
          
          {/* Left — Open roles */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#111", margin: 0 }}>Open roles</h2>
                <p style={{ fontSize: "13px", color: "#888", marginTop: "3px" }}>Ranked by relevance to your profile</p>
              </div>
              <span style={{ fontSize: "13px", color: "#028090", fontWeight: 600 }}>{mandates.length} active</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ranked.map((m: any) => {
                const applied = appliedIds.has(m.id)
                return (
                  <a key={m.id} href={applied ? "#" : `/jobs/${m.id}`}
                    style={{ textDecoration: "none", display: "block", background: "white", borderRadius: "16px", border: applied ? "1.5px solid #A8D5D1" : "1px solid #e8e8e8", padding: "20px 24px", transition: "box-shadow 0.2s", cursor: applied ? "default" : "pointer" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "15px", fontWeight: 700, color: "#111" }}>{m.title}</span>
                          {applied && <span style={{ fontSize: "11px", background: "#e6f5f3", color: "#028090", padding: "2px 8px", borderRadius: "99px", fontWeight: 600 }}>Applied ✓</span>}
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                          {m.client_name && <span style={{ fontSize: "13px", color: "#666" }}>{m.client_name}</span>}
                          {m.location && <span style={{ fontSize: "13px", color: "#888" }}>📍 {m.location}</span>}
                          {m.salary_range && <span style={{ fontSize: "13px", color: "#888" }}>💰 {m.salary_range}</span>}
                        </div>
                      </div>
                      {!applied && <ArrowRight size={18} color="#028090" style={{ flexShrink: 0, marginTop: "2px" }} />}
                    </div>
                  </a>
                )
              })}
              {mandates.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#aaa", fontSize: "14px" }}>
                  No open roles right now — check back soon.
                </div>
              )}
            </div>
          </div>

          {/* Right — Applications + quick links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* My applications */}
            <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111", marginBottom: "16px" }}>My applications</h3>
              {applications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: "13px", color: "#aaa" }}>No applications yet</p>
                  <p style={{ fontSize: "12px", color: "#bbb", marginTop: "4px" }}>Apply to a role to get started</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {applications.slice(0, 5).map((app: any) => {
                    const stage = STAGE_LABELS[app.stage] || { label: app.stage, color: "#888" }
                    return (
                      <div key={app.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#111", margin: 0, truncate: true }}>{app.mandate?.title}</p>
                          {app.mandate?.client_name && <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>{app.mandate.client_name}</p>}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: stage.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {stage.label}
                        </span>
                      </div>
                    )
                  })}
                  {applications.length > 5 && (
                    <a href="/account" style={{ fontSize: "12px", color: "#028090", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                      View all {applications.length} →
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111", marginBottom: "16px" }}>Quick links</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Complete my profile", href: "/account/profile", icon: "👤", sub: pct < 100 ? `${pct}% done` : "Complete ✓" },
                  { label: "Update my CV", href: "/account/cv", icon: "📄", sub: candidate.cv_text ? "CV on file" : "No CV yet" },
                  { label: "My applications", href: "/account", icon: "📋", sub: `${applications.length} total` },
                  { label: "How GPS works", href: "/how-it-works", icon: "💡", sub: "About the process" },
                ].map(({ label, href, icon, sub }) => (
                  <a key={label} href={href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "12px", textDecoration: "none", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f5f5"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <span style={{ fontSize: "18px" }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#111", margin: 0 }}>{label}</p>
                      <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>{sub}</p>
                    </div>
                    <ArrowRight size={14} color="#ccc" />
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
