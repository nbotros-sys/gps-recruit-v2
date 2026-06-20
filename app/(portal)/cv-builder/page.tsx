"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { ArrowRight, ArrowLeft, Upload, Sparkles, CheckCircle, Loader2, User, FileText, Briefcase, GraduationCap, Star, Download, Eye, Camera, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","C-Suite / Executive","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level / Executive"]
const NATIONALITIES = ["Egyptian","Saudi","Emirati","Kuwaiti","Jordanian","Lebanese","Syrian","Palestinian","Sudanese","Libyan","Moroccan","Tunisian","Algerian","British","American","Canadian","French","German","Other"]
const LANGUAGES = ["Arabic","English","French","German","Spanish","Italian","Turkish","Mandarin","Other"]

const STEPS = [
  { id:"personal",   icon:User,          label:"Personal" },
  { id:"experience", icon:Briefcase,     label:"Experience" },
  { id:"skills",     icon:Sparkles,      label:"Skills" },
  { id:"education",  icon:GraduationCap, label:"Education" },
  { id:"summary",    icon:Star,          label:"Summary" },
  { id:"template",   icon:Eye,           label:"Template" },
]

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  "Finance & Accounting": ["Financial Reporting","IFRS","SAP","Excel Advanced","Budgeting","Forecasting","Cash Flow Management","ERP Systems","VAT Compliance","Financial Modelling","Power BI","Team Leadership"],
  "HR & People": ["Talent Acquisition","Performance Management","HRIS","Payroll","Labour Law","Employee Relations","Onboarding","Learning & Development","Compensation & Benefits","Organisation Design"],
  "Sales & Business Development": ["B2B Sales","CRM","Negotiation","Key Account Management","Pipeline Management","Salesforce","Business Development","Client Retention","Tendering","Market Expansion"],
  "Marketing": ["Digital Marketing","SEO/SEM","Social Media","Content Strategy","Google Analytics","Email Marketing","Brand Management","Campaign Management","Adobe Creative Suite","Arabic Content","Canva","Meta Ads"],
  "Technology & IT": ["Python","JavaScript","SQL","Cloud (AWS/Azure)","Agile/Scrum","DevOps","Cybersecurity","System Architecture","API Development","Data Analysis"],
  "Operations": ["Process Improvement","Supply Chain","ERP","Lean/Six Sigma","Vendor Management","KPI Management","Project Management","Risk Management","Quality Control","Logistics"],
  "General Management": ["P&L Management","Strategic Planning","Team Leadership","Change Management","Stakeholder Management","Business Strategy","Operational Excellence","Cross-functional Leadership","Budget Management","Board Reporting"],
}

// ── TYPES ────────────────────────────────────────────────────────────────────
type Exp = { company:string; title:string; start:string; end:string; current:boolean; bullets:string[] }
type Edu = { institution:string; degree:string; field:string; startYear:string; endYear:string }
type FormData = {
  personal: { name:string; title:string; email:string; phone:string; location:string; nationality:string; dob:string; linkedin:string; photo:string|null }
  summary: string
  experience: Exp[]
  education: Edu[]
  hobbies: string
  skills: string[]
  languages: Array<{ lang:string; level:string }>
  job_function: string
  level: string
  achievements: string
}

const INITIAL: FormData = {
  personal: { name:"", title:"", email:"", phone:"", location:"", nationality:"", dob:"", linkedin:"", photo:null },
  summary: "",
  experience: [{ company:"", title:"", start:"", end:"", current:false, bullets:[""] }],
  education: [{ institution:"", degree:"", field:"", startYear:"", endYear:"" }],
  hobbies: "",
  skills: [],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  job_function: "",
  level: "",
  achievements: "",
}

// ── DENSITY CALCULATOR ────────────────────────────────────────────────────────
// ── TYPESETTING ENGINE ───────────────────────────────────────────────────────
// Smooth interpolation between sparse (t=0) and dense (t=1) extremes.
// Candidate never sees this — it runs silently on every form change.
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpR(a: number, b: number, t: number) { return Math.round(lerp(a, b, t)) }
function lerpF(a: number, b: number, t: number) { return parseFloat(lerp(a, b, t).toFixed(2)) }

function getContentDensity(form: FormData) {
  const expCount    = form.experience.filter(e => e.title || e.company).length
  const bulletCount = form.experience.reduce((acc, e) => acc + e.bullets.filter(b => b.trim()).length, 0)
  const hasPhoto    = !!form.personal.photo
  const hasEdu      = form.education.some(e => e.institution)
  const skillCount  = form.skills.length
  const summaryLen  = form.summary.length
  const hasHobbies  = !!form.hobbies.trim()
  const hasAchievements = !!form.achievements?.trim()

  // Density score 0–100
  let score = 0
  score += Math.min(expCount * 20, 40)
  score += Math.min(bulletCount * 4, 20)
  score += hasPhoto ? 8 : 0
  score += hasEdu ? 5 : 0
  score += Math.min(skillCount * 1.5, 10)
  score += summaryLen > 120 ? 10 : summaryLen > 60 ? 5 : 0
  score += hasHobbies ? 4 : 0
  score += hasAchievements ? 3 : 0
  score = Math.min(score, 100)

  // t = 0 at sparse (score=0), t = 1 at dense (score=100)
  const t = score / 100

  return {
    score,
    t,
    isSparse: score < 45,
    isLight:  score < 65,

    // ── Typography — all smooth ──────────────────────────────────────────
    // Body text: bigger when sparse so it fills space, tighter when dense
    fontSize:       lerpF(9.5,  7.5,  t),   // px — body copy
    bulletSize:     lerpF(9.0,  7.5,  t),   // px — bullet points
    secLabelSize:   lerpF(8.5,  7.0,  t),   // px — section headings
    lineHeight:     lerpF(1.95, 1.50, t),   // ratio — line spacing
    letterSpacing:  lerpF(0.04, 0.1,  t),   // em — section label tracking

    // ── Sizing ───────────────────────────────────────────────────────────
    nameSize:       lerpF(17,   13,   t),   // px — name in header
    titleSize:      lerpF(10,   8,    t),   // px — job title in header
    photoSize:      lerpR(68,   44,   t),   // px — avatar circle diameter

    // ── Spacing ──────────────────────────────────────────────────────────
    sectionGap:     lerpR(22,   8,    t),   // px — gap above each section
    headerPadV:     lerpR(26,   14,   t),   // px — header top/bottom padding
    headerPadH:     lerpR(22,   18,   t),   // px — header left/right padding
    bodyPad:        lerpR(20,   12,   t),   // px — main content padding

    // ── Layout ───────────────────────────────────────────────────────────
    sidebarWidth:   lerpR(155,  118,  t),   // px — sidebar column width

    // ── Content visibility ───────────────────────────────────────────────
    showHobbies:       hasHobbies || score < 58,
    showAchievements:  hasAchievements || score < 42,

    // ── AI generation hints ───────────────────────────────────────────────
    summaryTargetWords: lerpR(85, 42, t),
    minBulletsPerRole:  score < 45 ? 4 : 3,
  }
}

// ── SHARED HELPERS ────────────────────────────────────────────────────────────
function fmtDate(ym: string) {
  if (!ym) return ""
  const [y, m] = ym.split("-")
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[parseInt(m)] || ""} ${y}`
}

function initials(name: string) {
  const p = name.trim().split(" ")
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?"
}

// ── PLACEHOLDER DATA ──────────────────────────────────────────────────────────
const PH = {
  name: "Ahmed Hassan",
  title: "Finance Manager",
  email: "ahmed@email.com",
  phone: "+20 100 123 4567",
  location: "Cairo, Egypt",
  linkedin: "linkedin.com/in/ahmed",
  summary: "Experienced finance professional with 8+ years across banking and FMCG sectors in Egypt and the Gulf. Proven track record in financial planning, team leadership and stakeholder management across Cairo and the Gulf region. Consistently delivers operational improvements and measurable cost savings.",
  experience: [
    { company:"ABC Group", title:"Finance Manager", start:"2020-01", end:"", current:true, bullets:["Led financial reporting for EGP 50M portfolio across 3 business units, improving accuracy by 40%","Managed team of 6 accountants, reducing month-end close from 7 to 3 days","Built Power BI dashboards eliminating 12 hours of manual reporting per week"] },
    { company:"XYZ Bank", title:"Senior Accountant", start:"2017-03", end:"2019-12", current:false, bullets:["Prepared monthly management accounts for EGP 120M portfolio","Coordinated external audit with zero material misstatements for 3 consecutive years"] },
  ],
  education: [{ institution:"Cairo University", degree:"B.Sc. Accounting", field:"", startYear:"2012", endYear:"2016" }],
  skills: ["Financial Reporting","Budgeting","SAP","Excel Advanced","Team Leadership","IFRS","Cash Flow Mgmt"],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  hobbies: "Football, reading Arabic literature, photography",
  achievements: "CMA certified · Top performer award Q3 2022 · Implemented first automated reporting system",
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — EXECUTIVE DARK (dark left sidebar)
// ══════════════════════════════════════════════════════════════════════════════
function TplExecutive({ form, density }: { form: FormData; density: ReturnType<typeof getContentDensity> }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const location = f.personal.location || PH.location
  const linkedin = f.personal.linkedin || PH.linkedin
  const summary = f.summary || PH.summary
  const exps = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus = f.education.some(e => e.institution) ? f.education : PH.education
  const skills = f.skills.length > 0 ? f.skills : PH.skills
  const langs = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies = f.hobbies || (density.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (density.showAchievements ? PH.achievements : "")
  const { fontSize:fs, bulletSize:bs, secLabelSize:sls, lineHeight:lh, sectionGap:sg,
          nameSize:ns, titleSize:ts, photoSize:ph, headerPadV:hpv, headerPadH:hph,
          bodyPad:bp, sidebarWidth:sw, letterSpacing:lsp } = density

  const secLabel = (label: string) => (
    <div style={{ fontSize:`${sls}px`, fontWeight:700, color:"rgba(2,128,144,0.9)", letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, margin:`${sg}px 0 5px`, paddingBottom:"4px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
      {label}
    </div>
  )
  const mainSec = (label: string) => (
    <div style={{ fontSize:`${sls}px`, fontWeight:700, color:"#028090", letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, margin:`${sg}px 0 6px`, paddingBottom:"4px", borderBottom:"1px solid rgba(2,128,144,0.2)" }}>
      {label}
    </div>
  )

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"Georgia, serif" }}>
      {/* Dark sidebar — width scales with density */}
      <div style={{ width:`${sw}px`, flexShrink:0, background:"#0a1f24", padding:`${hpv}px ${Math.round(sw*0.09)}px`, display:"flex", flexDirection:"column" as const, overflow:"hidden" }}>
        {f.personal.photo ? (
          <img src={f.personal.photo} alt="" style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(2,128,144,0.5)", marginBottom:`${Math.round(ph*0.18)}px` }} />
        ) : (
          <div style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"50%", background:"rgba(2,128,144,0.25)", border:"1.5px solid rgba(2,128,144,0.4)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:`${Math.round(ph*0.18)}px`, fontSize:`${Math.round(ph*0.3)}px`, fontWeight:700, color:"rgba(255,255,255,0.6)", fontFamily:"sans-serif" }}>
            {initials(name)}
          </div>
        )}
        <div style={{ fontSize:`${ns}px`, fontWeight:700, color:"white", lineHeight:1.2, marginBottom:"3px" }}>{name}</div>
        <div style={{ fontSize:`${ts}px`, color:"rgba(168,213,209,0.8)", letterSpacing:".06em", fontFamily:"sans-serif", marginBottom:`${sg}px` }}>{title}</div>
        <div style={{ width:"24px", height:"2px", background:"#028090", marginBottom:`${sg}px` }} />
        {secLabel("Contact")}
        <div style={{ fontSize:`${fs}px`, color:"rgba(255,255,255,0.55)", lineHeight:lh, fontFamily:"sans-serif", marginBottom:"2px" }}>
          {email && <div>{email}</div>}
          {phone && <div>{phone}</div>}
          {location && <div>{location}</div>}
          {linkedin && <div style={{ color:"rgba(2,128,144,0.8)" }}>{linkedin.replace("https://","")}</div>}
        </div>
        {secLabel("Skills")}
        <div style={{ display:"flex", flexDirection:"column" as const, gap:"3px", marginBottom:"4px" }}>
          {skills.slice(0,8).map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"5px" }}>
              <div style={{ width:"3px", height:"3px", borderRadius:"50%", background:"#028090", flexShrink:0 }} />
              <span style={{ fontSize:`${fs}px`, color:"rgba(255,255,255,0.6)", fontFamily:"sans-serif" }}>{s}</span>
            </div>
          ))}
        </div>
        {secLabel("Languages")}
        <div style={{ fontSize:`${fs}px`, color:"rgba(255,255,255,0.6)", lineHeight:lh, fontFamily:"sans-serif", marginBottom:"4px" }}>
          {langs.filter(l=>l.lang).map((l,i)=>(
            <div key={i}><span style={{ fontWeight:600, color:"rgba(255,255,255,0.8)" }}>{l.lang}</span> <span style={{ color:"rgba(255,255,255,0.4)" }}>· {l.level}</span></div>
          ))}
        </div>
        {edus.filter(e=>e.institution).length > 0 && (<>
          {secLabel("Education")}
          {edus.filter(e=>e.institution).map((e,i)=>(
            <div key={i} style={{ marginBottom:"6px" }}>
              <div style={{ fontSize:"7.5px", fontWeight:700, color:"rgba(255,255,255,0.8)", fontFamily:"sans-serif" }}>{e.degree}</div>
              {e.field && <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.45)", fontFamily:"sans-serif" }}>{e.field}</div>}
              <div style={{ fontSize:"7px", color:"rgba(2,128,144,0.7)", fontFamily:"sans-serif" }}>{e.institution}</div>
              {e.endYear && <div style={{ fontSize:"6.5px", color:"rgba(255,255,255,0.3)", fontFamily:"sans-serif" }}>{e.endYear}</div>}
            </div>
          ))}
        </>)}
        {hobbies && (<>
          {secLabel("Interests")}
          <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.45)", lineHeight:1.7, fontFamily:"sans-serif" }}>
            {hobbies.split(",").map(h=>h.trim()).map((h,i)=><div key={i}>{h}</div>)}
          </div>
        </>)}
      </div>
      {/* Main content */}
      <div style={{ flex:1, padding:`${hpv}px ${bp}px`, overflow:"hidden" }}>
        {mainSec("Professional Summary")}
        <p style={{ fontSize:`${fs}px`, color:"#374151", lineHeight:lh, marginBottom:`${sg}px` }}>{summary}</p>
        {mainSec("Work Experience")}
        {exps.filter(e=>e.title||e.company).map((e,i)=>(
          <div key={i} style={{ marginBottom:`${sg + 2}px` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"3px" }}>
              <div>
                <div style={{ fontSize:`${fs + 1}px`, fontWeight:700, color:"#0a1f24" }}>{e.title}</div>
                <div style={{ fontSize:`${fs}px`, color:"#028090", fontWeight:600 }}>{e.company}</div>
              </div>
              {(e.start||e.end) && (
                <div style={{ fontSize:`${fs - 0.5}px`, color:"#9ca3af", flexShrink:0, marginLeft:"8px", fontFamily:"sans-serif" }}>
                  {fmtDate(e.start)}{" – "}{e.current ? "Present" : fmtDate(e.end)}
                </div>
              )}
            </div>
            {e.bullets.filter(b=>b.trim()).map((b,j)=>(
              <div key={j} style={{ display:"flex", gap:"5px", marginTop:"3px" }}>
                <span style={{ color:"#028090", fontSize:`${bs}px`, flexShrink:0, marginTop:"1px" }}>▸</span>
                <p style={{ fontSize:`${bs}px`, color:"#4b5563", lineHeight:lh, margin:0 }}>{b}</p>
              </div>
            ))}
          </div>
        ))}
        {achievements && (
          <div style={{ background:"#f0fdf4", borderRadius:"6px", padding:"10px 12px", borderLeft:"3px solid #028090", marginTop:`${sg}px` }}>
            <div style={{ fontSize:"8px", fontWeight:700, color:"#0a1f24", marginBottom:"4px" }}>Key achievements</div>
            <div style={{ fontSize:"7.5px", color:"#374151", lineHeight:1.75 }}>
              {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i)=>(
                <div key={i} style={{ display:"flex", gap:"5px", marginBottom:"2px" }}>
                  <span style={{ color:"#028090", flexShrink:0 }}>✓</span>{a}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — MODERN STRIPE (full-width header, skill pills, single col)
// ══════════════════════════════════════════════════════════════════════════════
function TplModern({ form, density }: { form: FormData; density: ReturnType<typeof getContentDensity> }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const location = f.personal.location || PH.location
  const summary = f.summary || PH.summary
  const exps = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus = f.education.some(e => e.institution) ? f.education : PH.education
  const skills = f.skills.length > 0 ? f.skills : PH.skills
  const langs = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies = f.hobbies || (density.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (density.showAchievements ? PH.achievements : "")
  const { fontSize:fs, bulletSize:bs, secLabelSize:sls, lineHeight:lh, sectionGap:sg,
          nameSize:ns, titleSize:ts, photoSize:ph, headerPadV:hpv, headerPadH:hph,
          bodyPad:bp, letterSpacing:lsp } = density

  const secLine = (label: string) => (
    <div style={{ fontSize:`${sls}px`, fontWeight:700, color:"#028090", letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, margin:`${sg}px 0 6px`, paddingBottom:"4px", borderBottom:"2px solid #028090" }}>
      {label}
    </div>
  )

  return (
    <div style={{ fontFamily:"Georgia, serif", height:"100%" }}>
      <div style={{ background:"#028090", padding:`${hpv}px ${hph}px 0` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:`${sg}px` }}>
          {f.personal.photo ? (
            <img src={f.personal.photo} alt="" style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.3)", flexShrink:0 }} />
          ) : (
            <div style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"50%", background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:`${Math.round(ph*0.32)}px`, fontWeight:700, color:"rgba(255,255,255,0.7)", flexShrink:0, fontFamily:"sans-serif" }}>
              {initials(name)}
            </div>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:`${ns}px`, fontWeight:700, color:"white", marginBottom:"3px" }}>{name}</div>
            <div style={{ fontSize:`${ts}px`, color:"rgba(255,255,255,0.75)", letterSpacing:".08em", fontFamily:"sans-serif" }}>{title.toUpperCase()}</div>
            <div style={{ display:"flex", gap:"14px", marginTop:"5px", flexWrap:"wrap" as const }}>
              {email && <span style={{ fontSize:`${fs - 0.5}px`, color:"rgba(255,255,255,0.55)", fontFamily:"sans-serif" }}>{email}</span>}
              {phone && <span style={{ fontSize:`${fs - 0.5}px`, color:"rgba(255,255,255,0.55)", fontFamily:"sans-serif" }}>{phone}</span>}
              {location && <span style={{ fontSize:`${fs - 0.5}px`, color:"rgba(255,255,255,0.55)", fontFamily:"sans-serif" }}>{location}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" as const, paddingBottom:"14px" }}>
          {skills.slice(0,10).map((s,i)=>(
            <span key={i} style={{ background:"rgba(255,255,255,0.15)", color:"white", fontSize:"7.5px", padding:"3px 9px", borderRadius:"99px", fontFamily:"sans-serif", fontWeight:600 }}>{s}</span>
          ))}
        </div>
      </div>
      <div style={{ padding:`${bp}px ${hph}px`, overflow:"hidden" }}>
        {secLine("Professional Summary")}
        <p style={{ fontSize:`${fs}px`, color:"#374151", lineHeight:lh, marginBottom:`${sg}px` }}>{summary}</p>
        {secLine("Work Experience")}
        {exps.filter(e=>e.title||e.company).map((e,i)=>(
          <div key={i} style={{ marginBottom:`${sg + 2}px` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"3px" }}>
              <div>
                <div style={{ fontSize:`${fs + 1}px`, fontWeight:700, color:"#0a1f24" }}>{e.title}</div>
                <div style={{ fontSize:`${fs}px`, color:"#028090", fontWeight:600 }}>{e.company}</div>
              </div>
              {(e.start||e.end) && (
                <div style={{ fontSize:`${fs - 0.5}px`, color:"#9ca3af", flexShrink:0, marginLeft:"8px", fontFamily:"sans-serif" }}>
                  {fmtDate(e.start)}{" – "}{e.current ? "Present" : fmtDate(e.end)}
                </div>
              )}
            </div>
            {e.bullets.filter(b=>b.trim()).map((b,j)=>(
              <div key={j} style={{ display:"flex", gap:"5px", marginTop:"3px" }}>
                <span style={{ color:"#028090", fontSize:`${bs}px`, flexShrink:0, marginTop:"1px" }}>▸</span>
                <p style={{ fontSize:`${bs}px`, color:"#4b5563", lineHeight:lh, margin:0 }}>{b}</p>
              </div>
            ))}
          </div>
        ))}
        {achievements && (
          <div style={{ background:"#f0fdf4", borderRadius:"6px", padding:"10px 12px", borderLeft:"3px solid #028090", marginBottom:`${sg}px` }}>
            <div style={{ fontSize:"8px", fontWeight:700, color:"#0a1f24", marginBottom:"4px" }}>Key achievements</div>
            <div style={{ fontSize:"7.5px", color:"#374151", lineHeight:1.75 }}>
              {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i)=>(
                <div key={i} style={{ display:"flex", gap:"5px", marginBottom:"2px" }}><span style={{ color:"#028090", flexShrink:0 }}>✓</span>{a}</div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginTop:`${sg}px` }}>
          <div>
            {secLine("Education")}
            {edus.filter(e=>e.institution).map((e,i)=>(
              <div key={i} style={{ marginBottom:"8px" }}>
                <div style={{ fontSize:"8.5px", fontWeight:700, color:"#0a1f24" }}>{e.degree}{e.field ? ` — ${e.field}` : ""}</div>
                <div style={{ fontSize:"8px", color:"#6b7280" }}>{e.institution}{e.endYear ? ` · ${e.endYear}` : ""}</div>
              </div>
            ))}
          </div>
          <div>
            {secLine("Languages")}
            {langs.filter(l=>l.lang).map((l,i)=>(
              <div key={i} style={{ fontSize:"8px", color:"#374151", lineHeight:1.9 }}>
                <span style={{ fontWeight:600 }}>{l.lang}</span> <span style={{ color:"#9ca3af" }}>· {l.level}</span>
              </div>
            ))}
            {hobbies && (<>
              {secLine("Interests")}
              <div style={{ fontSize:"7.5px", color:"#6b7280", lineHeight:1.7 }}>{hobbies}</div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — MINIMAL EDGE (white, typographic, left border accent, 2-col)
// ══════════════════════════════════════════════════════════════════════════════
function TplMinimal({ form, density }: { form: FormData; density: ReturnType<typeof getContentDensity> }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const location = f.personal.location || PH.location
  const linkedin = f.personal.linkedin || PH.linkedin
  const summary = f.summary || PH.summary
  const exps = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus = f.education.some(e => e.institution) ? f.education : PH.education
  const skills = f.skills.length > 0 ? f.skills : PH.skills
  const langs = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies = f.hobbies || (density.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (density.showAchievements ? PH.achievements : "")
  const { fontSize:fs, bulletSize:bs, secLabelSize:sls, lineHeight:lh, sectionGap:sg,
          nameSize:ns, titleSize:ts, photoSize:ph, headerPadV:hpv, headerPadH:hph,
          bodyPad:bp, sidebarWidth:sw, letterSpacing:lsp } = density

  const sec = (label: string) => (
    <div style={{ fontSize:`${sls}px`, fontWeight:700, color:"#028090", letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, margin:`${sg}px 0 7px`, paddingBottom:"4px", borderBottom:"2px solid #028090" }}>
      {label}
    </div>
  )

  return (
    <div style={{ fontFamily:"Georgia, serif", height:"100%" }}>
      <div style={{ padding:`${hpv}px ${hph}px ${Math.round(hpv*0.6)}px`, borderBottom:"1px solid #e8ecef" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          {f.personal.photo && (
            <img src={f.personal.photo} alt="" style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"4px", objectFit:"cover", border:"1px solid #e5e7eb", flexShrink:0 }} />
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:`${ns + 6}px`, fontWeight:700, color:"#0a1f24", letterSpacing:"-0.5px", lineHeight:1.1, marginBottom:"4px" }}>{name}</div>
            <div style={{ fontSize:`${ts + 1}px`, color:"#028090", letterSpacing:".12em", textTransform:"uppercase" as const, fontFamily:"sans-serif", fontWeight:600, marginBottom:`${sg * 0.4}px` }}>{title}</div>
            <div style={{ display:"flex", gap:"14px", flexWrap:"wrap" as const }}>
              {[email, phone, location, linkedin].filter(Boolean).map((c,i)=>(
                <span key={i} style={{ fontSize:`${fs - 0.5}px`, color:"#6b7280", fontFamily:"sans-serif" }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`1fr ${sw}px`, gap:"0", height:`calc(100% - ${hpv * 2 + 60}px)` }}>
        <div style={{ padding:`${bp}px ${bp + 4}px`, borderRight:"1px solid #e8ecef", overflow:"hidden" }}>
          {sec("Experience")}
          {exps.filter(e=>e.title||e.company).map((e,i)=>(
            <div key={i} style={{ marginBottom:`${sg + 2}px`, paddingLeft:"12px", borderLeft:"2px solid #028090" }}>
              <div style={{ fontSize:`${fs + 1}px`, fontWeight:700, color:"#0a1f24" }}>{e.title}</div>
              <div style={{ fontSize:`${fs}px`, color:"#028090", fontWeight:600, marginBottom:"3px" }}>
                {e.company}{(e.start||e.end) && <span style={{ color:"#9ca3af", fontWeight:400, fontFamily:"sans-serif" }}> · {fmtDate(e.start)} – {e.current ? "Present" : fmtDate(e.end)}</span>}
              </div>
              {e.bullets.filter(b=>b.trim()).map((b,j)=>(
                <div key={j} style={{ display:"flex", gap:"4px", marginTop:"2px" }}>
                  <span style={{ color:"#028090", fontSize:`${bs}px`, flexShrink:0 }}>▸</span>
                  <p style={{ fontSize:`${bs}px`, color:"#4b5563", lineHeight:lh, margin:0 }}>{b}</p>
                </div>
              ))}
            </div>
          ))}
          {achievements && (
            <div style={{ background:"#f8fafc", borderRadius:"5px", padding:"8px 10px", borderLeft:"2px solid #028090", marginTop:`${sg}px` }}>
              <div style={{ fontSize:"7.5px", fontWeight:700, color:"#0a1f24", marginBottom:"3px" }}>Key achievements</div>
              {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i)=>(
                <div key={i} style={{ fontSize:"7.5px", color:"#4b5563", lineHeight:1.7, display:"flex", gap:"4px" }}><span style={{ color:"#028090" }}>✓</span>{a}</div>
              ))}
            </div>
          )}
          {sec("Summary")}
          <p style={{ fontSize:"8px", color:"#374151", lineHeight:lh }}>{summary}</p>
        </div>
        <div style={{ padding:"16px 14px", overflow:"hidden" }}>
          {sec("Skills")}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:"3px", marginBottom:`${sg}px` }}>
            {skills.map((s,i)=>(
              <div key={i} style={{ fontSize:"7.5px", color:"#374151", fontFamily:"sans-serif", padding:"3px 0", borderBottom:"0.5px solid #f3f4f6" }}>{s}</div>
            ))}
          </div>
          {sec("Education")}
          {edus.filter(e=>e.institution).map((e,i)=>(
            <div key={i} style={{ marginBottom:"8px" }}>
              <div style={{ fontSize:"8px", fontWeight:700, color:"#0a1f24" }}>{e.degree}</div>
              {e.field && <div style={{ fontSize:"7.5px", color:"#6b7280" }}>{e.field}</div>}
              <div style={{ fontSize:"7.5px", color:"#028090" }}>{e.institution}</div>
              {e.endYear && <div style={{ fontSize:"7px", color:"#9ca3af" }}>{e.endYear}</div>}
            </div>
          ))}
          {sec("Languages")}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:"4px", marginBottom:`${sg}px` }}>
            {langs.filter(l=>l.lang).map((l,i)=>(
              <div key={i} style={{ fontSize:"7.5px", color:"#374151", fontFamily:"sans-serif" }}>
                <span style={{ fontWeight:600 }}>{l.lang}</span> · {l.level}
              </div>
            ))}
          </div>
          {hobbies && (<>
            {sec("Interests")}
            <div style={{ fontSize:"7px", color:"#6b7280", lineHeight:1.7 }}>
              {hobbies.split(",").map(h=>h.trim()).map((h,i)=><div key={i}>{h}</div>)}
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — BOLD SPLIT (40% dark brand panel, 60% white content)
// ══════════════════════════════════════════════════════════════════════════════
function TplBold({ form, density }: { form: FormData; density: ReturnType<typeof getContentDensity> }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const location = f.personal.location || PH.location
  const summary = f.summary || PH.summary
  const exps = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus = f.education.some(e => e.institution) ? f.education : PH.education
  const skills = f.skills.length > 0 ? f.skills : PH.skills
  const langs = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies = f.hobbies || (density.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (density.showAchievements ? PH.achievements : "")
  const { fontSize:fs, bulletSize:bs, secLabelSize:sls, lineHeight:lh, sectionGap:sg,
          nameSize:ns, titleSize:ts, photoSize:ph, headerPadV:hpv, headerPadH:hph,
          bodyPad:bp, sidebarWidth:sw, letterSpacing:lsp } = density

  const skillLevels = [92,85,95,88,80,78,83,72]

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"Georgia, serif" }}>
      {/* Bold dark left panel — width scales */}
      <div style={{ width:`${sw + 30}px`, flexShrink:0, background:"#3D5A4E", padding:`${hpv}px ${Math.round((sw+30)*0.1)}px`, display:"flex", flexDirection:"column" as const, overflow:"hidden" }}>
        {f.personal.photo ? (
          <img src={f.personal.photo} alt="" style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"10px", objectFit:"cover", border:"1.5px solid rgba(255,255,255,0.2)", marginBottom:`${Math.round(ph*0.2)}px` }} />
        ) : (
          <div style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"10px", background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:`${Math.round(ph*0.3)}px`, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:`${Math.round(ph*0.2)}px`, fontFamily:"sans-serif" }}>
            {initials(name)}
          </div>
        )}
        <div style={{ fontSize:`${ns}px`, fontWeight:700, color:"white", lineHeight:1.2, marginBottom:"4px" }}>{name}</div>
        <div style={{ width:"28px", height:"2.5px", background:"#028090", margin:`${Math.round(sg*0.5)}px 0` }} />
        <div style={{ fontSize:`${ts}px`, color:"rgba(255,255,255,0.55)", letterSpacing:".1em", fontFamily:"sans-serif", marginBottom:`${sg}px` }}>{title.toUpperCase()}</div>
        <div style={{ fontSize:`${sls}px`, color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, marginBottom:"6px" }}>Contact</div>
        <div style={{ fontSize:`${fs}px`, color:"rgba(255,255,255,0.55)", lineHeight:lh, fontFamily:"sans-serif", marginBottom:`${sg}px` }}>
          {email && <div>{email}</div>}{phone && <div>{phone}</div>}{location && <div>{location}</div>}
        </div>
        <div style={{ fontSize:`${sls}px`, color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, marginBottom:"10px" }}>Skills</div>
        <div style={{ display:"flex", flexDirection:"column" as const, gap:"7px", marginBottom:"14px" }}>
          {skills.slice(0,7).map((s,i)=>(
            <div key={i}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                <span style={{ fontSize:"7px", color:"rgba(255,255,255,0.55)", fontFamily:"sans-serif" }}>{s}</span>
              </div>
              <div style={{ height:"3px", background:"rgba(255,255,255,0.1)", borderRadius:"2px" }}>
                <div style={{ height:"3px", background:"#028090", borderRadius:"2px", width:`${skillLevels[i % skillLevels.length]}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:"7.5px", color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:"6px" }}>Languages</div>
        <div style={{ fontSize:"7.5px", color:"rgba(255,255,255,0.55)", lineHeight:1.9, fontFamily:"sans-serif", marginBottom:"14px" }}>
          {langs.filter(l=>l.lang).map((l,i)=>(
            <div key={i}><span style={{ fontWeight:600, color:"rgba(255,255,255,0.75)" }}>{l.lang}</span> · {l.level}</div>
          ))}
        </div>
        {edus.filter(e=>e.institution).length > 0 && (<>
          <div style={{ fontSize:"7.5px", color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:"6px" }}>Education</div>
          {edus.filter(e=>e.institution).map((e,i)=>(
            <div key={i} style={{ marginBottom:"6px" }}>
              <div style={{ fontSize:"7.5px", fontWeight:700, color:"rgba(255,255,255,0.75)", fontFamily:"sans-serif" }}>{e.degree}</div>
              <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.4)", fontFamily:"sans-serif" }}>{e.institution}{e.endYear ? ` · ${e.endYear}` : ""}</div>
            </div>
          ))}
        </>)}
        {hobbies && (<>
          <div style={{ fontSize:"7.5px", color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:"6px", marginTop:`${sg}px` }}>Interests</div>
          <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.45)", lineHeight:1.7, fontFamily:"sans-serif" }}>
            {hobbies.split(",").map(h=>h.trim()).map((h,i)=><div key={i}>{h}</div>)}
          </div>
        </>)}
      </div>
      {/* White right content */}
      <div style={{ flex:1, background:"white", padding:`${hpv}px ${bp}px`, overflow:"hidden" }}>
        <p style={{ fontSize:`${fs}px`, color:"#4b5563", lineHeight:lh, paddingBottom:`${sg}px`, borderBottom:"1px solid #f0f0f0", marginBottom:`${sg}px` }}>{summary}</p>
        <div style={{ fontSize:`${sls}px`, fontWeight:700, color:"#3D5A4E", letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, marginBottom:`${sg}px` }}>Experience</div>
        {exps.filter(e=>e.title||e.company).map((e,i)=>(
          <div key={i} style={{ marginBottom:`${sg + 2}px` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"3px" }}>
              <div>
                <div style={{ fontSize:`${fs + 1}px`, fontWeight:700, color:"#0a1f24" }}>{e.title}</div>
                <div style={{ fontSize:`${fs}px`, color:"#3D5A4E", fontWeight:600 }}>{e.company}</div>
              </div>
              {(e.start||e.end) && (
                <div style={{ fontSize:`${fs - 0.5}px`, color:"#9ca3af", flexShrink:0, marginLeft:"8px", fontFamily:"sans-serif" }}>
                  {fmtDate(e.start)}{" – "}{e.current ? "Present" : fmtDate(e.end)}
                </div>
              )}
            </div>
            {e.bullets.filter(b=>b.trim()).map((b,j)=>(
              <div key={j} style={{ display:"flex", gap:"5px", marginTop:"3px" }}>
                <span style={{ color:"#3D5A4E", fontSize:`${bs}px`, flexShrink:0, marginTop:"1px" }}>▸</span>
                <p style={{ fontSize:`${bs}px`, color:"#4b5563", lineHeight:lh, margin:0 }}>{b}</p>
              </div>
            ))}
          </div>
        ))}
        {achievements && (
          <div style={{ background:"#f4f8f6", borderRadius:"6px", padding:"10px 12px", borderLeft:"3px solid #3D5A4E", marginTop:`${sg}px` }}>
            <div style={{ fontSize:"8px", fontWeight:700, color:"#0a1f24", marginBottom:"4px" }}>Key achievements</div>
            {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i)=>(
              <div key={i} style={{ fontSize:"7.5px", color:"#374151", lineHeight:1.7, display:"flex", gap:"4px" }}><span style={{ color:"#3D5A4E" }}>✓</span>{a}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — INFOGRAPHIC (timeline spine, skill bars, data-forward)
// ══════════════════════════════════════════════════════════════════════════════
function TplInfographic({ form, density }: { form: FormData; density: ReturnType<typeof getContentDensity> }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const location = f.personal.location || PH.location
  const summary = f.summary || PH.summary
  const exps = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus = f.education.some(e => e.institution) ? f.education : PH.education
  const skills = f.skills.length > 0 ? f.skills : PH.skills
  const langs = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const achievements = f.achievements || (density.showAchievements ? PH.achievements : "")
  const { fontSize:fs, bulletSize:bs, secLabelSize:sls, lineHeight:lh, sectionGap:sg,
          nameSize:ns, titleSize:ts, photoSize:ph, headerPadV:hpv, headerPadH:hph,
          bodyPad:bp, letterSpacing:lsp } = density
  const totalYears = exps.filter(e=>e.title).length > 0 ? `${exps.filter(e=>e.title).length * 3}+` : "8+"
  const skillBars = [92,85,95,88,80,78,83,72,76,68]
  const langBars: Record<string,number> = { Native:100, Fluent:88, Advanced:72, Intermediate:55, Basic:30 }

  const sec = (label: string) => (
    <div style={{ fontSize:`${sls}px`, fontWeight:700, color:"#028090", letterSpacing:`${lsp}em`, textTransform:"uppercase" as const, margin:`${sg}px 0 8px`, display:"flex", alignItems:"center", gap:"8px" }}>
      {label}<div style={{ flex:1, height:"1px", background:"#e5e7eb" }} />
    </div>
  )

  return (
    <div style={{ fontFamily:"Georgia, serif", height:"100%" }}>
      <div style={{ background:"#0a1f24", padding:`${hpv}px ${hph}px`, display:"flex", alignItems:"center", gap:"14px" }}>
        {f.personal.photo ? (
          <img src={f.personal.photo} alt="" style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"50%", objectFit:"cover", border:"2px solid #028090", flexShrink:0 }} />
        ) : (
          <div style={{ width:`${ph}px`, height:`${ph}px`, borderRadius:"50%", background:"rgba(2,128,144,0.25)", border:"1.5px solid #028090", display:"flex", alignItems:"center", justifyContent:"center", fontSize:`${Math.round(ph*0.3)}px`, fontWeight:700, color:"rgba(255,255,255,0.7)", flexShrink:0, fontFamily:"sans-serif" }}>
            {initials(name)}
          </div>
        )}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:`${ns}px`, fontWeight:700, color:"white", marginBottom:"2px" }}>{name}</div>
          <div style={{ fontSize:`${ts}px`, color:"#a8d5d1", letterSpacing:".1em", fontFamily:"sans-serif" }}>{title.toUpperCase()}</div>
          <div style={{ fontSize:`${fs - 0.5}px`, color:"rgba(255,255,255,0.4)", fontFamily:"sans-serif", marginTop:"4px" }}>
            {[email, location].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ textAlign:"right" as const }}>
          <div style={{ fontSize:"22px", fontWeight:700, color:"#028090" }}>{totalYears}</div>
          <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.35)", fontFamily:"sans-serif" }}>Years exp.</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0", height:"calc(100% - 78px)" }}>
        <div style={{ padding:"14px 16px", borderRight:"1px solid #e8ecef", overflow:"hidden" }}>
          {sec("Experience")}
          {exps.filter(e=>e.title||e.company).map((e,i)=>(
            <div key={i} style={{ display:"flex", gap:"8px", marginBottom:`${sg}px` }}>
              <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", flexShrink:0 }}>
                <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: i===0 ? "#028090" : "#9ca3af", border:"1.5px solid white", boxShadow:`0 0 0 1px ${i===0?"#028090":"#9ca3af"}`, marginTop:"2px", flexShrink:0 }} />
                {i < exps.filter(e=>e.title||e.company).length - 1 && (
                  <div style={{ width:"1.5px", flex:1, background:"#e5e7eb", margin:"4px 0" }} />
                )}
              </div>
              <div style={{ paddingBottom:"4px" }}>
                <div style={{ fontSize:"8.5px", fontWeight:700, color:"#0a1f24" }}>{e.title}</div>
                <div style={{ fontSize:"7.5px", color:"#028090", fontWeight:600, marginBottom:"3px" }}>
                  {e.company} <span style={{ color:"#9ca3af", fontWeight:400, fontFamily:"sans-serif" }}>
                    {fmtDate(e.start)}{(e.start||e.end||e.current) ? ` – ${e.current?"Present":fmtDate(e.end)}` : ""}
                  </span>
                </div>
                {e.bullets.filter(b=>b.trim()).map((b,j)=>(
                  <div key={j} style={{ fontSize:`${bs - 0.5}px`, color:"#6b7280", lineHeight:lh * 0.9, paddingLeft:"6px", borderLeft:"1.5px solid #f0f0f0", marginBottom:"2px" }}>{b}</div>
                ))}
              </div>
            </div>
          ))}
          {sec("Education")}
          {edus.filter(e=>e.institution).map((e,i)=>(
            <div key={i} style={{ marginBottom:"6px" }}>
              <div style={{ fontSize:"8.5px", fontWeight:700, color:"#0a1f24" }}>{e.degree}{e.field ? ` — ${e.field}` : ""}</div>
              <div style={{ fontSize:"7.5px", color:"#028090" }}>{e.institution}{e.endYear ? ` · ${e.endYear}` : ""}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"14px 16px", overflow:"hidden" }}>
          {sec("Core skills")}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:"6px", marginBottom:`${sg}px` }}>
            {skills.map((s,i)=>(
              <div key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"2px" }}>
                  <span style={{ fontSize:"7.5px", color:"#374151", fontFamily:"sans-serif" }}>{s}</span>
                  <span style={{ fontSize:"7px", color:"#028090", fontWeight:700, fontFamily:"sans-serif" }}>{skillBars[i % skillBars.length]}%</span>
                </div>
                <div style={{ height:"3.5px", background:"#f3f4f6", borderRadius:"2px" }}>
                  <div style={{ height:"3.5px", background:"#028090", borderRadius:"2px", width:`${skillBars[i % skillBars.length]}%` }} />
                </div>
              </div>
            ))}
          </div>
          {sec("Languages")}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:"6px", marginBottom:`${sg}px` }}>
            {langs.filter(l=>l.lang).map((l,i)=>(
              <div key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"2px" }}>
                  <span style={{ fontSize:"7.5px", color:"#374151", fontFamily:"sans-serif", fontWeight:600 }}>{l.lang}</span>
                  <span style={{ fontSize:"7px", color:"#9ca3af", fontFamily:"sans-serif" }}>{l.level}</span>
                </div>
                <div style={{ height:"3px", background:"#f3f4f6", borderRadius:"2px" }}>
                  <div style={{ height:"3px", background:"#028090", borderRadius:"2px", width:`${langBars[l.level] || 60}%` }} />
                </div>
              </div>
            ))}
          </div>
          {sec("Summary")}
          <p style={{ fontSize:"7.5px", color:"#4b5563", lineHeight:lh }}>{summary}</p>
          {achievements && (<>
            {sec("Achievements")}
            {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i)=>(
              <div key={i} style={{ fontSize:"7.5px", color:"#374151", lineHeight:1.7, display:"flex", gap:"4px", marginBottom:"2px" }}>
                <span style={{ color:"#028090", flexShrink:0 }}>✓</span>{a}
              </div>
            ))}
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── TEMPLATE REGISTRY ─────────────────────────────────────────────────────────
const TEMPLATES = [
  { id:"executive",   name:"Executive",     sub:"C-Suite · Finance · Legal",      component: TplExecutive },
  { id:"modern",      name:"Modern Stripe",  sub:"HR · Sales · Marketing",         component: TplModern },
  { id:"minimal",     name:"Minimal Edge",   sub:"Tech · Engineering · Intl",      component: TplMinimal },
  { id:"bold",        name:"Bold Split",     sub:"Creative · Consulting",          component: TplBold },
  { id:"infographic", name:"Infographic",    sub:"Data · Strategy · Tech",         component: TplInfographic },
]

// ── CV PREVIEW WRAPPER ────────────────────────────────────────────────────────
function CVPreview({ form, templateId }: { form: FormData; templateId: string }) {
  const density = getContentDensity(form)
  const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]
  const TplComponent = tpl.component
  return (
    <div style={{ background:"#1a2228", padding:"16px", borderRadius:"10px", height:"100%", display:"flex", flexDirection:"column" as const }}>
      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px" }}>
        <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e" }} />
        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" as const }}>Live preview</span>
        <span style={{ marginLeft:"auto", fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>A4</span>
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
        <div id="cv-preview-print" style={{
          background:"white",
          borderRadius:"3px",
          boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
          overflow:"hidden",
          width:"100%",
          aspectRatio:"210/297",
          position:"relative" as const,
        }}>
          <TplComponent form={form} density={density} />
        </div>
      </div>
      {density.isSparse && (
        <div style={{ marginTop:"8px", padding:"6px 10px", background:"rgba(2,128,144,0.15)", borderRadius:"6px", fontSize:"10px", color:"rgba(2,128,144,0.9)", display:"flex", alignItems:"center", gap:"6px" }}>
          <Sparkles size={10} /> AI is expanding your content to fill the page beautifully
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CVBuilderPage() {
  const [activeTab, setActiveTab] = useState<"builder"|"reviewer">("builder")
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("tab") === "reviewer") setActiveTab("reviewer")
    }
  }, [])

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [selectedTemplate, setSelectedTemplate] = useState("executive")
  const [generating, setGenerating] = useState(false)
  const [generatingBullet, setGeneratingBullet] = useState<number|null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [reviewFile, setReviewFile] = useState<File|null>(null)
  const [reviewText, setReviewText] = useState<string>("")
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<any>(null)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewEmail, setReviewEmail] = useState("")
  const [reviewPassword, setReviewPassword] = useState("")
  const [reviewAuthError, setReviewAuthError] = useState("")
  const photoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const currentStepId = STEPS[step].id

  function setPersonal(k: keyof FormData["personal"], v: string) {
    setForm(f => ({ ...f, personal: { ...f.personal, [k]: v } }))
  }

  async function generateSummary() {
    if (!form.personal.title) return
    setGenerating(true)
    const density = getContentDensity(form)
    try {
      const res = await fetch("/api/generate-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          type:"summary",
          title: form.personal.title,
          level: form.level,
          function: form.job_function,
          experience: form.experience,
          skills: form.skills,
          location: form.personal.location,
          targetWords: density.summaryTargetWords,
          isSparse: density.isSparse,
        })
      })
      const data = await res.json()
      if (data.text) setForm(f => ({ ...f, summary: data.text }))
    } catch {}
    setGenerating(false)
  }

  async function generateBullets(idx: number) {
    const exp = form.experience[idx]
    if (!exp.title || !exp.company) return
    setGeneratingBullet(idx)
    const density = getContentDensity(form)
    try {
      const res = await fetch("/api/generate-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          type:"bullets",
          title:exp.title,
          company:exp.company,
          roughBullets:exp.bullets.filter(b=>b.trim()),
          minBullets: density.minBulletsPerRole,
        })
      })
      const data = await res.json()
      if (data.bullets) {
        const updated = [...form.experience]
        updated[idx] = { ...updated[idx], bullets: data.bullets }
        setForm(f => ({ ...f, experience: updated }))
      }
    } catch {}
    setGeneratingBullet(null)
  }

  async function generateAchievements() {
    if (!form.personal.title) return
    try {
      const res = await fetch("/api/generate-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          type:"achievements",
          title: form.personal.title,
          level: form.level,
          function: form.job_function,
          experience: form.experience,
        })
      })
      const data = await res.json()
      if (data.text) setForm(f => ({ ...f, achievements: data.text }))
    } catch {}
  }

  function addExp() { setForm(f => ({ ...f, experience: [...f.experience, { company:"", title:"", start:"", end:"", current:false, bullets:[""] }] })) }
  function removeExp(i: number) { setForm(f => ({ ...f, experience: f.experience.filter((_,idx) => idx !== i) })) }
  function updateExp(i: number, k: string, v: any) {
    const updated = [...form.experience]; updated[i] = { ...updated[i], [k]: v }
    setForm(f => ({ ...f, experience: updated }))
  }
  function updateBullet(ei: number, bi: number, v: string) {
    const updated = [...form.experience]; const bullets = [...updated[ei].bullets]
    bullets[bi] = v; updated[ei] = { ...updated[ei], bullets }
    setForm(f => ({ ...f, experience: updated }))
  }
  function addEdu() { setForm(f => ({ ...f, education: [...f.education, { institution:"", degree:"", field:"", startYear:"", endYear:"" }] })) }
  function updateEdu(i: number, k: string, v: string) {
    const updated = [...form.education]; updated[i] = { ...updated[i], [k]: v }
    setForm(f => ({ ...f, education: updated }))
  }
  function toggleSkill(s: string) {
    setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }))
  }
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPersonal("photo", ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function triggerPDFDownload() {
    if (typeof window === "undefined") return
    const style = document.createElement("style")
    style.innerHTML = `@media print { body * { visibility:hidden } #cv-preview-print, #cv-preview-print * { visibility:visible } #cv-preview-print { position:fixed;left:0;top:0;width:210mm;height:297mm;box-shadow:none;border-radius:0 } }`
    document.head.appendChild(style)
    window.print()
    setTimeout(() => document.head.removeChild(style), 1000)
  }

  async function handleSaveAndDownload() {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setShowSignup(true); return }
    setSaving(true)
    try {
      const { data: upserted } = await supabase.from("candidates").upsert({
        user_id: user.id,
        full_name: form.personal.name,
        email: form.personal.email || user.email,
        phone: form.personal.phone,
        location: form.personal.location,
        nationality: form.personal.nationality,
        job_function: form.job_function,
        level: form.level,
        cv_summary: form.summary,
        skills: form.skills,
        source: "cv_builder",
        template_used: selectedTemplate,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("id").single()

      // Auto-process: extract structured profile + embedding in background
      // Build a text representation of the CV from form data
      const candidateId = upserted?.id
      if (candidateId) {
        const cvTextFromForm = [
          form.personal.name,
          form.personal.title,
          form.level,
          form.job_function,
          form.summary,
          form.experience.map(e =>
            `${e.title} at ${e.company}: ${e.bullets.filter(b=>b.trim()).join(". ")}`
          ).join("\n"),
          form.skills.join(", "),
          form.education.map(e => `${e.degree} ${e.field} ${e.institution}`).join(", "),
          form.languages.map(l => `${l.lang} ${l.level}`).join(", "),
        ].filter(Boolean).join("\n")

        // Fire and forget — don't block the user
        fetch("/api/extract-structured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId, cv_text: cvTextFromForm })
        }).then(() => fetch("/api/generate-embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId, text: cvTextFromForm })
        })).catch(() => {})
      }

      triggerPDFDownload()
      setSaved(true)
      window.location.href = "/cv-builder/success"
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  async function handleSignupAndSave() {
    setAuthLoading(true); setAuthError("")
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setAuthError(error.message); setAuthLoading(false); return }
    setShowSignup(false)
    await handleSaveAndDownload()
    setAuthLoading(false)
  }

  async function handleReview() {
    if (!reviewFile) return
    setReviewing(true)
    setReviewSaved(false)
    setReviewEmail("")
    setReviewPassword("")
    setReviewAuthError("")
    try {
      const text = await reviewFile.text()
      setReviewText(text)
      const res = await fetch("/api/generate-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ type:"review", cvText: text.slice(0,4000) })
      })
      const data = await res.json()
      // Pre-fill email from extracted CV data
      if (data.email) setReviewEmail(data.email)
      setReviewResult(data)
    } catch {}
    setReviewing(false)
  }

  async function handleReviewSave() {
    if (!reviewEmail || !reviewPassword) return
    setReviewSaving(true)
    setReviewAuthError("")
    try {
      // Sign up
      const { error: signUpError } = await supabase.auth.signUp({ email: reviewEmail, password: reviewPassword })
      if (signUpError && !signUpError.message.includes("already registered")) {
        setReviewAuthError(signUpError.message)
        setReviewSaving(false)
        return
      }
      // Save to candidates table
      const { data: reviewUpserted } = await supabase.from("candidates").upsert({
        email: reviewEmail,
        full_name: reviewResult?.name || "",
        name: reviewResult?.name || "",
        current_title: reviewResult?.current_title || "",
        current_company: reviewResult?.current_company || "",
        cv_text: reviewText.slice(0, 50000),
        cv_score: reviewResult?.score || null,
        source: "cv_reviewer",
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" }).select("id").single()

      // Auto-process in background — extract structured profile + embedding
      const reviewCandidateId = reviewUpserted?.id
      if (reviewCandidateId && reviewText.trim()) {
        fetch("/api/extract-structured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: reviewCandidateId, cv_text: reviewText.slice(0, 50000) })
        }).then(() => fetch("/api/generate-embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: reviewCandidateId, text: reviewText.slice(0, 8000) })
        })).catch(() => {})
      }

      setReviewSaved(true)
    } catch (err: any) {
      setReviewAuthError(err.message || "Something went wrong")
    }
    setReviewSaving(false)
  }

  const suggestedSkills = SKILL_SUGGESTIONS[form.job_function] || Object.values(SKILL_SUGGESTIONS).flat().slice(0,12)

  // ── SHARED INPUT STYLES ──
  const inp: React.CSSProperties = { width:"100%", padding:"10px 13px", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontSize:"13px", color:"#0a1f24", outline:"none", fontFamily:"inherit", background:"white" }
  const sel: React.CSSProperties = { ...inp, cursor:"pointer" }
  const label: React.CSSProperties = { display:"block", fontSize:"11px", fontWeight:600, color:"#6b7280", marginBottom:"5px", letterSpacing:".02em" }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#f5f6f7" }}>
      {/* Top bar */}
      <div style={{ background:"white", borderBottom:"1px solid #e8ecef", padding:"12px 24px", display:"flex", alignItems:"center", gap:"16px" }}>
        <Link href="/jobs" style={{ fontSize:"13px", color:"#6b7280", textDecoration:"none", display:"flex", alignItems:"center", gap:"5px" }}>
          <ArrowLeft size={13} /> Back
        </Link>
        <span style={{ color:"#e5e7eb" }}>|</span>
        <span style={{ fontSize:"14px", fontWeight:700, color:"#0a1f24" }}>GPS CV Builder</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
          {(["builder","reviewer"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1.5px solid", fontSize:"13px", fontWeight:600, cursor:"pointer", borderColor: activeTab===t ? "#028090" : "#e5e7eb", background: activeTab===t ? "#028090" : "white", color: activeTab===t ? "white" : "#374151" }}>
              {t === "builder" ? "Build CV" : "Review CV"}
            </button>
          ))}
        </div>
      </div>

      {/* ── REVIEWER TAB ── */}
      {activeTab === "reviewer" && (
        <div style={{ maxWidth:"680px", margin:"40px auto", padding:"0 24px 80px" }}>
          <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e8ecef", padding:"36px" }}>
            <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"8px" }}>AI CV Review</h2>
            <p style={{ color:"#9ca3af", fontSize:"14px", marginBottom:"28px" }}>Upload your existing CV and get an instant AI score with specific improvement suggestions for the MENA market.</p>
            {!reviewResult ? (
              <>
                <div
                  onClick={() => document.getElementById("review-input")?.click()}
                  style={{ border:"2px dashed #d1d5db", borderRadius:"14px", padding:"40px", textAlign:"center" as const, cursor:"pointer", marginBottom:"20px", background: reviewFile ? "#f0fdf4" : "white" }}
                >
                  <Upload size={28} color={reviewFile ? "#028090" : "#9ca3af"} style={{ margin:"0 auto 12px" }} />
                  <p style={{ fontWeight:600, color: reviewFile ? "#028090" : "#374151", fontSize:"15px", margin:0 }}>{reviewFile ? reviewFile.name : "Drop your CV here"}</p>
                  <p style={{ color:"#9ca3af", fontSize:"13px", margin:"4px 0 0" }}>PDF or Word · Max 5MB</p>
                  <input id="review-input" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display:"none" }} onChange={e => setReviewFile(e.target.files?.[0] || null)} />
                </div>
                <button onClick={handleReview} disabled={!reviewFile || reviewing} style={{ width:"100%", padding:"14px", background: reviewFile ? "#028090" : "#e5e7eb", color: reviewFile ? "white" : "#9ca3af", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"15px", cursor: reviewFile ? "pointer" : "default", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  {reviewing ? <><Loader2 size={16} className="animate-spin" /> Analysing…</> : <><Sparkles size={16} /> Analyse with AI</>}
                </button>
              </>
            ) : (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}>
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"12px", padding:"16px", textAlign:"center" as const }}>
                    <div style={{ fontSize:"28px", fontWeight:800, color:"#059669" }}>{reviewResult.score || 72}</div>
                    <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>CV score / 100</div>
                  </div>
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"12px", padding:"16px", textAlign:"center" as const }}>
                    <div style={{ fontSize:"28px", fontWeight:800, color:"#059669" }}>{reviewResult.strengths?.length || 3}</div>
                    <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>Strengths</div>
                  </div>
                  <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"12px", padding:"16px", textAlign:"center" as const }}>
                    <div style={{ fontSize:"28px", fontWeight:800, color:"#d97706" }}>{reviewResult.concerns?.length || 3}</div>
                    <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>Areas to improve</div>
                  </div>
                </div>
                <div style={{ background:"#f9fafb", borderRadius:"12px", padding:"16px", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"#374151", lineHeight:1.7, margin:0 }}>{reviewResult.summary}</p>
                </div>
                {reviewResult.strengths?.length > 0 && (
                  <div style={{ marginBottom:"12px" }}>
                    <p style={{ fontSize:"12px", fontWeight:600, color:"#059669", marginBottom:"8px" }}>✓ Strengths</p>
                    {reviewResult.strengths.map((s: string, i: number) => (
                      <div key={i} style={{ fontSize:"13px", color:"#374151", padding:"6px 0", borderBottom: i<reviewResult.strengths.length-1 ? "1px solid #f3f4f6" : "none" }}>• {s}</div>
                    ))}
                  </div>
                )}
                {reviewResult.concerns?.length > 0 && (
                  <div style={{ marginBottom:"20px" }}>
                    <p style={{ fontSize:"12px", fontWeight:600, color:"#d97706", marginBottom:"8px" }}>⚠ Areas to improve</p>
                    {reviewResult.concerns.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize:"13px", color:"#374151", padding:"6px 0", borderBottom: i<reviewResult.concerns.length-1 ? "1px solid #f3f4f6" : "none" }}>• {c}</div>
                    ))}
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                  <button onClick={() => { setReviewResult(null); setReviewFile(null); setReviewSaved(false) }} style={{ padding:"12px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:"pointer", color:"#374151" }}>Review another CV</button>
                  <button onClick={() => setActiveTab("builder")} style={{ padding:"12px", background:"#028090", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                    <Sparkles size={13} /> Rebuild with AI builder
                  </button>
                </div>

                {/* Save to GPS Network CTA */}
                {!reviewSaved ? (
                  <div style={{ background:"linear-gradient(135deg,#0a1f24,#1a3a3a)", borderRadius:"16px", padding:"20px 22px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                      <CheckCircle size={16} color="#a8d5d1" />
                      <p style={{ fontWeight:700, color:"white", fontSize:"14px", margin:0 }}>Save your CV to the GPS Talent Network</p>
                    </div>
                    <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"12px", lineHeight:1.6, marginBottom:"14px" }}>
                      GPS recruiters will be able to find you when a matching role comes up. Free — takes 10 seconds.
                    </p>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"12px" }}>
                      <input
                        style={{ width:"100%", padding:"9px 12px", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", fontSize:"13px", background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }}
                        type="email" placeholder="Your email"
                        value={reviewEmail}
                        onChange={e => setReviewEmail(e.target.value)}
                      />
                      <input
                        style={{ width:"100%", padding:"9px 12px", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", fontSize:"13px", background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }}
                        type="password" placeholder="Choose a password (min 6 chars)"
                        value={reviewPassword}
                        onChange={e => setReviewPassword(e.target.value)}
                      />
                    </div>
                    {reviewAuthError && <p style={{ color:"#fca5a5", fontSize:"12px", marginBottom:"8px" }}>{reviewAuthError}</p>}
                    <button
                      onClick={handleReviewSave}
                      disabled={reviewSaving || !reviewEmail || !reviewPassword}
                      style={{ width:"100%", padding:"11px", background:"#028090", border:"none", borderRadius:"9px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", opacity: (!reviewEmail||!reviewPassword) ? 0.5 : 1 }}
                    >
                      {reviewSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <>Save to GPS Network <ArrowRight size={13} /></>}
                    </button>
                  </div>
                ) : (
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"14px", padding:"18px 20px", display:"flex", alignItems:"center", gap:"12px" }}>
                    <CheckCircle size={20} color="#059669" />
                    <div>
                      <p style={{ fontWeight:700, color:"#059669", fontSize:"13px", margin:0 }}>You're on the GPS Talent Network</p>
                      <p style={{ color:"#6b7280", fontSize:"12px", margin:"2px 0 0" }}>Our consultants can now find you when a matching role comes up.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BUILDER TAB — SPLIT PANEL ── */}
      {activeTab === "builder" && (
        <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", height:"calc(100vh - 57px)" }}>

          {/* ── LEFT: FORM PANEL ── */}
          <div style={{ background:"white", borderRight:"1px solid #e8ecef", display:"flex", flexDirection:"column" as const, overflow:"hidden" }}>

            {/* Step indicator */}
            <div style={{ padding:"14px 20px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:"0" }}>
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i < step; const active = i === step
                return (
                  <div key={s.id} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : "none" }}>
                    <button onClick={() => i <= step && setStep(i)} style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"3px", background:"none", border:"none", cursor: i<=step ? "pointer" : "default", padding:0 }}>
                      <div style={{ width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background: done?"#028090":active?"#0a1f24":"#f3f4f6", border: active?"2px solid #028090":"none", transition:"all 0.2s", flexShrink:0 }}>
                        {done ? <CheckCircle size={13} color="white" /> : <Icon size={12} color={active?"white":"#9ca3af"} />}
                      </div>
                      <span style={{ fontSize:"9px", fontWeight:500, color: active?"#0a1f24":done?"#028090":"#9ca3af", whiteSpace:"nowrap" as const }}>{s.label}</span>
                    </button>
                    {i < STEPS.length-1 && <div style={{ flex:1, height:"1.5px", background: done?"#028090":"#f3f4f6", margin:"0 4px 12px", borderRadius:"99px" }} />}
                  </div>
                )
              })}
            </div>

            {/* Template pills — always visible */}
            <div style={{ padding:"10px 20px 0", display:"flex", gap:"5px", flexWrap:"wrap" as const, borderBottom:"1px solid #f9fafb" }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{ padding:"4px 11px", borderRadius:"99px", border: selectedTemplate===t.id ? "1.5px solid #028090" : "1.5px solid #e5e7eb", background: selectedTemplate===t.id ? "#e6f5f3" : "white", color: selectedTemplate===t.id ? "#028090" : "#6b7280", fontSize:"11px", fontWeight:600, cursor:"pointer", transition:"all .15s" }}>
                  {t.name}
                </button>
              ))}
            </div>

            {/* Form content */}
            <div style={{ flex:1, overflowY:"auto" as const, padding:"20px" }}>

              {/* STEP 1: PERSONAL */}
              {currentStepId === "personal" && (
                <div>
                  <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Personal details</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"20px" }}>Your photo is strongly recommended — CVs with photos get significantly more recruiter views in MENA.</p>
                  <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"20px", padding:"16px", background:"#f9fafb", borderRadius:"12px", border:"1px solid #e8ecef" }}>
                    <div style={{ position:"relative", cursor:"pointer" }} onClick={() => photoRef.current?.click()}>
                      {form.personal.photo ? (
                        <img src={form.personal.photo} style={{ width:"64px", height:"64px", borderRadius:"50%", objectFit:"cover", border:"3px solid #028090" }} alt="Profile" />
                      ) : (
                        <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", border:"2px dashed #d1d5db" }}>
                          <Camera size={20} color="#9ca3af" />
                        </div>
                      )}
                      <div style={{ position:"absolute", bottom:0, right:0, width:"20px", height:"20px", background:"#028090", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
                        <Plus size={10} color="white" />
                      </div>
                    </div>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto} />
                    <div>
                      <p style={{ fontWeight:600, color:"#0a1f24", fontSize:"13px", margin:0 }}>Profile photo</p>
                      <p style={{ color:"#6b7280", fontSize:"12px", margin:"3px 0 8px", lineHeight:1.5 }}>CVs with photos get more recruiter views in Egypt & MENA.</p>
                      <button onClick={() => photoRef.current?.click()} style={{ padding:"5px 12px", background:"#028090", color:"white", border:"none", borderRadius:"7px", fontSize:"11px", fontWeight:600, cursor:"pointer" }}>
                        {form.personal.photo ? "Change photo" : "Upload photo"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                    <div><label style={label}>Full name *</label><input style={inp} placeholder="Ahmed Hassan" value={form.personal.name} onChange={e => setPersonal("name", e.target.value)} /></div>
                    <div><label style={label}>Job title *</label><input style={inp} placeholder="Finance Manager" value={form.personal.title} onChange={e => setPersonal("title", e.target.value)} /></div>
                    <div><label style={label}>Email *</label><input style={inp} type="email" placeholder="name@email.com" value={form.personal.email} onChange={e => setPersonal("email", e.target.value)} /></div>
                    <div>
                      <label style={label}>Phone</label>
                      <div style={{ display:"flex", border:"1.5px solid #e5e7eb", borderRadius:"10px", overflow:"hidden", background:"white" }}>
                        <div style={{ padding:"10px 12px", background:"#f5f5f5", borderRight:"1.5px solid #e5e7eb", fontSize:"13px", fontWeight:700, color:"#555", userSelect:"none" as const, flexShrink:0 }}>+20</div>
                        <input type="tel" placeholder="100 123 4567" value={form.personal.phone.replace(/^\+20\s?/,"")} onChange={e => setPersonal("phone", "+20 " + e.target.value.replace(/[^0-9 ]/g,""))} style={{ flex:1, padding:"10px 12px", border:"none", outline:"none", fontSize:"13px", background:"transparent" }} />
                      </div>
                    </div>
                    <div><label style={label}>Location</label><input style={inp} placeholder="Cairo, Egypt" value={form.personal.location} onChange={e => setPersonal("location", e.target.value)} /></div>
                    <div><label style={label}>Nationality</label><select style={sel} value={form.personal.nationality} onChange={e => setPersonal("nationality", e.target.value)}><option value="">Select</option>{NATIONALITIES.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                    <div><label style={label}>LinkedIn</label><input style={inp} placeholder="linkedin.com/in/yourname" value={form.personal.linkedin} onChange={e => setPersonal("linkedin", e.target.value)} /></div>
                    <div><label style={label}>Date of birth <span style={{ color:"#9ca3af", fontWeight:400 }}>(MENA norm)</span></label>
                      <input style={inp} type="date" value={form.personal.dob} onChange={e => setPersonal("dob", e.target.value)} />
                    </div>
                    <div><label style={label}>Function</label><select style={sel} value={form.job_function} onChange={e => setForm(f=>({...f,job_function:e.target.value}))}><option value="">Select function</option>{FUNCTIONS.map(fn=><option key={fn} value={fn}>{fn}</option>)}</select></div>
                    <div><label style={label}>Seniority level</label><select style={sel} value={form.level} onChange={e => setForm(f=>({...f,level:e.target.value}))}><option value="">Select level</option>{LEVELS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
                  </div>
                </div>
              )}

              {/* STEP 2: EXPERIENCE */}
              {currentStepId === "experience" && (
                <div>
                  <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Work experience</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"20px" }}>Add rough notes — AI rewrites them as powerful, quantified bullet points.</p>
                  {form.experience.map((exp, i) => (
                    <div key={i} style={{ border:"1.5px solid #e5e7eb", borderRadius:"12px", padding:"16px", marginBottom:"14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                        <p style={{ fontWeight:700, color:"#0a1f24", fontSize:"13px", margin:0 }}>Role {i+1}</p>
                        {form.experience.length > 1 && <button onClick={() => removeExp(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", display:"flex", alignItems:"center", gap:"4px", fontSize:"12px" }}><Trash2 size={12} /> Remove</button>}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                        <div><label style={label}>Job title *</label><input style={inp} placeholder="Finance Manager" value={exp.title} onChange={e => updateExp(i,"title",e.target.value)} /></div>
                        <div><label style={label}>Company *</label><input style={inp} placeholder="ABC Company" value={exp.company} onChange={e => updateExp(i,"company",e.target.value)} /></div>
                        <div>
                          <label style={label}>Start</label>
                          <div style={{ display:"flex", gap:"6px" }}>
                            <select style={{ ...sel, flex:1.4 }} value={exp.start ? exp.start.split("-")[1] : ""} onChange={e => { const y=exp.start?exp.start.split("-")[0]:""; updateExp(i,"start",`${y||new Date().getFullYear()}-${e.target.value||"01"}`)}}>
                              <option value="">Month</option>
                              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi)=><option key={m} value={String(mi+1).padStart(2,"0")}>{m}</option>)}
                            </select>
                            <select style={{ ...sel, flex:1 }} value={exp.start ? exp.start.split("-")[0] : ""} onChange={e => { const m=exp.start?exp.start.split("-")[1]:"01"; updateExp(i,"start",`${e.target.value||new Date().getFullYear()}-${m}`)}}>
                              <option value="">Year</option>
                              {Array.from({length:40},(_,idx)=>String(new Date().getFullYear()-idx)).map(y=><option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={label}>End</label>
                          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                            {!exp.current && (<>
                              <select style={{ ...sel, flex:1.4 }} value={exp.end ? exp.end.split("-")[1] : ""} onChange={e => { const y=exp.end?exp.end.split("-")[0]:""; updateExp(i,"end",`${y||new Date().getFullYear()}-${e.target.value||"01"}`)}}>
                                <option value="">Month</option>
                                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi)=><option key={m} value={String(mi+1).padStart(2,"0")}>{m}</option>)}
                              </select>
                              <select style={{ ...sel, flex:1 }} value={exp.end ? exp.end.split("-")[0] : ""} onChange={e => { const m=exp.end?exp.end.split("-")[1]:"01"; updateExp(i,"end",`${e.target.value||new Date().getFullYear()}-${m}`)}}>
                                <option value="">Year</option>
                                {Array.from({length:40},(_,idx)=>String(new Date().getFullYear()-idx)).map(y=><option key={y} value={y}>{y}</option>)}
                              </select>
                            </>)}
                            <label style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"11px", color:"#374151", whiteSpace:"nowrap" as const, cursor:"pointer", flexShrink:0 }}>
                              <input type="checkbox" checked={exp.current} onChange={e => updateExp(i,"current",e.target.checked)} /> Present
                            </label>
                          </div>
                        </div>
                      </div>
                      <label style={label}>Bullet points <span style={{ color:"#9ca3af", fontWeight:400 }}>(rough notes — AI will polish)</span></label>
                      {exp.bullets.map((b, j) => (
                        <div key={j} style={{ display:"flex", gap:"6px", marginBottom:"6px" }}>
                          <input style={{ ...inp, flex:1 }} placeholder={j===0?"e.g. managed accounts team of 8":"Add another bullet…"} value={b} onChange={e => updateBullet(i,j,e.target.value)} />
                          {j === exp.bullets.length-1 && <button onClick={() => { const updated=[...form.experience]; updated[i].bullets=[...updated[i].bullets,""]; setForm(f=>({...f,experience:updated})) }} style={{ padding:"0 10px", background:"#f3f4f6", border:"none", borderRadius:"8px", cursor:"pointer", color:"#6b7280", fontSize:"18px" }}>+</button>}
                        </div>
                      ))}
                      <button onClick={() => generateBullets(i)} disabled={generatingBullet===i || !exp.title} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"8px 14px", background:exp.title?"#0a1f24":"#e5e7eb", color:exp.title?"white":"#9ca3af", border:"none", borderRadius:"8px", fontWeight:600, fontSize:"12px", cursor:exp.title?"pointer":"default", marginTop:"6px" }}>
                        {generatingBullet===i ? <><Loader2 size={11} className="animate-spin" /> Rewriting…</> : <><Sparkles size={11} /> AI rewrite bullets</>}
                      </button>
                    </div>
                  ))}
                  <button onClick={addExp} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 16px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500 }}>
                    <Plus size={13} /> Add another role
                  </button>
                </div>
              )}

              {/* STEP 3: SKILLS */}
              {currentStepId === "skills" && (
                <div>
                  <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Skills</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"20px" }}>Select from suggestions or add your own. These appear as polished tags on your CV.</p>
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"7px", marginBottom:"20px" }}>
                    {suggestedSkills.map(s => (
                      <button key={s} onClick={() => toggleSkill(s)} style={{ padding:"7px 13px", borderRadius:"99px", border: form.skills.includes(s) ? "2px solid #028090" : "1.5px solid #e5e7eb", background: form.skills.includes(s) ? "#e6f5f3" : "white", color: form.skills.includes(s) ? "#028090" : "#374151", fontSize:"12px", fontWeight:500, cursor:"pointer", transition:"all .15s" }}>
                        {form.skills.includes(s) && "✓ "}{s}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label style={label}>Add a custom skill</label>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <input id="custom-skill" style={{ ...inp, flex:1 }} placeholder="e.g. Power BI" onKeyDown={e => { if(e.key==="Enter"){ const v=(e.target as HTMLInputElement).value.trim(); if(v){ toggleSkill(v);(e.target as HTMLInputElement).value="" }}}} />
                      <button onClick={() => { const el=document.getElementById("custom-skill") as HTMLInputElement; if(el?.value.trim()){ toggleSkill(el.value.trim()); el.value="" }}} style={{ padding:"10px 14px", background:"#0a1f24", color:"white", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"13px", fontWeight:600 }}>Add</button>
                    </div>
                  </div>
                  {form.skills.length > 0 && (
                    <div style={{ marginTop:"16px" }}>
                      <p style={{ fontSize:"12px", color:"#6b7280", marginBottom:"8px" }}>Selected ({form.skills.length}):</p>
                      <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"6px" }}>
                        {form.skills.map(s => <span key={s} style={{ padding:"5px 11px", background:"#028090", color:"white", borderRadius:"99px", fontSize:"11px", fontWeight:500 }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: EDUCATION */}
              {currentStepId === "education" && (
                <div>
                  <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Education & languages</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"20px" }}>Your academic background, language skills, and anything that adds personality.</p>
                  <h3 style={{ fontSize:"14px", fontWeight:700, color:"#374151", marginBottom:"12px" }}>Education</h3>
                  {form.education.map((edu, i) => (
                    <div key={i} style={{ border:"1.5px solid #e5e7eb", borderRadius:"12px", padding:"14px", marginBottom:"10px" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                        <div><label style={label}>Institution</label><input style={inp} placeholder="Cairo University" value={edu.institution} onChange={e => updateEdu(i,"institution",e.target.value)} /></div>
                        <div><label style={label}>Degree</label><input style={inp} placeholder="Bachelor's" value={edu.degree} onChange={e => updateEdu(i,"degree",e.target.value)} /></div>
                        <div style={{ gridColumn:"span 2" }}><label style={label}>Field of study</label><input style={inp} placeholder="Accounting" value={edu.field} onChange={e => updateEdu(i,"field",e.target.value)} /></div>
                        <div><label style={label}>Start year</label><select style={sel} value={edu.startYear} onChange={e => updateEdu(i,"startYear",e.target.value)}><option value="">Year</option>{Array.from({length:40},(_,idx)=>String(new Date().getFullYear()-idx)).map(y=><option key={y} value={y}>{y}</option>)}</select></div>
                        <div><label style={label}>End year</label><select style={sel} value={edu.endYear} onChange={e => updateEdu(i,"endYear",e.target.value)}><option value="">Year</option>{Array.from({length:44},(_,idx)=>String(new Date().getFullYear()+3-idx)).map(y=><option key={y} value={y}>{y}</option>)}</select></div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addEdu} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 16px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500, marginBottom:"24px" }}>
                    <Plus size={13} /> Add qualification
                  </button>
                  <h3 style={{ fontSize:"14px", fontWeight:700, color:"#374151", marginBottom:"12px" }}>Languages</h3>
                  {form.languages.map((lang, i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:"8px", marginBottom:"8px", alignItems:"end" }}>
                      <div><label style={label}>Language</label><select style={sel} value={lang.lang} onChange={e => { const u=[...form.languages]; u[i]={...u[i],lang:e.target.value}; setForm(f=>({...f,languages:u})) }}>{LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
                      <div><label style={label}>Proficiency</label><select style={sel} value={lang.level} onChange={e => { const u=[...form.languages]; u[i]={...u[i],level:e.target.value}; setForm(f=>({...f,languages:u})) }}>{["Native","Fluent","Advanced","Intermediate","Basic"].map(l=><option key={l} value={l}>{l}</option>)}</select></div>
                      {form.languages.length > 1 && <button onClick={() => setForm(f=>({...f,languages:f.languages.filter((_,idx)=>idx!==i)}))} style={{ height:"42px", padding:"0 10px", background:"none", border:"1px solid #fee2e2", borderRadius:"8px", cursor:"pointer", color:"#ef4444" }}><Trash2 size={12} /></button>}
                    </div>
                  ))}
                  <button onClick={() => setForm(f=>({...f,languages:[...f.languages,{lang:"French",level:"Intermediate"}]}))} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 16px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500, marginBottom:"24px" }}>
                    <Plus size={13} /> Add language
                  </button>
                  <h3 style={{ fontSize:"14px", fontWeight:700, color:"#374151", marginBottom:"4px" }}>Hobbies & interests <span style={{ fontSize:"11px", color:"#9ca3af", fontWeight:400 }}>(optional)</span></h3>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"10px" }}>Adds personality — valued in Egyptian & Gulf recruitment.</p>
                  <input style={inp} placeholder="e.g. Football, reading Arabic literature, hiking, photography" value={form.hobbies} onChange={e => setForm(f=>({...f,hobbies:e.target.value}))} />
                  <h3 style={{ fontSize:"14px", fontWeight:700, color:"#374151", margin:"20px 0 4px" }}>Key achievements <span style={{ fontSize:"11px", color:"#9ca3af", fontWeight:400 }}>(optional)</span></h3>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"10px" }}>Certifications, awards, notable projects — separated by ·</p>
                  <textarea value={form.achievements} onChange={e => setForm(f=>({...f,achievements:e.target.value}))} rows={3} style={{ ...inp, resize:"vertical" as const, lineHeight:1.6 }} placeholder="e.g. CMA certified · Top performer Q3 2022 · Launched Arabic content vertical" />
                  <button onClick={generateAchievements} disabled={!form.personal.title} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"7px 14px", background: form.personal.title ? "#f0fdf4" : "#f3f4f6", color: form.personal.title ? "#028090" : "#9ca3af", border: form.personal.title ? "1px solid #bbf7d0" : "none", borderRadius:"8px", fontWeight:600, fontSize:"12px", cursor: form.personal.title ? "pointer" : "default", marginTop:"8px" }}>
                    <Sparkles size={11} /> AI suggest achievements
                  </button>
                </div>
              )}

              {/* STEP 5: SUMMARY */}
              {currentStepId === "summary" && (
                <div>
                  <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Professional summary</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"20px" }}>AI writes this from your experience. It calibrates length to how full your CV is — shorter if dense, richer if light.</p>
                  {generating ? (
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"16px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"10px", marginBottom:"14px" }}>
                      <Loader2 size={16} color="#028090" className="animate-spin" />
                      <div>
                        <p style={{ fontWeight:600, color:"#028090", fontSize:"13px", margin:0 }}>Writing your summary…</p>
                        <p style={{ color:"#6b7280", fontSize:"12px", margin:0 }}>AI is reading your experience and crafting a market-relevant summary</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position:"relative", marginBottom:"14px" }}>
                      <textarea value={form.summary} onChange={e => setForm(f=>({...f,summary:e.target.value}))} rows={6} placeholder="Your summary will appear here once AI generates it…" style={{ ...inp, resize:"vertical" as const, lineHeight:1.7 }} />
                      {form.summary && (
                        <div style={{ position:"absolute", bottom:"10px", right:"10px" }}>
                          <button onClick={generateSummary} style={{ display:"flex", alignItems:"center", gap:"4px", padding:"4px 9px", background:"white", border:"1px solid #e5e7eb", borderRadius:"7px", fontSize:"11px", fontWeight:600, color:"#6b7280", cursor:"pointer" }}>
                            <Sparkles size={10} /> Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {!generating && form.summary && (
                    <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"8px" }}>
                      <CheckCircle size={12} color="#059669" />
                      <p style={{ fontSize:"11px", color:"#059669", margin:0, fontWeight:500 }}>Generated — edit anything you like</p>
                    </div>
                  )}
                  {!generating && !form.summary && (
                    <button onClick={generateSummary} disabled={!form.personal.title} style={{ display:"flex", alignItems:"center", gap:"7px", padding:"10px 18px", background: form.personal.title?"#028090":"#e5e7eb", color: form.personal.title?"white":"#9ca3af", border:"none", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor: form.personal.title?"pointer":"default" }}>
                      <Sparkles size={13} /> Generate with AI
                    </button>
                  )}
                </div>
              )}

              {/* STEP 6: TEMPLATE */}
              {currentStepId === "template" && (
                <div>
                  <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Choose your template</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"20px" }}>5 structurally different designs for the MENA market. Switch anytime — the preview updates instantly.</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px", marginBottom:"24px" }}>
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{ padding:0, border: selectedTemplate===t.id ? "2.5px solid #028090" : "1.5px solid #e5e7eb", borderRadius:"10px", overflow:"hidden", cursor:"pointer", background:"white", boxShadow: selectedTemplate===t.id ? "0 0 0 3px rgba(2,128,144,0.12)" : "0 1px 3px rgba(0,0,0,0.05)", transition:"all .15s" }}>
                        <div style={{ padding:"6px 6px 4px" }}>
                          <p style={{ fontSize:"10px", fontWeight:700, color: selectedTemplate===t.id ? "#028090" : "#0a1f24", margin:0 }}>{t.name}</p>
                          <p style={{ fontSize:"8px", color:"#9ca3af", margin:0, marginTop:"1px", lineHeight:1.3 }}>{t.sub}</p>
                        </div>
                        {selectedTemplate===t.id && <div style={{ background:"#028090", padding:"2px 0", textAlign:"center" as const, fontSize:"8px", color:"white", fontWeight:700, letterSpacing:".04em" }}>✓ SELECTED</div>}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"10px", marginBottom:"18px" }}>
                    <span style={{ fontSize:"18px" }}>🇸🇦</span>
                    <div>
                      <p style={{ fontSize:"12px", fontWeight:600, color:"#166534", margin:0 }}>Arabic CV — coming soon</p>
                      <p style={{ fontSize:"11px", color:"#15803d", margin:0 }}>Full Arabic RTL version. Save now and we'll notify you when ready.</p>
                    </div>
                  </div>
                  <button onClick={() => triggerPDFDownload()} style={{ width:"100%", marginBottom:"10px", padding:"11px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", color:"#374151" }}>
                    <Download size={14} /> Preview & download PDF
                  </button>
                  <button onClick={handleSaveAndDownload} disabled={saving || !form.personal.name} style={{ width:"100%", padding:"14px", background: form.personal.name?"#028090":"#e5e7eb", color: form.personal.name?"white":"#9ca3af", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"15px", cursor: form.personal.name?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Download size={16} /> Save to GPS & Download PDF</>}
                  </button>
                  <p style={{ textAlign:"center" as const, fontSize:"11px", color:"#9ca3af", marginTop:"8px" }}>Your CV saves to the GPS recruiter database. Consultants can find you immediately.</p>
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div style={{ padding:"14px 20px", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center", background:"white" }}>
              <button onClick={() => setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"9px 16px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"9px", cursor:step===0?"default":"pointer", color:step===0?"#d1d5db":"#374151", fontWeight:600, fontSize:"13px" }}>
                <ArrowLeft size={13} /> Back
              </button>
              <span style={{ fontSize:"11px", color:"#9ca3af" }}>Step {step+1} of {STEPS.length}</span>
              {step < STEPS.length-1 ? (
                <button onClick={() => setStep(s=>Math.min(STEPS.length-1,s+1))} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"9px 16px", background:"#028090", border:"none", borderRadius:"9px", cursor:"pointer", color:"white", fontWeight:600, fontSize:"13px" }}>
                  Next <ArrowRight size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {/* ── RIGHT: CV PREVIEW PANEL ── */}
          <div style={{ padding:"16px", overflow:"hidden", display:"flex", flexDirection:"column" as const }}>
            <CVPreview form={form} templateId={selectedTemplate} />
          </div>
        </div>
      )}

      {/* ── SIGNUP MODAL ── */}
      {showSignup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"24px" }}>
          <div style={{ background:"white", borderRadius:"20px", padding:"32px", width:"100%", maxWidth:"400px", boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign:"center" as const, marginBottom:"20px" }}>
              <div style={{ width:"48px", height:"48px", background:"#e6f5f3", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                <CheckCircle size={22} color="#028090" />
              </div>
              <h2 style={{ fontSize:"18px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Almost there!</h2>
              <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.6 }}>Create a free account to save your CV and go live on the GPS Talent Network.</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:"10px", marginBottom:"14px" }}>
              <input style={inp} type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
              <input style={inp} type="password" placeholder="Choose a password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {authError && <p style={{ color:"#ef4444", fontSize:"13px", marginBottom:"10px" }}>{authError}</p>}
            <button onClick={handleSignupAndSave} disabled={authLoading || !email || !password} style={{ width:"100%", padding:"13px", background:"#028090", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", marginBottom:"8px" }}>
              {authLoading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <>Save CV & Go Live <ArrowRight size={14} /></>}
            </button>
            <p style={{ textAlign:"center" as const, fontSize:"12px", color:"#9ca3af" }}>
              Already have an account? <Link href="/login" style={{ color:"#028090", fontWeight:600 }}>Sign in</Link>
            </p>
            <button onClick={() => setShowSignup(false)} style={{ width:"100%", padding:"8px", background:"none", border:"none", color:"#9ca3af", fontSize:"12px", cursor:"pointer", marginTop:"6px" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
