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
      <section className="relative overflow-hidden bg-[#071F24] px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,213,209,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(2,128,144,0.22),transparent_34%),linear-gradient(135deg,#071F24_0%,#0B2B30_55%,#12352F_100%)]" />
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full border border-[#A8D5D1]/10" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full border border-[#028090]/20" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#A8D5D1_1px,transparent_1px),linear-gradient(90deg,#A8D5D1_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <img src="/gps-logo.png" alt="GPS" className="mx-auto mb-8 h-16 w-16 object-contain" />
          <div className="mx-auto mb-5 inline-flex rounded-full border border-[#A8D5D1]/20 bg-white/5 px-4 py-2 text-sm font-semibold tracking-wide text-[#A8D5D1] backdrop-blur">
            Executive recruitment for Egypt&apos;s senior market
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your next role,<br />placed by GPS.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
            Egypt&apos;s specialist recruitment network. Senior roles across finance, HR, operations and technology.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#roles" className="w-full rounded-2xl bg-[#028090] px-8 py-4 text-center text-base font-bold text-white shadow-2xl shadow-[#028090]/25 transition hover:bg-[#0396A8] sm:w-auto">
              Browse open roles →
            </a>
            <a href="/send-cv" className="w-full rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-center text-base font-semibold text-white backdrop-blur transition hover:border-[#A8D5D1]/50 hover:bg-white/10 sm:w-auto">
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
