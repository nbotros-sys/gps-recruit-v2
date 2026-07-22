"use client"
import { useEffect, useState } from "react"
import { MapPin, ArrowRight, Briefcase, FileText, CheckCircle, Loader2, Sparkles, Users, Shield, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import CandidateAvatar from "@/components/CandidateAvatar"

const COLORS = ["#028090","#3D5A4E","#1d4ed8","#7c3aed","#b45309","#be185d","#0f766e"]
function getColor(name: string) { return COLORS[name.split("").reduce((a,c) => a + c.charCodeAt(0), 0) % COLORS.length] }

function completionScore(c: any) {
  const fields = ["name","phone","current_title","current_company","location","linkedin_url"]
  const filled = fields.filter((f:string) => c[f] && c[f].toString().trim().length > 0).length
  return Math.round(((filled + (c.avatar_url?1:0) + (c.cv_text?1:0)) / (fields.length + 2)) * 100)
}

export default function JobsPage() {
  const [mandates, setMandates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      const { data: mandateData } = await supabase
        .from("mandates")
        .select("id, title, client_name, location, salary_range, status, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
      setMandates(mandateData || [])
      if (u) {
        const { data: cand } = await supabase.from("candidates").select("*").eq("email", u.email).maybeSingle()
        if (cand) {
          setCandidate(cand)
          const { data: apps } = await supabase
            .from("applications")
            .select("*, mandate:mandates(id, title, client_name, location)")
            .eq("candidate_id", cand.id)
            .order("created_at", { ascending: false })
          setApplications(apps || [])
        }
      }
      setLoading(false)
      // Scroll behaviour after data loads:
      //  - a plain refresh always returns to the top (never a stale mid-page spot)
      //  - arriving via a #roles link from another page scrolls to the roles list
      if (typeof window !== "undefined") {
        history.scrollRestoration = "manual"
        const navEntry = performance.getEntriesByType("navigation")[0] as any
        const isReload = navEntry?.type === "reload"
        if (window.location.hash === "#roles" && !isReload) {
          setTimeout(() => {
            const el = document.getElementById("roles")
            if (el) {
              const top = el.getBoundingClientRect().top + window.scrollY - 80
              window.scrollTo({ top, behavior: "smooth" })
            }
          }, 100)
        } else {
          window.scrollTo(0, 0)
        }
      }
    }
    load()
  }, [])

  // Realtime: newly published roles appear (and closed roles disappear) without a refresh
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const channel = supabase
      .channel("public-jobs-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "mandates" }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(async () => {
          const { data: mandateData } = await supabase
            .from("mandates")
            .select("id, title, client_name, location, salary_range, status, created_at")
            .eq("status", "active")
            .order("created_at", { ascending: false })
          setMandates(mandateData || [])
        }, 800)
      })
      .subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  // Show skeleton shell while auth + data loads — prevents layout shift and looks fast
  if (loading) return (
    <div style={{ background:"#f4f8f7", minHeight:"100vh" }}>
      {/* Hero skeleton */}
      <div style={{ background:"#071f24", padding:"60px 40px 70px", textAlign:"center" }}>
        <div className="skeleton" style={{ width:"180px", height:"14px", margin:"0 auto 20px", opacity:0.15 }} />
        <div className="skeleton" style={{ width:"420px", maxWidth:"85%", height:"48px", margin:"0 auto 12px", opacity:0.12 }} />
        <div className="skeleton" style={{ width:"320px", maxWidth:"70%", height:"48px", margin:"0 auto 24px", opacity:0.12 }} />
        <div className="skeleton" style={{ width:"240px", height:"16px", margin:"0 auto 32px", opacity:0.1 }} />
        <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
          <div className="skeleton" style={{ width:"160px", height:"46px", borderRadius:"10px", opacity:0.15 }} />
          <div className="skeleton" style={{ width:"140px", height:"46px", borderRadius:"10px", opacity:0.1 }} />
        </div>
      </div>
      {/* Jobs skeleton */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"60px 40px" }}>
        <div className="skeleton" style={{ width:"120px", height:"20px", marginBottom:"8px" }} />
        <div className="skeleton" style={{ width:"280px", height:"14px", marginBottom:"32px" }} />
        {[1,2,3].map(i => (
          <div key={i} style={{ background:"white", borderRadius:"16px", padding:"20px 24px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"16px", border:"1px solid #e8ecef" }}>
            <div className="skeleton" style={{ width:"44px", height:"44px", borderRadius:"12px", flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div className="skeleton" style={{ width:"200px", height:"16px", marginBottom:"8px" }} />
              <div className="skeleton" style={{ width:"140px", height:"12px" }} />
            </div>
            <div className="skeleton" style={{ width:"60px", height:"28px", borderRadius:"99px" }} />
          </div>
        ))}
      </div>
    </div>
  )

  if (user && candidate) return <LoggedInHome candidate={candidate} applications={applications} mandates={mandates} />

  return (
    <div>
      <style>{`
        @keyframes gpsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes gpsGlow  { 0%,100%{opacity:.55} 50%{opacity:.85} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .gps-hero-primary:hover  { background:#0596a8!important; transform:translateY(-2px); box-shadow:0 18px 38px -8px rgba(2,128,144,.85)!important; }
        .gps-hero-secondary:hover{ border-color:rgba(168,213,209,.85)!important; background:rgba(168,213,209,.08)!important; transform:translateY(-2px); }
        .gps-hero-cv:hover       { background:rgba(255,255,255,.12)!important; transform:translateY(-2px); }
        .role-card:hover         { border-color:#028090!important; box-shadow:0 4px 20px rgba(2,128,144,0.08)!important; }
        @media (max-width: 820px) {
          .jobs-grid-2 { grid-template-columns: 1fr !important; }
          .jobs-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .cv-mini-preview { display: none !important; }
        }
        @media (max-width: 480px) {
          .role-active-pill { display: none !important; }
        }
      `}</style>

      {/* ── HERO: RECRUITMENT ── */}
      <section style={{ position:"relative", width:"100%", minHeight:"38vh", background:"#071f24", overflow:"hidden", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px 36px", isolation:"isolate" }}>
        <div style={{ position:"absolute", top:"-12%", left:"50%", transform:"translateX(-50%)", width:"min(1100px,140%)", height:"760px", background:"radial-gradient(ellipse at center,rgba(2,128,144,.38) 0%,rgba(2,128,144,.12) 40%,rgba(7,31,36,0) 70%)", filter:"blur(8px)", animation:"gpsGlow 9s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(168,213,209,.10) 1.2px, transparent 1.2px)", backgroundSize:"34px 34px", WebkitMaskImage:"radial-gradient(ellipse 80% 75% at 50% 42%, #000 35%, transparent 100%)", maskImage:"radial-gradient(ellipse 80% 75% at 50% 42%, #000 35%, transparent 100%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg, transparent, rgba(168,213,209,.30), transparent)" }} />
        {/* Bottom fade into CV section */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"120px", background:"linear-gradient(to bottom, transparent, #0a1f24)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", maxWidth:"820px", width:"100%", animation:"fadeUp .8s ease both" }}>
          <img src="/gps-logo.png" alt="GPS Recruitment" style={{ width:"clamp(52px,6vw,72px)", height:"auto", marginBottom:"6px", filter:"drop-shadow(0 14px 40px rgba(2,128,144,.35))", animation:"gpsFloat 7s ease-in-out infinite" }} />
          <div style={{ fontSize:"10px", letterSpacing:".28em", textTransform:"uppercase", color:"#a8d5d1", fontWeight:600, marginBottom:"8px" }}>
            Executive Recruitment · Egypt & MENA
          </div>
          <h1 style={{ margin:"0 0 10px", fontFamily:"Georgia, serif", fontWeight:400, fontSize:"clamp(30px,4.8vw,58px)", lineHeight:1.06, letterSpacing:"-.015em", color:"#f4f8f7" }}>
            Your next role,<br />placed by <span style={{ color:"#36b0bd", fontStyle:"italic" }}>GPS</span>.
          </h1>
          <p style={{ margin:"0 0 20px", fontSize:"clamp(13px,1.2vw,15px)", lineHeight:1.5, color:"rgba(225,238,236,.65)", maxWidth:"640px" }}>
            Egypt's specialist recruitment network — placing professionals across all functions and industries, in Egypt and the Gulf.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"12px", justifyContent:"center" }}>
            <button onClick={() => {
                const el = document.getElementById("roles")
                if (!el) return
                const top = el.getBoundingClientRect().top + window.scrollY - 80
                window.scrollTo({ top, behavior: "smooth" })
              }} className="gps-hero-primary" style={{ display:"inline-flex", alignItems:"center", gap:"10px", fontWeight:600, fontSize:"15px", whiteSpace:"nowrap", padding:"12px 24px", borderRadius:"10px", border:"none", cursor:"pointer", transition:"transform .2s, box-shadow .2s, background .2s", background:"#028090", color:"#fff", boxShadow:"0 10px 28px -8px rgba(2,128,144,.7)" }}>
              Browse open roles <ArrowRight size={15} />
            </button>
            <a href="/send-cv" className="gps-hero-secondary" style={{ display:"inline-flex", alignItems:"center", gap:"10px", fontWeight:500, fontSize:"14px", whiteSpace:"nowrap", padding:"14px 24px", borderRadius:"10px", textDecoration:"none", transition:"transform .2s, border-color .2s, background .2s", background:"transparent", color:"rgba(168,213,209,0.8)", border:"1px solid rgba(168,213,209,.25)" }}>
              Send us your CV
            </a>
          </div>
        </div>
      </section>

      {/* ── CV TOOLS HERO ── big, prominent, its own section ── */}
      <section style={{ background:"#0a1f24", padding:"0 0 0" }}>
        <div className="jobs-pad" style={{ maxWidth:"1200px", margin:"0 auto", padding:"0 40px 48px" }}>

          {/* Section label */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", paddingTop:"20px", marginBottom:"16px" }}>
            <div style={{ height:"1px", flex:1, background:"rgba(168,213,209,0.15)" }} />
            <span style={{ fontSize:"11px", letterSpacing:".28em", textTransform:"uppercase", color:"rgba(168,213,209,0.5)", fontWeight:600, whiteSpace:"nowrap" }}>GPS AI Tools · Free</span>
            <div style={{ height:"1px", flex:1, background:"rgba(168,213,209,0.15)" }} />
          </div>

          {/* Two big cards side by side */}
          <div className="jobs-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"32px" }}>

            {/* Card 1: Build CV */}
            <Link href="/cv-builder" style={{ textDecoration:"none", display:"block" }}>
              <div style={{ background:"linear-gradient(135deg, #028090 0%, #025f6b 100%)", borderRadius:"24px", padding:"28px", position:"relative", overflow:"hidden", minHeight:"240px", display:"flex", flexDirection:"column", justifyContent:"space-between", cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow="0 24px 60px rgba(2,128,144,0.4)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow="none" }}>
                {/* Background pattern */}
                <div style={{ position:"absolute", inset:0, opacity:0.08, backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54 12H6v36h48V12z' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M12 20h36M12 28h28M12 36h20' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize:"60px 60px", pointerEvents:"none" }} />
                {/* Mini CV preview */}
                <div className="cv-mini-preview" style={{ position:"absolute", right:"24px", top:"24px", width:"110px", background:"rgba(255,255,255,0.12)", borderRadius:"10px", padding:"10px", backdropFilter:"blur(4px)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"7px" }}>
                    <div style={{ width:"14px", height:"14px", borderRadius:"50%", background:"rgba(255,255,255,0.4)" }} />
                    <div style={{ height:"4px", borderRadius:"2px", background:"rgba(255,255,255,0.35)", flex:1 }} />
                  </div>
                  {[85,65,90,55,75,60].map((w,i) => <div key={i} style={{ height:"3px", borderRadius:"2px", background:"rgba(255,255,255,0.2)", width:`${w}%`, marginBottom:"4px" }} />)}
                  <div style={{ marginTop:"6px", display:"flex", gap:"3px" }}>
                    {["#028090","#3D5A4E","#fff"].map(c => <div key={c} style={{ width:"8px", height:"8px", borderRadius:"2px", background:c, opacity:0.7 }} />)}
                  </div>
                </div>

                <div>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(255,255,255,0.15)", borderRadius:"99px", padding:"5px 12px", marginBottom:"20px" }}>
                    <Sparkles size={12} color="white" />
                    <span style={{ fontSize:"11px", color:"white", fontWeight:600, letterSpacing:"0.04em" }}>AI-POWERED · FREE</span>
                  </div>
                  <h2 style={{ fontSize:"clamp(26px,3vw,36px)", fontWeight:800, color:"white", lineHeight:1.15, marginBottom:"14px", letterSpacing:"-0.5px" }}>
                    Build your CV<br />in 10 minutes
                  </h2>
                  <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.72)", lineHeight:1.65, marginBottom:"0", maxWidth:"340px" }}>
                    No experience writing CVs? No problem. Tell us your role — AI writes your summary, rewrites your bullet points, and formats across 5 MENA-optimised templates. Your CV goes straight to GPS recruiters.
                  </p>
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"32px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"white", color:"#028090", padding:"13px 22px", borderRadius:"12px", fontWeight:700, fontSize:"14px" }}>
                    <Sparkles size={14} /> Build my CV free
                  </div>
                  <div style={{ display:"flex", gap:"8px" }}>
                    {["10 min","Free"].map(t => (
                      <span key={t} style={{ fontSize:"10px", color:"rgba(255,255,255,0.55)", background:"rgba(255,255,255,0.1)", padding:"4px 8px", borderRadius:"6px", fontWeight:500 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 2: Review CV */}
            <Link href="/cv-builder?tab=reviewer" style={{ textDecoration:"none", display:"block" }}>
              <div style={{ background:"linear-gradient(135deg, #1a3a3a 0%, #0a1f24 100%)", border:"1px solid rgba(168,213,209,0.2)", borderRadius:"24px", padding:"28px", position:"relative", overflow:"hidden", minHeight:"240px", display:"flex", flexDirection:"column", justifyContent:"space-between", cursor:"pointer", transition:"transform 0.2s, border-color 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(168,213,209,0.5)"; (e.currentTarget as HTMLElement).style.boxShadow="0 24px 60px rgba(0,0,0,0.3)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(168,213,209,0.2)"; (e.currentTarget as HTMLElement).style.boxShadow="none" }}>

                {/* Score preview */}
                <div className="cv-mini-preview" style={{ position:"absolute", right:"24px", top:"24px", width:"100px", background:"rgba(2,128,144,0.2)", border:"1px solid rgba(2,128,144,0.3)", borderRadius:"14px", padding:"12px", textAlign:"center" }}>
                  <div style={{ fontSize:"28px", fontWeight:800, color:"#5ecfdb", lineHeight:1 }}>78</div>
                  <div style={{ fontSize:"9px", color:"rgba(168,213,209,0.6)", marginTop:"3px", fontWeight:500 }}>/ 100</div>
                  <div style={{ marginTop:"8px", height:"4px", background:"rgba(255,255,255,0.1)", borderRadius:"99px", overflow:"hidden" }}>
                    <div style={{ width:"78%", height:"100%", background:"#028090", borderRadius:"99px" }} />
                  </div>
                  <div style={{ fontSize:"9px", color:"rgba(168,213,209,0.5)", marginTop:"4px" }}>AI score</div>
                </div>

                <div>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(168,213,209,0.1)", border:"1px solid rgba(168,213,209,0.2)", borderRadius:"99px", padding:"5px 12px", marginBottom:"20px" }}>
                    <FileText size={12} color="#a8d5d1" />
                    <span style={{ fontSize:"11px", color:"#a8d5d1", fontWeight:600, letterSpacing:"0.04em" }}>INSTANT AI REVIEW · FREE</span>
                  </div>
                  <h2 style={{ fontSize:"clamp(26px,3vw,36px)", fontWeight:800, color:"white", lineHeight:1.15, marginBottom:"14px", letterSpacing:"-0.5px" }}>
                    Get your CV<br />reviewed by AI
                  </h2>
                  <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.58)", lineHeight:1.65, marginBottom:"0", maxWidth:"340px" }}>
                    Already have a CV? Upload it and get an instant score, a breakdown of weak sections, and AI-generated rewrites — all calibrated for MENA recruiters and ATS systems.
                  </p>
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"32px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(2,128,144,0.3)", border:"1px solid rgba(2,128,144,0.5)", color:"#a8d5d1", padding:"13px 22px", borderRadius:"12px", fontWeight:700, fontSize:"14px" }}>
                    <FileText size={14} /> Review my CV
                  </div>
                  <div style={{ display:"flex", gap:"8px" }}>
                    {["PDF · Word","Instant","Free"].map(t => (
                      <span key={t} style={{ fontSize:"10px", color:"rgba(168,213,209,0.4)", background:"rgba(255,255,255,0.05)", padding:"4px 8px", borderRadius:"6px", fontWeight:500 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>

          </div>

          {/* Bottom trust strip */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"40px", flexWrap:"wrap" }}>
            {[
              { stat:"10 min", label:"to build a full CV" },

              { stat:"Free", label:"no card, no catch" },
              { stat:"100%", label:"goes to GPS recruiters" },
            ].map(({ stat, label }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:"22px", fontWeight:800, color:"#a8d5d1", marginBottom:"2px" }}>{stat}</div>
                <div style={{ fontSize:"12px", color:"rgba(168,213,209,0.45)" }}>{label}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── OPEN ROLES ── */}
      <section id="roles" className="jobs-pad" style={{ maxWidth:"1100px", margin:"0 auto", padding:"72px 40px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"28px" }}>
          <div>
            <h2 style={{ fontSize:"28px", fontWeight:800, color:"#0a1f24", scrollMarginTop:"90px", margin:0 }}>Open roles</h2>
            <p style={{ color:"#9ca3af", fontSize:"14px", marginTop:"6px" }}>Active mandates — reviewed by GPS consultants</p>
          </div>
          <span style={{ fontSize:"13px", color:"#028090", fontWeight:600 }}>{loading ? "…" : mandates.length} active</span>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}><Loader2 size={24} className="animate-spin" style={{ color:"#028090", display:"inline-block" }} /></div>
        ) : mandates.length === 0 ? (
          <div style={{ background:"white", border:"1px solid #e8e8e8", borderRadius:"20px", textAlign:"center", padding:"80px 40px" }}>
            <div style={{ fontSize:"36px", marginBottom:"12px" }}>◎</div>
            <p style={{ color:"#666", fontWeight:600, marginBottom:"8px" }}>No active roles right now</p>
            <p style={{ color:"#aaa", fontSize:"14px", marginBottom:"24px" }}>Join our network and we'll reach out when something fits.</p>
            <Link href="/join" style={{ background:"#028090", color:"white", padding:"12px 28px", borderRadius:"10px", fontWeight:700, fontSize:"14px", textDecoration:"none", display:"inline-block" }}>
              Join GPS Talent Network
            </Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {mandates.map((m, i) => (
              <Link key={m.id} href={`/jobs/${m.id}`} style={{ textDecoration:"none" }}>
                <div className="role-card" style={{ background:"white", border:"1px solid #e8f4f2", borderRadius:"16px", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"16px", minWidth:0 }}>
                    <div style={{ width:"44px", height:"44px", background:"linear-gradient(135deg, #028090, #3D5A4E)", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:"14px", flexShrink:0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:"15px", color:"#0a1f24" }}>{m.title}</div>
                      <div style={{ fontSize:"13px", color:"#9ca3af", marginTop:"3px", display:"flex", alignItems:"center", gap:"8px" }}>
                        {m.location && <span style={{ display:"flex", alignItems:"center", gap:"3px" }}><MapPin size={11} /> {m.location}</span>}
                        {m.salary_range && <span>· {m.salary_range}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", flexShrink:0 }}>
                    <span className="role-active-pill" style={{ background:"#e6f5f3", color:"#028090", fontSize:"11px", fontWeight:700, padding:"4px 12px", borderRadius:"99px" }}>Active</span>
                    <div style={{ width:"32px", height:"32px", background:"#028090", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <ArrowRight size={14} color="white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="jobs-pad" style={{ maxWidth:"1100px", margin:"0 auto", padding:"0 40px 80px" }}>
        <div className="jobs-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
          <div style={{ background:"linear-gradient(135deg, #028090 0%, #3D5A4E 100%)", borderRadius:"20px", padding:"36px 36px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, opacity:0.06, pointerEvents:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 3 L47 16 L47 34 L25 47 L3 34 L3 16 Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize:"50px 50px" }} />
            <Zap size={24} color="rgba(255,255,255,0.6)" style={{ marginBottom:"12px" }} />
            <h3 style={{ fontSize:"20px", fontWeight:800, color:"white", marginBottom:"8px" }}>Don't see the right role?</h3>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:"13px", lineHeight:1.6, marginBottom:"20px" }}>Join our network. GPS reaches out to our talent pool first — before roles are posted publicly.</p>
            <Link href="/send-cv" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"white", color:"#028090", padding:"12px 22px", borderRadius:"10px", fontWeight:700, fontSize:"14px", textDecoration:"none" }}>
              Join GPS Talent <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ background:"#0a1f24", borderRadius:"20px", padding:"36px 36px", position:"relative", overflow:"hidden" }}>
            <Sparkles size={24} color="rgba(168,213,209,0.6)" style={{ marginBottom:"12px" }} />
            <h3 style={{ fontSize:"20px", fontWeight:800, color:"white", marginBottom:"8px" }}>Build a GPS-ready CV</h3>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"13px", lineHeight:1.6, marginBottom:"20px" }}>Free AI CV builder. Takes 10 minutes. Saves directly to our recruiter database. 5 MENA-optimised templates.</p>
            <Link href="/cv-builder" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"#028090", color:"white", padding:"12px 22px", borderRadius:"10px", fontWeight:700, fontSize:"14px", textDecoration:"none" }}>
              Build my CV free <ArrowRight size={14} />
            </Link>
          </div>
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
    new: { label:"Received", color:"#6b7280" },
    screening: { label:"Under Review", color:"#d97706" },
    interview: { label:"Interview", color:"#028090" },
    shortlisted: { label:"Shortlisted", color:"#7c3aed" },
    offered: { label:"Offer Stage", color:"#059669" },
    placed: { label:"Placed ✓", color:"#028090" },
    on_hold: { label:"On Hold", color:"#ef4444" },
  }

  const candidateTags = (candidate.tags || []).map((t: string) => t.toLowerCase())
  const ranked = [...mandates].sort((a, b) => {
    const aMatch = candidateTags.some((t: string) => (a.title + " " + a.client_name).toLowerCase().includes(t))
    const bMatch = candidateTags.some((t: string) => (b.title + " " + b.client_name).toLowerCase().includes(t))
    return (bMatch ? 1 : 0) - (aMatch ? 1 : 0)
  })

  const appliedIds = new Set(applications.map((a: any) => a.mandate_id))

  return (
    <div style={{ background:"#F4F8F7", minHeight:"80vh" }}>
      <style>{`
        @media (max-width: 820px) {
          .li-grid-3 { grid-template-columns: 1fr !important; }
          .li-grid-main { grid-template-columns: 1fr !important; }
          .li-pad { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
      <div className="li-pad" style={{ background:"linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)", padding:"40px 40px 48px" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"28px", flexWrap:"wrap", gap:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
              <CandidateAvatar name={candidate.name || "?"} avatarUrl={candidate.avatar_url} size={60} />
              <div>
                <h1 style={{ fontSize:"24px", fontWeight:800, color:"white", marginBottom:"4px" }}>Good to see you, {firstName}</h1>
                {candidate.current_title && <p style={{ color:"#A8D5D1", fontSize:"14px", fontWeight:500, margin:0 }}>{candidate.current_title}{candidate.current_company ? ` @ ${candidate.current_company}` : ""}</p>}
              </div>
            </div>
            {!candidate.cv_text && (
              <Link href="/cv-builder" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"#028090", color:"white", padding:"10px 18px", borderRadius:"10px", fontWeight:700, fontSize:"13px", textDecoration:"none" }}>
                <Sparkles size={14} /> Build your CV free
              </Link>
            )}
          </div>

          <div className="li-grid-3" style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"14px" }}>
            <a href="/account/profile" style={{ textDecoration:"none" }}>
              <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"16px", padding:"18px", display:"flex", alignItems:"center", gap:"14px" }}>
                <div style={{ position:"relative", width:"48px", height:"48px", flexShrink:0 }}>
                  <svg width="48" height="48" style={{ transform:"rotate(-90deg)" }}>
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#A8D5D1" strokeWidth="3.5" strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:800, color:"white" }}>{pct}%</div>
                </div>
                <div>
                  <p style={{ fontSize:"13px", fontWeight:700, color:"white", margin:0 }}>Profile</p>
                  <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", margin:0 }}>{pct < 100 ? "Tap to complete" : "Complete ✓"}</p>
                </div>
              </div>
            </a>
            <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"16px", padding:"18px", display:"flex", alignItems:"center", gap:"14px" }}>
              <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"rgba(2,128,144,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Briefcase size={20} color="#A8D5D1" />
              </div>
              <div>
                <p style={{ fontSize:"22px", fontWeight:800, color:"white", margin:0 }}>{applications.length}</p>
                <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", margin:0 }}>Application{applications.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <a href={candidate.cv_text ? "/account/cv" : "/cv-builder"} style={{ textDecoration:"none" }}>
              <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"16px", padding:"18px", display:"flex", alignItems:"center", gap:"14px" }}>
                <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:candidate.cv_text ? "rgba(2,128,144,0.3)" : "rgba(217,119,6,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <FileText size={20} color={candidate.cv_text ? "#A8D5D1" : "#fbbf24"} />
                </div>
                <div>
                  <p style={{ fontSize:"13px", fontWeight:700, color:"white", margin:0 }}>CV</p>
                  <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", margin:0 }}>{candidate.cv_text ? "On file ✓" : "Build free →"}</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="li-pad" style={{ maxWidth:"1100px", margin:"0 auto", padding:"36px 40px" }}>
        <div className="li-grid-main" style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:"28px", alignItems:"start" }}>
          <div>
            <div id="roles" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"18px" }}>
              <div>
                <h2 style={{ fontSize:"19px", fontWeight:800, color:"#0a1f24", margin:0 }}>Open roles</h2>
                <p style={{ fontSize:"13px", color:"#9ca3af", marginTop:"3px" }}>Ranked by relevance to your profile</p>
              </div>
              <span style={{ fontSize:"13px", color:"#028090", fontWeight:600 }}>{mandates.length} active</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {ranked.map((m: any) => {
                const applied = appliedIds.has(m.id)
                return (
                  <a key={m.id} href={applied ? "#" : `/jobs/${m.id}`} style={{ textDecoration:"none", display:"block", background:"white", borderRadius:"14px", border:applied ? "1.5px solid #A8D5D1" : "1px solid #e8e8e8", padding:"18px 22px", transition:"box-shadow 0.15s", cursor:applied ? "default" : "pointer" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                          <span style={{ fontSize:"14px", fontWeight:700, color:"#0a1f24" }}>{m.title}</span>
                          {applied && <span style={{ fontSize:"10px", background:"#e6f5f3", color:"#028090", padding:"2px 8px", borderRadius:"99px", fontWeight:600 }}>Applied ✓</span>}
                        </div>
                        <div style={{ display:"flex", gap:"10px", marginTop:"5px", flexWrap:"wrap" }}>
                          {m.location && <span style={{ fontSize:"12px", color:"#9ca3af", display:"flex", alignItems:"center", gap:"3px" }}><MapPin size={10} /> {m.location}</span>}
                          {m.salary_range && <span style={{ fontSize:"12px", color:"#9ca3af" }}>· {m.salary_range}</span>}
                        </div>
                      </div>
                      {!applied && <ArrowRight size={16} color="#028090" style={{ flexShrink:0, marginTop:"2px" }} />}
                    </div>
                  </a>
                )
              })}
              {mandates.length === 0 && <div style={{ textAlign:"center", padding:"32px", color:"#aaa", fontSize:"14px" }}>No open roles right now — check back soon.</div>}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            {!candidate.cv_text && (
              <div style={{ background:"linear-gradient(135deg,#0a1f24,#1a3a3a)", borderRadius:"18px", padding:"22px" }}>
                <Sparkles size={20} color="#A8D5D1" style={{ marginBottom:"10px" }} />
                <p style={{ fontWeight:700, color:"white", fontSize:"14px", marginBottom:"6px" }}>No CV on file yet</p>
                <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"12px", marginBottom:"16px", lineHeight:1.6 }}>Build your GPS CV in 10 minutes. AI writes it for you. Saves to our recruiter database automatically.</p>
                <Link href="/cv-builder" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", background:"#028090", color:"white", padding:"11px", borderRadius:"10px", fontWeight:700, fontSize:"13px", textDecoration:"none" }}>
                  <Sparkles size={13} /> Build my CV free
                </Link>
              </div>
            )}
            <div style={{ background:"white", borderRadius:"18px", border:"1px solid #e8e8e8", padding:"22px" }}>
              <h3 style={{ fontSize:"15px", fontWeight:800, color:"#0a1f24", marginBottom:"14px" }}>My applications</h3>
              {applications.length === 0 ? (
                <p style={{ fontSize:"13px", color:"#aaa", textAlign:"center", padding:"16px 0" }}>No applications yet</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {applications.slice(0, 5).map((app: any) => {
                    const stage = STAGE_LABELS[app.stage] || { label:app.stage, color:"#888" }
                    return (
                      <div key={app.id} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:"13px", fontWeight:600, color:"#0a1f24", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{app.mandate?.title}</p>
                        </div>
                        <span style={{ fontSize:"11px", fontWeight:600, color:stage.color, whiteSpace:"nowrap", flexShrink:0 }}>{stage.label}</span>
                      </div>
                    )
                  })}
                  {applications.length > 5 && (
                    <a href="/account" style={{ fontSize:"12px", color:"#028090", fontWeight:600, textDecoration:"none", textAlign:"center" }}>View all {applications.length} →</a>
                  )}
                </div>
              )}
            </div>
            <div style={{ background:"white", borderRadius:"18px", border:"1px solid #e8e8e8", padding:"22px" }}>
              <h3 style={{ fontSize:"15px", fontWeight:800, color:"#0a1f24", marginBottom:"14px" }}>Quick links</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                {[
                  { label:"Complete my profile", href:"/account/profile", sub:`${pct}% done` },
                  { label:"Build / update CV", href:"/cv-builder", sub:"AI builder" },
                  { label:"My dashboard", href:"/account", sub:`${applications.length} applications` },
                  { label:"How GPS works", href:"/how-it-works", sub:"About the process" },
                ].map(({ label, href, sub }) => (
                  <a key={label} href={href} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 10px", borderRadius:"10px", textDecoration:"none", transition:"background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="#f5f5f5"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:"13px", fontWeight:600, color:"#0a1f24", margin:0 }}>{label}</p>
                      <p style={{ fontSize:"11px", color:"#aaa", margin:0 }}>{sub}</p>
                    </div>
                    <ArrowRight size={13} color="#ccc" />
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
