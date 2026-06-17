"use client"
import { Brain, Users, Shield, Zap, ArrowRight, CheckCircle } from "lucide-react"

export default function HowItWorksPage() {
  return (
    <div>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)", padding: "72px 40px 60px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "20px" }} />
          <h1 style={{ fontSize: "44px", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: "16px" }}>
            How GPS Talent works
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "17px", lineHeight: 1.7, maxWidth: "520px", margin: "0 auto" }}>
            GPS is not a job board. We're a talent network that uses AI to match the right people to the right roles — intelligently, personally, and confidentially.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "72px 40px" }}>

        {/* For candidates applying to a role */}
        <div style={{ marginBottom: "72px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#e6f5f3", color: "#028090", fontSize: "12px", fontWeight: 700, padding: "6px 14px", borderRadius: "99px", marginBottom: "20px" }}>
            <Zap size={13} /> Applying to a role
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>Apply in 2 minutes. No account needed.</h2>
          <p style={{ color: "#666", fontSize: "15px", lineHeight: 1.7, marginBottom: "32px" }}>
            See a role that fits? Apply directly — just your name, email, and CV. No registration required. After applying, you'll receive a confirmation email and an invitation to create your account so you can track your application.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { num: "01", title: "Upload your CV", desc: "PDF or Word. Our AI reads it deeply — understanding what you actually do, not just your job title." },
              { num: "02", title: "AI scores your application", desc: "Your CV is automatically scored against the role's requirements. By the time a consultant opens the application, the AI has already done the first pass." },
              { num: "03", title: "GPS reviews personally", desc: "Every shortlisted candidate is reviewed by a GPS consultant. No automated rejections." },
              { num: "04", title: "We reach out directly", desc: "If you're a match, a GPS consultant contacts you personally. No automated emails." },
            ].map(({ num, title, desc }) => (
              <div key={num} style={{ display: "flex", gap: "20px", alignItems: "flex-start", background: "white", borderRadius: "16px", border: "1px solid #e8e8e8", padding: "20px 24px" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#A8D5D1", flexShrink: 0, lineHeight: 1 }}>{num}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#111", marginBottom: "4px" }}>{title}</div>
                  <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "28px" }}>
            <a href="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#028090", color: "white", padding: "14px 28px", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>
              See open roles <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#e8e8e8", marginBottom: "72px" }} />

        {/* For talent pool */}
        <div style={{ marginBottom: "72px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f0f0ff", color: "#5b5bd6", fontSize: "12px", fontWeight: 700, padding: "6px 14px", borderRadius: "99px", marginBottom: "20px" }}>
            <Users size={13} /> Joining the talent network
          </div>
          <h2 style={{ fontSize: "30px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>Not looking actively? Join the network.</h2>
          <p style={{ color: "#666", fontSize: "15px", lineHeight: 1.7, marginBottom: "32px" }}>
            The best opportunities don't always come when you're looking. Join the GPS Talent Network and we'll reach out when a role genuinely matches your profile — whether that's next week or next year.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { icon: Brain, title: "AI profiles your CV deeply", desc: "We extract your real expertise — specific skills, industry experience, seniority level — not just your job title. The more detail in your CV, the better your matches." },
              { icon: Shield, title: "Your profile stays confidential", desc: "Your information is never shared with any employer without your explicit consent. You're always in control." },
              { icon: CheckCircle, title: "We come to you", desc: "When a mandate appears that genuinely fits your background, a GPS consultant reaches out personally. No generic job alerts." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: "flex", gap: "16px", alignItems: "flex-start", background: "white", borderRadius: "16px", border: "1px solid #e8e8e8", padding: "20px 24px" }}>
                <div style={{ width: "40px", height: "40px", background: "#e6f5f3", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color="#028090" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#111", marginBottom: "4px" }}>{title}</div>
                  <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "28px" }}>
            <a href="/join" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#028090", color: "white", padding: "14px 28px", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>
              Join GPS Talent Network <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* GPS promise */}
        <div style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)", borderRadius: "24px", padding: "44px 48px", textAlign: "center" }}>
          <img src="/gps-logo.png" alt="GPS" style={{ width: "44px", height: "44px", objectFit: "contain", marginBottom: "16px" }} />
          <h3 style={{ fontSize: "24px", fontWeight: 800, color: "white", marginBottom: "12px" }}>The GPS Promise</h3>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", lineHeight: 1.7, maxWidth: "480px", margin: "0 auto" }}>
            Every application is read by a human. Every outreach is personalised. Your career is not a transaction — and GPS treats it that way.
          </p>
        </div>
      </div>
    </div>
  )
}
