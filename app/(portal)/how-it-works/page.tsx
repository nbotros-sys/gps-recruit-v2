"use client"
import { Brain, Users, Shield, Zap, ArrowRight, CheckCircle, FileText, Sparkles, Phone } from "lucide-react"

export default function HowItWorksPage() {
  return (
    <div style={{ background: "#f4f8f7" }}>

      {/* ── HERO ── */}
      <div style={{ background: "#071f24", padding: "80px 40px 90px", position: "relative", overflow: "hidden" }}>
        {/* Subtle background dots */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(2,128,144,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(2,128,144,0.15)", border: "1px solid rgba(2,128,144,0.3)", color: "#a8d5d1", fontSize: "11px", fontWeight: 700, padding: "6px 16px", borderRadius: "99px", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "24px" }}>
            <Sparkles size={11} /> How it works
          </div>
          <h1 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: "20px", letterSpacing: "-0.5px" }}>
            Not a job board.<br />
            <span style={{ color: "#36b0bd" }}>A talent network.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "17px", lineHeight: 1.75, maxWidth: "520px", margin: "0 auto" }}>
            GPS uses AI to match the right people to the right roles — then a real consultant takes it from there. Intelligently, personally, confidentially.
          </p>
        </div>
      </div>

      {/* ── SECTION 1: APPLYING ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "80px 40px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ width: "32px", height: "32px", background: "#028090", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={15} color="white" />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#028090", letterSpacing: ".1em", textTransform: "uppercase" }}>Applying to a role</span>
        </div>
        <h2 style={{ fontSize: "clamp(24px,2.5vw,34px)", fontWeight: 800, color: "#0a1f24", marginBottom: "10px", lineHeight: 1.2 }}>Apply in 2 minutes.<br />No account needed.</h2>
        <p style={{ color: "#6b7280", fontSize: "15px", lineHeight: 1.75, maxWidth: "560px", marginBottom: "48px" }}>
          See a role that fits? Apply directly — just your name, email and CV. After applying you'll get a confirmation email and an invite to track your application.
        </p>

        {/* Steps — connected timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical connector line */}
          <div style={{ position: "absolute", left: "27px", top: "48px", bottom: "48px", width: "2px", background: "linear-gradient(to bottom, #028090, rgba(2,128,144,0.1))", borderRadius: "2px" }} />

          {[
            { num: "01", icon: FileText, title: "Upload your CV", desc: "PDF or Word. Our AI reads it deeply — understanding what you actually do, not just your job title.", accent: "#028090" },
            { num: "02", icon: Sparkles, title: "AI scores your application", desc: "Your CV is automatically scored against the role's requirements. By the time a consultant opens it, the AI has already done the first pass.", accent: "#028090" },
            { num: "03", icon: Users, title: "GPS reviews personally", desc: "Every shortlisted candidate is reviewed by a GPS consultant. No automated rejections — ever.", accent: "#028090" },
            { num: "04", icon: Phone, title: "We reach out directly", desc: "If you're a match, a GPS consultant contacts you personally. No automated emails, no black hole.", accent: "#028090" },
          ].map(({ num, icon: Icon, title, desc, accent }, i) => (
            <div key={num} style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "24px", position: "relative" }}>
              {/* Step circle */}
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: i === 0 ? "#0a1f24" : "white", border: `2px solid ${i === 0 ? "#028090" : "#e5e7eb"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: i === 0 ? "0 0 0 4px rgba(2,128,144,0.15)" : "none" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: i === 0 ? "#a8d5d1" : "#9ca3af" }}>{num}</span>
              </div>
              {/* Card */}
              <div style={{ flex: 1, background: "white", borderRadius: "16px", border: `1px solid ${i === 0 ? "rgba(2,128,144,0.25)" : "#e8ecef"}`, padding: "20px 24px", boxShadow: i === 0 ? "0 4px 20px rgba(2,128,144,0.08)" : "0 1px 4px rgba(0,0,0,0.04)", marginTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Icon size={15} color={accent} />
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#0a1f24" }}>{title}</div>
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.65 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "8px", marginLeft: "80px", marginBottom: "80px" }}>
          <a href="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#028090", color: "white", padding: "13px 26px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: "0 6px 20px rgba(2,128,144,0.3)" }}>
            See open roles <ArrowRight size={15} />
          </a>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 40px" }}>
        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, #d1d5db, transparent)" }} />
      </div>

      {/* ── SECTION 2: TALENT NETWORK ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "80px 40px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ width: "32px", height: "32px", background: "#3D5A4E", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={15} color="white" />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#3D5A4E", letterSpacing: ".1em", textTransform: "uppercase" }}>Joining the talent network</span>
        </div>
        <h2 style={{ fontSize: "clamp(24px,2.5vw,34px)", fontWeight: 800, color: "#0a1f24", marginBottom: "10px", lineHeight: 1.2 }}>Not looking actively?<br />Join the network anyway.</h2>
        <p style={{ color: "#6b7280", fontSize: "15px", lineHeight: 1.75, maxWidth: "560px", marginBottom: "48px" }}>
          The best opportunities don't always come when you're looking. Join the GPS Talent Network and we'll reach out when a role genuinely matches your profile — whether that's next week or next year.
        </p>

        {/* Feature cards — 3-col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "36px" }}>
          {[
            { icon: Brain, title: "AI profiles you deeply", desc: "We extract your real expertise — specific skills, industry, seniority — not just your job title. The more detail in your CV, the better your matches.", color: "#028090", bg: "#e6f5f3" },
            { icon: Shield, title: "Your profile stays confidential", desc: "Your information is never shared with any employer without your explicit consent. You're always in control.", color: "#3D5A4E", bg: "#eef4f2" },
            { icon: CheckCircle, title: "We come to you", desc: "When a mandate appears that genuinely fits your background, a GPS consultant reaches out personally. No generic job alerts.", color: "#028090", bg: "#e6f5f3" },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} style={{ background: "white", borderRadius: "18px", border: "1px solid #e8ecef", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ width: "44px", height: "44px", background: bg, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#0a1f24", marginBottom: "8px", lineHeight: 1.3 }}>{title}</div>
              <div style={{ fontSize: "13.5px", color: "#6b7280", lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "80px" }}>
          <a href="/cv-builder" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#3D5A4E", color: "white", padding: "13px 26px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: "0 6px 20px rgba(61,90,78,0.25)" }}>
            Join GPS Talent Network <ArrowRight size={15} />
          </a>
        </div>
      </div>

      {/* ── GPS PROMISE ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 40px 100px" }}>
        <div style={{ background: "#0a1f24", borderRadius: "24px", padding: "56px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Background accent */}
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(2,128,144,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(61,90,78,0.12)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ width: "52px", height: "52px", background: "rgba(2,128,144,0.2)", border: "1px solid rgba(2,128,144,0.3)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <img src="/gps-logo.png" alt="GPS" style={{ width: "30px", height: "30px", objectFit: "contain" }} />
            </div>
            <h3 style={{ fontSize: "26px", fontWeight: 800, color: "white", marginBottom: "14px", letterSpacing: "-0.3px" }}>The GPS Promise</h3>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px", lineHeight: 1.8, maxWidth: "460px", margin: "0 auto 32px" }}>
              Every application is read by a human. Every outreach is personalised. Your career is not a transaction — and GPS treats it that way.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <a href="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#028090", color: "white", padding: "12px 22px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
                Browse open roles <ArrowRight size={14} />
              </a>
              <a href="/cv-builder" style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", padding: "12px 22px", borderRadius: "10px", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
                Build your CV free
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
