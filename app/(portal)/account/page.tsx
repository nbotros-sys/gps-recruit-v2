"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Briefcase, LogOut, CheckCircle, Clock, MessageSquare, Star, MapPin, ArrowRight } from "lucide-react"
import Link from "next/link"

const STAGES: Record<string, { label: string; color: string; bg: string; desc: string; step: number }> = {
  new:         { label: "Received",     color: "#6b7280", bg: "#f3f4f6", desc: "Your application has been received and is in our queue.",                    step: 1 },
  screening:   { label: "Under Review", color: "#1d4ed8", bg: "#dbeafe", desc: "A GPS consultant is reviewing your profile and CV.",                          step: 2 },
  interview:   { label: "Interview",    color: "#7c3aed", bg: "#ede9fe", desc: "We'd like to speak with you. A GPS consultant will be in touch shortly.",      step: 3 },
  shortlisted: { label: "Shortlisted",  color: "#028090", bg: "#e6f5f3", desc: "You've been shortlisted for this role. Great news.",                          step: 4 },
  offered:     { label: "Offer Stage",  color: "#d97706", bg: "#fef3c7", desc: "An offer is being prepared. Our consultant will contact you directly.",        step: 5 },
  placed:      { label: "Placed",       color: "#059669", bg: "#d1fae5", desc: "Congratulations — you've been successfully placed in this role!",              step: 6 },
  rejected:    { label: "On Hold",      color: "#6b7280", bg: "#f3f4f6", desc: "We're keeping your profile on file for future opportunities that may fit.",    step: 0 },
}

const STEPS = ["Received", "Under Review", "Interview", "Shortlisted", "Offer Stage", "Placed"]

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

  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"
  const firstName = candidate?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there"

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "#028090" }} />
    </div>
  )

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#111", marginBottom: "6px" }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ color: "#888", fontSize: "14px" }}>{user?.email}</p>
        </div>
        <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "13px", fontWeight: 600 }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Applications */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111", marginBottom: "16px" }}>
          Your Applications
        </h2>

        {applications.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: "20px", textAlign: "center", padding: "60px 40px" }}>
            <div style={{ width: "56px", height: "56px", background: "#f3f4f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Briefcase size={24} color="#9ca3af" />
            </div>
            <p style={{ fontWeight: 600, color: "#555", marginBottom: "8px" }}>No active applications</p>
            <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>
              {candidate ? "You're in our talent network. We'll reach out when the right role appears." : "Apply to a role to see your applications here."}
            </p>
            <Link href="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#028090", color: "white", padding: "12px 24px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
              Browse open roles <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {applications.map(app => {
              const stage = STAGES[app.stage] || STAGES.new
              const currentStep = stage.step
              return (
                <div key={app.id} style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: "20px", overflow: "hidden" }}>
                  {/* Role header */}
                  <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111", marginBottom: "4px" }}>
                          {app.mandate?.title}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#888" }}>
                          {app.mandate?.location && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>📍 {app.mandate.location}</span>}
                          <span>GPS — Your Trusted HR Partner</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {app.ai_score && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "4px 10px" }}>
                            <Star size={12} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                            <span style={{ fontSize: "13px", fontWeight: 700, color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                          </div>
                        )}
                        <span style={{ background: stage.bg, color: stage.color, fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: "99px" }}>
                          {stage.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {app.stage !== "rejected" && (
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                        {STEPS.map((step, i) => {
                          const done = i < currentStep
                          const active = i === currentStep - 1
                          return (
                            <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                <div style={{
                                  width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700,
                                  background: done || active ? "#028090" : "#e5e7eb",
                                  color: done || active ? "white" : "#9ca3af",
                                  flexShrink: 0
                                }}>
                                  {done ? "✓" : i + 1}
                                </div>
                                <span style={{ fontSize: "10px", color: active ? "#028090" : done ? "#028090" : "#9ca3af", fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>
                                  {step}
                                </span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: "2px", background: i < currentStep - 1 ? "#028090" : "#e5e7eb", margin: "0 4px", marginBottom: "16px" }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Status message */}
                  <div style={{ padding: "16px 24px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: stage.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {app.stage === "placed" ? <CheckCircle size={15} color={stage.color} /> :
                       app.stage === "interview" ? <MessageSquare size={15} color={stage.color} /> :
                       <Clock size={15} color={stage.color} />}
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6, margin: 0 }}>{stage.desc}</p>
                      <p style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>
                        All communications will come directly from a GPS consultant.
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Talent network status */}
      {candidate && (
        <div style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)", borderRadius: "20px", padding: "24px 28px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(255,255,255,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckCircle size={20} color="white" />
          </div>
          <div>
            <p style={{ fontWeight: 700, color: "white", marginBottom: "4px", fontSize: "15px" }}>You're in the GPS Talent Network</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", lineHeight: 1.5 }}>
              Your profile is active. GPS consultants will reach out when a role matches your background. You don't need to do anything — we'll come to you.
            </p>
          </div>
        </div>
      )}

      {/* Browse more roles */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <Link href="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#028090", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
          Browse all open roles <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
