"use client"
import { useEffect, useState } from "react"
import CandidateAvatar from "@/components/CandidateAvatar"
import { createClient } from "@/lib/supabase"
import { Loader2, Briefcase, LogOut, CheckCircle, Clock, MessageSquare, Star, MapPin, ArrowRight, User, FileText, ChevronRight, Zap, Bell } from "lucide-react"
import Link from "next/link"

const STAGES: Record<string, { label: string; color: string; bg: string; border: string; desc: string; step: number }> = {
  new:         { label: "Received",     color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", desc: "Your application is in our queue. A consultant will review it shortly.",         step: 1 },
  screening:   { label: "Under Review", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", desc: "A GPS consultant is reviewing your profile and CV.",                              step: 2 },
  interview:   { label: "Interview",    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", desc: "We'd like to speak with you. A GPS consultant will be in touch shortly.",        step: 3 },
  shortlisted: { label: "Shortlisted",  color: "#028090", bg: "#f0fdfa", border: "#99f6e4", desc: "You've been shortlisted for this role — excellent news.",                        step: 4 },
  offered:     { label: "Offer Stage",  color: "#d97706", bg: "#fffbeb", border: "#fde68a", desc: "An offer is being prepared. Your consultant will be in touch directly.",         step: 5 },
  placed:      { label: "Placed",       color: "#059669", bg: "#f0fdf4", border: "#6ee7b7", desc: "Congratulations — you've been successfully placed in this role.",               step: 6 },
  rejected:    { label: "On Hold",      color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", desc: "We're keeping your profile on file for future opportunities.",                   step: 0 },
}

const STEPS = ["Received", "Under Review", "Interview", "Shortlisted", "Offer Stage", "Placed"]

function completionScore(c: any) {
  if (!c) return 0
  const fields = ["name", "phone", "current_title", "current_company", "location", "linkedin_url", "job_function", "level"]
  const filled = fields.filter(f => c[f] && c[f].toString().trim().length > 0).length
  const hasPhoto = !!c.avatar_url
  const hasCV = !!c.cv_text
  return Math.round(((filled + (hasPhoto ? 1 : 0) + (hasCV ? 1 : 0)) / (fields.length + 2)) * 100)
}

function getMissingCount(c: any) {
  if (!c) return 0
  const fields = ["name", "phone", "current_title", "current_company", "location", "linkedin_url", "job_function", "level"]
  const missing = fields.filter(f => !c[f] || c[f].toString().trim() === "").length
  return missing + (c.avatar_url ? 0 : 1) + (c.cv_text ? 0 : 1)
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/login"; return }
      setUser(user)
      const { data: cand } = await supabase
        .from("candidates")
        .select("*")
        .eq("email", user.email)
        .single()
      if (cand) {
        setCandidate(cand)
        const { data: apps } = await supabase
          .from("applications")
          .select("*, mandate:mandates(id, title, location, client_name)")
          .eq("candidate_id", cand.id)
          .order("created_at", { ascending: false })
        setApplications(apps || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = "/jobs"
  }

  const scoreColor = (s: number) => s >= 75 ? "#059669" : s >= 50 ? "#d97706" : "#028090"
  const firstName = candidate?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there"
  const profileScore = completionScore(candidate)
  const missingCount = getMissingCount(candidate)
  const activeApps = applications.filter(a => a.stage !== "placed" && a.stage !== "rejected").length

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  if (loading) return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "#028090" }} />
    </div>
  )

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* ── HERO GREETING ── */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ position: "relative" }}>
              <CandidateAvatar name={candidate?.name || user?.email || "?"} avatarUrl={candidate?.avatar_url} size={72} />
              {profileScore === 100 && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "20px", height: "20px", background: "#059669", borderRadius: "50%", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={11} color="white" />
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize: "13px", color: "#028090", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                {getGreeting()}
              </p>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0a1f24", letterSpacing: "-0.5px", marginBottom: "4px", lineHeight: 1.1 }}>
                {firstName}
              </h1>
              {candidate?.current_title && (
                <p style={{ fontSize: "14px", color: "#6b7280", fontWeight: 500 }}>
                  {candidate.current_title}{candidate?.current_company ? ` · ${candidate.current_company}` : ""}
                </p>
              )}
            </div>
          </div>
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: 500, padding: "8px 14px" }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "36px" }}>

        {/* Active applications */}
        <Link href="#applications" style={{ textDecoration: "none" }}>
          <div style={{ background: "white", border: "1px solid #e8ecef", borderRadius: "16px", padding: "20px 22px", cursor: "pointer", transition: "box-shadow 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", background: "#eff6ff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Briefcase size={16} color="#1d4ed8" />
              </div>
              <ChevronRight size={14} color="#d1d5db" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0a1f24", lineHeight: 1, marginBottom: "4px" }}>{applications.length}</div>
            <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
              {applications.length === 1 ? "Application" : "Applications"}
              {activeApps > 0 && <span style={{ marginLeft: "6px", background: "#eff6ff", color: "#1d4ed8", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>{activeApps} active</span>}
            </div>
          </div>
        </Link>

        {/* Profile strength */}
        <Link href="/account/profile" style={{ textDecoration: "none" }}>
          <div style={{ background: "white", border: "1px solid #e8ecef", borderRadius: "16px", padding: "20px 22px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", background: profileScore >= 80 ? "#f0fdf4" : "#fffbeb", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={16} color={profileScore >= 80 ? "#059669" : "#d97706"} />
              </div>
              <ChevronRight size={14} color="#d1d5db" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0a1f24", lineHeight: 1, marginBottom: "6px" }}>{profileScore}%</div>
            <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500, marginBottom: "8px" }}>Profile strength</div>
            <div style={{ height: "4px", background: "#f3f4f6", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${profileScore}%`, background: profileScore >= 80 ? "#059669" : profileScore >= 50 ? "#d97706" : "#028090", borderRadius: "99px", transition: "width 0.6s ease" }} />
            </div>
          </div>
        </Link>

        {/* Network status */}
        <div style={{ background: candidate ? "linear-gradient(135deg, #028090 0%, #3D5A4E 100%)" : "white", border: candidate ? "none" : "1px solid #e8ecef", borderRadius: "16px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ width: "36px", height: "36px", background: candidate ? "rgba(255,255,255,0.15)" : "#f0fdf4", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color={candidate ? "white" : "#059669"} />
            </div>
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: candidate ? "white" : "#0a1f24", lineHeight: 1.3, marginBottom: "4px" }}>
            {candidate ? "In the network" : "Not registered"}
          </div>
          <div style={{ fontSize: "12px", color: candidate ? "rgba(255,255,255,0.65)" : "#6b7280", fontWeight: 500 }}>
            {candidate ? "Consultants can find you" : "Complete your profile"}
          </div>
        </div>
      </div>

      {/* ── PROFILE NUDGE (if incomplete) ── */}
      {missingCount > 0 && (
        <Link href="/account/profile" style={{ textDecoration: "none", display: "block", marginBottom: "28px" }}>
          <div style={{ background: "white", border: "1.5px solid #fde68a", borderRadius: "16px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", background: "#fffbeb", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bell size={15} color="#d97706" />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#92400e", margin: 0 }}>
                  Complete your profile to get noticed faster
                </p>
                <p style={{ fontSize: "12px", color: "#b45309", margin: "2px 0 0" }}>
                  {missingCount} {missingCount === 1 ? "field" : "fields"} missing — GPS consultants prioritise complete profiles
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#d97706", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
              Complete <ChevronRight size={14} />
            </div>
          </div>
        </Link>
      )}

      {/* ── APPLICATIONS ── */}
      <div id="applications" style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0a1f24", margin: 0 }}>Your Applications</h2>
          <Link href="/jobs#roles" style={{ fontSize: "13px", color: "#028090", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            Browse roles <ArrowRight size={13} />
          </Link>
        </div>

        {applications.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e8ecef", borderRadius: "20px", textAlign: "center", padding: "56px 40px" }}>
            <div style={{ width: "52px", height: "52px", background: "#f3f4f6", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Briefcase size={22} color="#9ca3af" />
            </div>
            <p style={{ fontWeight: 700, color: "#374151", fontSize: "15px", marginBottom: "6px" }}>No applications yet</p>
            <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "24px", maxWidth: "320px", margin: "0 auto 24px", lineHeight: 1.6 }}>
              {candidate ? "You're in our talent network. We'll reach out when a role matches your background." : "Apply to a role to see your status tracked here."}
            </p>
            <Link href="/jobs#roles" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#028090", color: "white", padding: "12px 22px", borderRadius: "12px", fontWeight: 700, fontSize: "13px", textDecoration: "none" }}>
              Browse open roles <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {applications.map(app => {
              const stage = STAGES[app.stage] || STAGES.new
              const currentStep = stage.step
              return (
                <div key={app.id} style={{ background: "white", border: `1px solid ${stage.border}`, borderRadius: "20px", overflow: "hidden", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.07)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}>

                  {/* Role header */}
                  <div style={{ padding: "20px 24px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0a1f24", marginBottom: "5px" }}>
                        {app.mandate?.title}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#9ca3af" }}>
                        {app.mandate?.location && (
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <MapPin size={12} /> {app.mandate.location}
                          </span>
                        )}
                        <span>GPS Recruitment</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      {app.ai_score && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "5px 10px" }}>
                          <Star size={11} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                        </div>
                      )}
                      <span style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}`, fontSize: "11px", fontWeight: 700, padding: "5px 12px", borderRadius: "99px", letterSpacing: "0.02em" }}>
                        {stage.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress tracker */}
                  {app.stage !== "rejected" && (
                    <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        {STEPS.map((step, i) => {
                          const done = i < currentStep
                          const active = i === currentStep - 1
                          return (
                            <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                <div style={{
                                  width: "26px", height: "26px", borderRadius: "50%",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "10px", fontWeight: 700, flexShrink: 0,
                                  background: active ? "#028090" : done ? "#e0f5f7" : "#f3f4f6",
                                  color: active ? "white" : done ? "#028090" : "#d1d5db",
                                  border: active ? "2px solid #028090" : done ? "1.5px solid #a8d5d1" : "1.5px solid #e5e7eb",
                                  boxShadow: active ? "0 0 0 3px rgba(2,128,144,0.12)" : "none"
                                }}>
                                  {done ? "✓" : i + 1}
                                </div>
                                <span style={{ fontSize: "9px", color: active ? "#028090" : done ? "#6b7280" : "#d1d5db", fontWeight: active ? 700 : 500, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                                  {step}
                                </span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: "2px", background: i < currentStep - 1 ? "#a8d5d1" : "#f3f4f6", margin: "0 4px", marginBottom: "18px", borderRadius: "99px" }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Status message */}
                  <div style={{ padding: "14px 24px 18px", borderTop: "1px solid #f9fafb", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: stage.bg, border: `1px solid ${stage.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      {app.stage === "placed" ? <CheckCircle size={13} color={stage.color} /> :
                       app.stage === "interview" ? <MessageSquare size={13} color={stage.color} /> :
                       <Clock size={13} color={stage.color} />}
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{stage.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── QUICK LINKS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "40px" }}>
        {[
          { href: "/account/profile", icon: User, label: "My Profile", sub: "Update your details and photo", color: "#1d4ed8", bg: "#eff6ff" },
          { href: "/account/cv", icon: FileText, label: "My CV", sub: "View or update your CV on file", color: "#7c3aed", bg: "#f5f3ff" },
        ].map(({ href, icon: Icon, label, sub, color, bg }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: "1px solid #e8ecef", borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}>
              <div style={{ width: "40px", height: "40px", background: bg, borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0a1f24", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>{sub}</div>
              </div>
              <ChevronRight size={15} color="#d1d5db" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── TALENT NETWORK CARD ── */}
      {candidate && (
        <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #1a3a3a 100%)", borderRadius: "20px", padding: "28px 32px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "48px", height: "48px", background: "rgba(2,128,144,0.25)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={22} color="#5ecfdb" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: "white", fontSize: "15px", marginBottom: "4px" }}>You're in the GPS Talent Network</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              Our consultants actively match candidates to roles before they're advertised. Keep your profile complete to stay top of mind.
            </p>
          </div>
          <Link href="/account/profile" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", background: "#028090", color: "white", padding: "10px 18px", borderRadius: "10px", fontWeight: 700, fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap" }}>
            My profile <ArrowRight size={13} />
          </Link>
        </div>
      )}

    </div>
  )
}
