"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { CheckCircle, ArrowRight, Sparkles, Users, Zap } from "lucide-react"
import Link from "next/link"

export default function CVBuilderSuccess() {
  const [candidate, setCandidate] = useState<any>(null)
  const [mandateCount, setMandateCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: cand } = await supabase.from("candidates").select("*").eq("email", user.email).single()
        setCandidate(cand)
      }
      const { count } = await supabase.from("mandates").select("*", { count:"exact", head:true }).eq("status","active")
      setMandateCount(count || 0)
    }
    load()
  }, [])

  const firstName = candidate?.name?.split(" ")[0] || "there"

  return (
    <div style={{ minHeight:"90vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
      <style>{`
        @keyframes popIn { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(360deg);opacity:0} }
        .confetti-piece { position:absolute; width:8px; height:8px; animation:confettiFall 2s ease-in forwards; }
      `}</style>

      <div style={{ maxWidth:"560px", width:"100%", textAlign:"center" }}>

        {/* Confetti dots */}
        <div style={{ position:"relative", height:"60px", marginBottom:"-20px" }}>
          {[
            { left:"10%", color:"#028090", delay:"0s" },
            { left:"25%", color:"#3D5A4E", delay:"0.2s" },
            { left:"45%", color:"#A8D5D1", delay:"0.1s" },
            { left:"60%", color:"#028090", delay:"0.3s" },
            { left:"75%", color:"#3D5A4E", delay:"0.15s" },
            { left:"88%", color:"#A8D5D1", delay:"0.25s" },
          ].map((c, i) => (
            <div key={i} className="confetti-piece" style={{ left:c.left, background:c.color, borderRadius:"2px", animationDelay:c.delay }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ width:"80px", height:"80px", background:"linear-gradient(135deg,#028090,#3D5A4E)", borderRadius:"24px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", animation:"popIn 0.5s ease both" }}>
          <CheckCircle size={40} color="white" />
        </div>

        <div style={{ animation:"fadeUp 0.6s ease 0.2s both" }}>
          <h1 style={{ fontSize:"clamp(28px,5vw,42px)", fontWeight:800, color:"#0a1f24", lineHeight:1.1, marginBottom:"12px" }}>
            You're live, {firstName}! 🎉
          </h1>
          <p style={{ fontSize:"17px", color:"#6b7280", lineHeight:1.7, marginBottom:"32px" }}>
            Your CV is now part of the <strong style={{ color:"#028090" }}>GPS Talent Network</strong>. Our consultants can find you when the right role comes up — before it's even advertised publicly.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"32px", animation:"fadeUp 0.6s ease 0.35s both" }}>
          <div style={{ background:"white", border:"1px solid #e8ecef", borderRadius:"16px", padding:"18px 12px" }}>
            <div style={{ fontSize:"24px", fontWeight:800, color:"#028090", marginBottom:"4px" }}>✓</div>
            <div style={{ fontSize:"12px", color:"#6b7280" }}>CV saved</div>
          </div>
          <div style={{ background:"white", border:"1px solid #e8ecef", borderRadius:"16px", padding:"18px 12px" }}>
            <div style={{ fontSize:"24px", fontWeight:800, color:"#028090", marginBottom:"4px" }}>{mandateCount}</div>
            <div style={{ fontSize:"12px", color:"#6b7280" }}>Active roles to match</div>
          </div>
          <div style={{ background:"white", border:"1px solid #e8ecef", borderRadius:"16px", padding:"18px 12px" }}>
            <div style={{ fontSize:"24px", fontWeight:800, color:"#028090", marginBottom:"4px" }}>24h</div>
            <div style={{ fontSize:"12px", color:"#6b7280" }}>Consultant review time</div>
          </div>
        </div>

        {/* What happens next */}
        <div style={{ background:"#f9fafb", borderRadius:"18px", padding:"24px", marginBottom:"28px", textAlign:"left", animation:"fadeUp 0.6s ease 0.45s both" }}>
          <p style={{ fontWeight:700, color:"#0a1f24", fontSize:"14px", marginBottom:"14px" }}>What happens next</p>
          {[
            { icon:Sparkles, text:"A GPS consultant reviews your profile within 24 hours" },
            { icon:Users,    text:"You'll be matched to active roles that fit your background" },
            { icon:Zap,      text:"New mandates are shared with our talent network first — before going public" },
          ].map(({ icon:Icon, text }, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:i<2?"12px":0 }}>
              <div style={{ width:"30px", height:"30px", background:"#e6f5f3", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon size={14} color="#028090" />
              </div>
              <p style={{ fontSize:"13px", color:"#374151", margin:0 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display:"flex", flexDirection:"column", gap:"10px", animation:"fadeUp 0.6s ease 0.55s both" }}>
          <Link href="/account" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:"#028090", color:"white", padding:"15px", borderRadius:"12px", fontWeight:700, fontSize:"15px", textDecoration:"none" }}>
            Go to my dashboard <ArrowRight size={15} />
          </Link>
          <Link href="/jobs#roles" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", background:"white", color:"#0a1f24", padding:"15px", borderRadius:"12px", fontWeight:600, fontSize:"14px", textDecoration:"none", border:"1.5px solid #e5e7eb" }}>
            Browse open roles
          </Link>
        </div>

        <p style={{ fontSize:"12px", color:"#9ca3af", marginTop:"20px" }}>
          Want the Arabic version of your CV? <Link href="/account" style={{ color:"#028090", fontWeight:600 }}>Go to your dashboard →</Link>
        </p>

      </div>
    </div>
  )
}
