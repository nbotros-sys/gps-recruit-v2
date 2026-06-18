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
