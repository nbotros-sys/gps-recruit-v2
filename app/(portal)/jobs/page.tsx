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

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ background: "linear-gradient(160deg, #0a1f24 0%, #0d2b30 60%, #1a3d35 100%)", borderBottom: "none" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 40px 72px" }}>

          {/* Logo + brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "40px" }}>
            <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain" }} />
            <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.2)" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "white", lineHeight: 1.1 }}>GPS</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Talent Network · Egypt</div>
            </div>
          </div>

          {/* Main headline + CTA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "48px", alignItems: "flex-end" }}>
            <div>
              {/* AI badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(168,213,209,0.2)", color: "#A8D5D1", fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "99px", letterSpacing: "0.06em", marginBottom: "22px" }}>
                <span>✦</span> AI-Matched Recruitment
              </div>

              <h1 style={{ fontSize: "58px", fontWeight: 900, color: "white", lineHeight: 1.0, letterSpacing: "-0.02em", marginBottom: "18px" }}>
                Your next<br />
                opportunity<br />
                <span style={{ color: "#028090" }}>starts here.</span>
              </h1>

              <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.65)", lineHeight: 1.65, maxWidth: "500px", marginBottom: "32px" }}>
                Where the right people find the right jobs. GPS matches professionals across Egypt to opportunities that genuinely fit — intelligently, personally, confidentially.
              </p>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <a href="#roles" style={{ background: "#028090", color: "white", padding: "14px 28px", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none", display: "inline-block" }}>
                  See open roles
                </a>
                <a href="/join" style={{ background: "transparent", color: "rgba(255,255,255,0.85)", padding: "13px 28px", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.3)", display: "inline-block" }}>
                  Join the network →
                </a>
              </div>
            </div>

            {/* Right side: 3 pillars stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "260px" }}>
              {[
                { icon: "✦", label: "AI-matched", desc: "Every CV read deeply" },
                { icon: "◎", label: "Personally reviewed", desc: "Real people, real decisions" },
                { icon: "◈", label: "Fully confidential", desc: "Never shared without consent" },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "36px", height: "36px", background: "rgba(2,128,144,0.4)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", color: "#A8D5D1", flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{label}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#111" }}>Open roles</h2>
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
