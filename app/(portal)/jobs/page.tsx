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
        const { data: cand } = await supabase.from("candidates").select("*").eq("email", u.email).single()
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
    }
    load()
  }, [])

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
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position:"relative", width:"100%", minHeight:"96vh", background:"#071f24", overflow:"hidden", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 24px 96px", isolation:"isolate" }}>

        {/* Radial glow */}
        <div style={{ position:"absolute", top:"-12%", left:"50%", transform:"translateX(-50%)", width:"min(1100px,140%)", height:"760px", background:"radial-gradient(ellipse at center,rgba(2,128,144,.42) 0%,rgba(2,128,144,.14) 38%,rgba(7,31,36,0) 70%)", filter:"blur(8px)", animation:"gpsGlow 9s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(168,213,209,.10) 1.2px, transparent 1.2px)", backgroundSize:"34px 34px", WebkitMaskImage:"radial-gradient(ellipse 80% 75% at 50% 42%, #000 35%, transparent 100%)", maskImage:"radial-gradient(ellipse 80% 75% at 50% 42%, #000 35%, transparent 100%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg, transparent, rgba(168,213,209,.30), transparent)" }} />

        <div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", maxWidth:"820px", width:"100%", animation:"fadeUp .8s ease both" }}>

          <img src="/gps-logo.png" alt="GPS Recruitment" style={{ width:"clamp(100px,14vw,160px)", height:"auto", marginBottom:"16px", filter:"drop-shadow(0 14px 40px rgba(2,128,144,.35))", animation:"gpsFloat 7s ease-in-out infinite" }} />

          <div style={{ fontSize:"11px", letterSpacing:".32em", textTransform:"uppercase", color:"#a8d5d1", fontWeight:600, marginBottom:"24px" }}>
            Executive Recruitment · Egypt & MENA
          </div>

          <h1 style={{ margin:"0 0 12px", fontFamily:"Georgia, serif", fontWeight:400, fontSize:"clamp(38px,6.4vw,76px)", lineHeight:1.04, letterSpacing:"-.015em", color:"#f4f8f7" }}>
            Your next role,<br />placed by <span style={{ color:"#36b0bd", fontStyle:"italic" }}>GPS</span>.
          </h1>

          <p style={{ margin:"0 0 16px", fontSize:"clamp(15px,1.6vw,19px)", lineHeight:1.65, color:"rgba(225,238,236,.72)", maxWidth:"560px" }}>
            Egypt's specialist recruitment network for senior finance, HR, operations and technology roles — across Egypt and the Gulf.
          </p>

          {/* CV Builder callout pill */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(2,128,144,0.15)", border:"1px solid rgba(2,128,144,0.4)", borderRadius:"99px", padding:"6px 14px 6px 8px", marginBottom:"36px" }}>
            <span style={{ background:"#028090", color:"white", fontSize:"10px", fontWeight:700, padding:"3px 8px", borderRadius:"99px", letterSpacing:"0.04em" }}>NEW</span>
            <span style={{ fontSize:"13px", color:"#a8d5d1", fontWeight:500 }}>AI CV Builder — free, takes 10 minutes</span>
            <Link href="/cv-builder" style={{ fontSize:"12px", color:"#36b0bd", fontWeight:700, textDecoration:"none" }}>Try it →</Link>
          </div>

          {/* CTA buttons */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"14px", justifyContent:"center" }}>
            <a href="#roles" className="gps-hero-primary" style={{ display:"inline-flex", alignItems:"center", gap:"10px", fontWeight:600, fontSize:"16px", whiteSpace:"nowrap", padding:"16px 30px", borderRadius:"10px", textDecoration:"none", transition:"transform .2s, box-shadow .2s, background .2s", background:"#028090", color:"#fff", boxShadow:"0 12px 30px -8px rgba(2,128,144,.7)" }}>
              Browse open roles <ArrowRight size={16} />
            </a>
            <Link href="/cv-builder" className="gps-hero-cv" style={{ display:"inline-flex", alignItems:"center", gap:"10px", fontWeight:600, fontSize:"16px", whiteSpace:"nowrap", padding:"16px 30px", borderRadius:"10px", textDecoration:"none", transition:"transform .2s, background .2s", background:"rgba(255,255,255,0.08)", color:"#f4f8f7", border:"1px solid rgba(255,255,255,0.18)" }}>
              <Sparkles size={16} color="#a8d5d1" /> Build your CV free
            </Link>
            <a href="/send-cv" className="gps-hero-secondary" style={{ display:"inline-flex", alignItems:"center", gap:"10px", fontWeight:500, fontSize:"15px", whiteSpace:"nowrap", padding:"16px 24px", borderRadius:"10px", textDecoration:"none", transition:"transform .2s, border-color .2s, background .2s", background:"transparent", color:"rgba(168,213,209,0.8)", border:"1px solid rgba(168,213,209,.25)" }}>
              Send us your CV
            </a>
          </div>
        </div>
      </section>

      {/* ── CV BUILDER FEATURE SECTION ── */}
      <section style={{ background:"white", padding:"80px 40px", borderBottom:"1px solid #f0f0f0" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"64px", alignItems:"center" }}>

            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"#e6f5f3", color:"#028090", fontSize:"12px", fontWeight:700, padding:"5px 12px", borderRadius:"99px", marginBottom:"20px", letterSpacing:"0.04em" }}>
                <Sparkles size={12} /> FREE AI CV BUILDER
              </div>
              <h2 style={{ fontSize:"clamp(28px,3.5vw,42px)", fontWeight:800, color:"#0a1f24", lineHeight:1.15, marginBottom:"18px", letterSpacing:"-0.5px" }}>
                Build a professional CV in 10 minutes — AI does the writing
              </h2>
              <p style={{ fontSize:"16px", color:"#6b7280", lineHeight:1.7, marginBottom:"28px" }}>
                Tell us your role and experience. Our AI generates your professional summary, rewrites your bullet points, and formats everything across 5 professionally designed templates built for the Egyptian and Gulf markets.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"32px" }}>
                {[
                  { icon: Sparkles, text: "AI writes your summary and bullet points for you" },
                  { icon: FileText, text: "5 templates designed for Egypt & MENA recruiters" },
                  { icon: Users, text: "Your CV automatically joins the GPS Talent Network" },
                  { icon: Shield, text: "Photo support — expected and encouraged in MENA" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"28px", height:"28px", background:"#e6f5f3", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={14} color="#028090" />
                    </div>
                    <span style={{ fontSize:"14px", color:"#374151" }}>{text}</span>
                  </div>
                ))}
              </div>
              <Link href="/cv-builder" style={{ display:"inline-flex", alignItems:"center", gap:"10px", background:"#0a1f24", color:"white", padding:"15px 28px", borderRadius:"12px", fontWeight:700, fontSize:"15px", textDecoration:"none" }}>
                Build my CV free <ArrowRight size={15} />
              </Link>
              <p style={{ fontSize:"12px", color:"#9ca3af", marginTop:"10px" }}>No credit card. No subscription. Your CV stays yours.</p>
            </div>

            {/* Visual preview of templates */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              {[
                { name:"Executive", color:"#0a1f24", accent:"#028090" },
                { name:"Modern", color:"#028090", accent:"#f4f8f7" },
                { name:"Two-Column", color:"#f4f8f7", accent:"#028090", border:true },
                { name:"Bold Block", color:"#3D5A4E", accent:"white" },
                { name:"Minimal", color:"white", accent:"#0a1f24", border:true },
              ].map((t, i) => (
                <div key={t.name} style={{ background:t.border?"white":t.color, border:t.border?"1.5px solid #e5e7eb":"none", borderRadius:"12px", padding:"14px", aspectRatio:"0.75", display:"flex", flexDirection:"column", gap:"6px", overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.08)", gridColumn: i === 4 ? "span 2" : "span 1" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
                    <div style={{ width:"18px", height:"18px", borderRadius:"50%", background:t.accent, opacity:0.7 }} />
                    <div style={{ height:"5px", borderRadius:"3px", background:t.border?t.accent:"rgba(255,255,255,0.4)", width:"50%", opacity:0.8 }} />
                  </div>
                  {[80,60,90,55,70].map((w,j) => (
                    <div key={j} style={{ height:"4px", borderRadius:"2px", background:t.border?`${t.accent}22`:"rgba(255,255,255,0.2)", width:`${w}%` }} />
                  ))}
                  <div style={{ marginTop:"4px", fontSize:"8px", fontWeight:700, color:t.border?t.accent:"rgba(255,255,255,0.5)", letterSpacing:"0.05em" }}>{t.name}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── TRUST STATS ── */}
      <section style={{ background:"#f9fafb", padding:"48px 40px", borderBottom:"1px solid #f0f0f0" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"32px", textAlign:"center" }}>
          {[
            { stat:"10 min", label:"Average build time" },
            { stat:"5", label:"Professional templates" },
            { stat:"MENA", label:"Market-optimised" },
            { stat:"Free", label:"Always, forever" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div style={{ fontSize:"32px", fontWeight:800, color:"#028090", marginBottom:"4px" }}>{stat}</div>
              <div style={{ fontSize:"13px", color:"#6b7280" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OPEN ROLES ── */}
      <section id="roles" style={{ maxWidth:"1100px", margin:"0 auto", padding:"72px 40px" }}>
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
                    <span style={{ background:"#e6f5f3", color:"#028090", fontSize:"11px", fontWeight:700, padding:"4px 12px", borderRadius:"99px" }}>Active</span>
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
      <section style={{ maxWidth:"1100px", margin:"0 auto", padding:"0 40px 80px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
          <div style={{ background:"linear-gradient(135deg, #028090 0%, #3D5A4E 100%)", borderRadius:"20px", padding:"36px 36px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, opacity:0.06, backgroundImage:`url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 3 L47 16 L47 34 L25 47 L3 34 L3 16 Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize:"50px 50px" }} />
            <Zap size={24} color="rgba(255,255,255,0.6)" style={{ marginBottom:"12px" }} />
            <h3 style={{ fontSize:"20px", fontWeight:800, color:"white", marginBottom:"8px" }}>Don't see the right role?</h3>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:"13px", lineHeight:1.6, marginBottom:"20px" }}>Join our network. GPS reaches out to our talent pool first — before roles are posted publicly.</p>
            <Link href="/join" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"white", color:"#028090", padding:"12px 22px", borderRadius:"10px", fontWeight:700, fontSize:"14px", textDecoration:"none" }}>
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
      <div style={{ background:"linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)", padding:"40px 40px 48px" }}>
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

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"14px" }}>
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

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"36px 40px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:"28px", alignItems:"start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"18px" }}>
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
