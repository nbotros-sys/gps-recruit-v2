"use client"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { ArrowRight, ArrowLeft, Upload, Sparkles, CheckCircle, Loader2, User, Eye, Briefcase, GraduationCap, Star, Download, Camera, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","C-Suite / Executive","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level / Executive"]
// Arabic-speaking nationalities only
const NATIONALITIES = ["Egyptian","Saudi","Emirati","Kuwaiti","Qatari","Bahraini","Omani","Jordanian","Lebanese","Syrian","Palestinian","Iraqi","Yemeni","Sudanese","Libyan","Moroccan","Tunisian","Algerian","Mauritanian","Comoran","Other"]
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
  "Legal": ["Contract Drafting","Corporate Law","Compliance","Litigation","Regulatory Affairs","Due Diligence","Employment Law","IP Law","Legal Research","Commercial Contracts"],
  "Supply Chain & Logistics": ["Procurement","Inventory Management","Warehouse Operations","Freight Management","ERP","Vendor Management","Demand Planning","Customs Clearance","Fleet Management","Cost Reduction"],
  "C-Suite / Executive": ["P&L Management","Board Relations","M&A","Strategic Planning","Investor Relations","Corporate Governance","Fundraising","Organisational Design","Change Management","Executive Leadership"],
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const YEARS = Array.from({length:40},(_,i)=>(new Date().getFullYear()-i).toString())

type Exp = { company:string; title:string; startMonth:string; startYear:string; endMonth:string; endYear:string; current:boolean; bullets:string[] }
type Edu = { institution:string; degree:string; field:string; startYear:string; endYear:string }
type FormData = {
  personal: { name:string; title:string; email:string; phone:string; location:string; nationality:string; linkedin:string; photo:string|null }
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

const SAMPLE_FORM: FormData = {
  personal: { name:"Nader Botros", title:"HR Manager", email:"nbotros@hotmail.com", phone:"+20 100 217 0766", location:"Cairo, Egypt", nationality:"Egyptian", linkedin:"linkedin.com/in/nader-botros", photo:null },
  summary: "HR Manager with progressive experience across banking, multinational FMCG, and HR consultancy sectors in Egypt and the MENA region. Managed payroll for 800+ employees at 100% accuracy and led a boutique HR consultancy to 15+ corporate accounts, bringing end-to-end expertise across payroll, labour law compliance, talent acquisition, and compensation.",
  experience: [
    { company:"GPS", title:"Managing Director", startMonth:"01", startYear:"2015", endMonth:"", endYear:"", current:true, bullets:["Founded and scaled GPS into a top-tier Egyptian HR consultancy, growing the client portfolio to 15+ corporate accounts.","Led executive search mandates across the MENA region, placing senior talent within competitive timelines.","Ensured full regulatory compliance with Egyptian Labour Law, Social Insurance, and income tax frameworks."] },
    { company:"Multinational FMCG", title:"Senior HR Manager", startMonth:"01", startYear:"2011", endMonth:"12", endYear:"2014", current:false, bullets:["Led end-to-end payroll operations for 800+ employees across 3 legal entities at 100% on-time accuracy.","Managed monthly payroll including salaries, overtime, bonuses, and allowances with zero compliance breaches.","Administered Social Insurance Forms 1, 2, and 6 and executed annual tax reconciliation."] },
    { company:"Egyptian Banking Group", title:"HR Officer", startMonth:"01", startYear:"2008", endMonth:"12", endYear:"2010", current:false, bullets:["Processed monthly payroll for 350+ employees across Cairo and Alexandria with 99% accuracy.","Managed employee records, contracts, and personnel files ensuring full Labour Law compliance.","Reduced payroll processing time by 25% through automated attendance and deduction tracking."] }
  ],
  education: [{ institution:"American University in Cairo", degree:"Bachelor of Business Administration", field:"Human Resources Management", startYear:"2004", endYear:"2008" }],
  hobbies: "Squash, piano, tennis",
  skills: ["Talent Acquisition","Performance Management","HRIS","Payroll","Labour Law","Compensation & Benefits","Learning & Development","Onboarding","Employee Relations","Organisation Design"],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  job_function: "HR & People",
  level: "Executive",
  achievements: "100% on-time payroll accuracy across 800+ staff · Zero compliance gaps over 7 years · Grew consultancy to 15+ corporate accounts"
}

const INITIAL: FormData = {
  personal: { name:"", title:"", email:"", phone:"", location:"", nationality:"", linkedin:"", photo:null },
  summary: "",
  experience: [{ company:"", title:"", startMonth:"", startYear:"", endMonth:"", endYear:"", current:false, bullets:[""] }],
  education: [{ institution:"", degree:"", field:"", startYear:"", endYear:"" }],
  hobbies:"", skills:[],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  job_function:"", level:"", achievements:"",
}

// ── DENSITY ENGINE ────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpF(a: number, b: number, t: number) { return parseFloat(lerp(a, b, t).toFixed(3)) }

function getContentDensity(form: FormData) {
  const expCount    = form.experience.filter(e => e.title || e.company).length
  const bulletCount = form.experience.reduce((acc, e) => acc + e.bullets.filter(b => b.trim()).length, 0)
  const hasPhoto    = !!form.personal.photo
  const hasEdu      = form.education.some(e => e.institution)
  const skillCount  = form.skills.length
  const summaryLen  = form.summary.length
  const hasHobbies  = !!form.hobbies.trim()
  const hasAchievements = !!form.achievements?.trim()

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
  const t = score / 100

  return {
    score, t,
    isSparse: score < 45,
    // Sparse (t=0) → large, airy, fills page. Dense (t=1) → compact, everything fits.
    bodyEm:         lerpF(1.06, 0.85, t),   // body text — noticeably bigger when sparse
    bulletEm:       lerpF(1.02, 0.82, t),
    secLabelEm:     lerpF(0.88, 0.68, t),
    lineHeight:     lerpF(1.78, 1.52, t),   // very open leading when sparse
    letterSp:       lerpF(0.04, 0.10, t),
    nameEm:         lerpF(1.90, 1.50, t),   // large name when sparse
    titleEm:        lerpF(1.08, 0.88, t),
    photoEm:        lerpF(7.00, 5.00, t),   // bigger photo when sparse
    sectionGapEm:   lerpF(1.80, 0.80, t),   // generous gaps when sparse
    headerPadVEm:   lerpF(2.30, 1.40, t),   // tall header when sparse
    headerPadHEm:   lerpF(2.40, 1.60, t),
    bodyPadEm:      lerpF(1.70, 1.10, t),   // generous body padding when sparse
    sidebarPct:     32,   // percentage of total width
    showHobbies:      hasHobbies || score < 58,
    showAchievements: hasAchievements || score < 42,
    summaryTargetWords: Math.round(lerp(120, 55, t)),
    minBulletsPerRole: score < 45 ? 5 : 3,
  }
}
type D = ReturnType<typeof getContentDensity>

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtDate(month: string, year: string) {
  if (!year) return ""
  if (!month) return year
  const mi = parseInt(month)
  return `${MONTHS[mi-1] || ""} ${year}`
}
function initials(name: string) {
  const p = name.trim().split(" ")
  return ((p[0]?.[0]||"")+(p[1]?.[0]||"")).toUpperCase()||"?"
}

// Shared text style applied to ALL text containers in templates:
// overflow-wrap + word-break prevent mid-word splits in narrow columns
const NO_BREAK: React.CSSProperties = {
  overflowWrap: "break-word",
  wordBreak: "break-word",
  hyphens: "auto",
  minWidth: 0,
}

const PH = {
  name:"Ahmed Hassan", title:"Finance Manager",
  email:"ahmed@email.com", phone:"+20 100 123 4567",
  location:"Cairo, Egypt", linkedin:"linkedin.com/in/ahmed",
  summary:"Experienced finance professional with 8+ years across banking and FMCG sectors in Egypt and the Gulf. Proven track record in financial planning, team leadership and stakeholder management. Consistently delivers operational improvements and measurable cost savings.",
  experience:[
    { company:"ABC Group", title:"Finance Manager", startMonth:"01", startYear:"2020", endMonth:"", endYear:"", current:true,
      bullets:["Led financial reporting for EGP 50M portfolio across 3 business units, improving accuracy by 40%","Managed team of 6 accountants, reducing month-end close from 7 to 3 days","Built Power BI dashboards eliminating 12 hours of manual reporting per week"] },
    { company:"XYZ Bank", title:"Senior Accountant", startMonth:"03", startYear:"2017", endMonth:"12", endYear:"2019", current:false,
      bullets:["Prepared monthly management accounts for EGP 120M portfolio","Coordinated external audit with zero material misstatements for 3 consecutive years"] },
  ],
  education:[{ institution:"Cairo University", degree:"B.Sc. Accounting", field:"", startYear:"2012", endYear:"2016" }],
  skills:["Financial Reporting","Budgeting","SAP","Excel Advanced","Team Leadership","IFRS","Cash Flow Mgmt"],
  languages:[{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  hobbies:"Football, reading, photography",
  achievements:"CMA certified · Top performer Q3 2022 · Implemented first automated reporting system",
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — PRESTIGE  (dark slate sidebar, gold accents, Georgian serif)
// Key text fix: sidebar uses percentage width, all text has overflowWrap/wordBreak
// ═══════════════════════════════════════════════════════════════════════════════
const eduRange = (e:Edu) => [e.startYear,e.endYear].filter(Boolean).join(" – ")

// ═══ TEMPLATE 1 — PRESTIGE (slate sidebar, gold accents) ═══
function TplPrestige({ form, d }: { form:FormData; d:D }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const loc = f.personal.location || PH.location
  const link = (f.personal.linkedin || PH.linkedin || "").replace("https://","").replace(/\/notifications.*$/,"")
  const sum = f.summary || PH.summary
  const exps = f.experience.some((e:Exp)=>e.title) ? f.experience : PH.experience
  const edus = f.education.some((e:Edu)=>e.institution) ? f.education : PH.education
  const skills = f.skills.length>0 ? f.skills : PH.skills
  const langs = f.languages.filter((l:any)=>l.lang).length>0 ? f.languages : PH.languages
  const hob = f.hobbies||(d.showHobbies?PH.hobbies:"")
  const ach = f.achievements||(d.showAchievements?PH.achievements:"")
  const SLATE="#1C2B35", GOLD="#B8966E", CREAM="#FAFAF8", INK="#1A1A1A"
  const chip:React.CSSProperties = { fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.82}em`, background:"rgba(184,150,110,0.16)", color:"#E7D8C4", padding:"0.18em 0.6em", borderRadius:"1em", ...NO_BREAK }
  const eduChip:React.CSSProperties = { fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.8}em`, background:"rgba(184,150,110,0.14)", color:"#6B5842", padding:"0.18em 0.6em", borderRadius:"1em", ...NO_BREAK }
  const sL = (label:string) => (
    <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.secLabelEm}em`, fontWeight:700, color:GOLD, letterSpacing:"0.12em", textTransform:"uppercase" as const, marginBottom:"0.5em", ...NO_BREAK }}>{label}</div>
  )
  const mL = (label:string) => (
    <div style={{ display:"flex", alignItems:"center", gap:"0.55em", marginTop:`${d.sectionGapEm}em`, marginBottom:"0.55em" }}>
      <span style={{ fontFamily:"Georgia,serif", fontSize:`${d.secLabelEm}em`, fontWeight:700, color:SLATE, letterSpacing:`${d.letterSp}em`, textTransform:"uppercase" as const }}>{label}</span>
      <div style={{ flex:1, height:"1px", background:"#E0DDD8" }} />
    </div>
  )
  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"Georgia,serif", fontSize:"1em" }}>
      <div style={{ width:`${d.sidebarPct}%`, flexShrink:0, background:SLATE, padding:`${d.headerPadVEm}em ${d.headerPadHEm*0.7}em`, display:"flex", flexDirection:"column" as const, overflow:"hidden", minWidth:0 }}>
        {f.personal.photo ? (
          <img src={f.personal.photo} alt="" style={{ width:`${d.photoEm}em`, height:`${d.photoEm}em`, borderRadius:"50%", objectFit:"cover", border:`0.14em solid ${GOLD}`, marginBottom:`${d.sectionGapEm*0.55}em`, flexShrink:0, maxWidth:"100%" }} />
        ) : (
          <div style={{ width:`${d.photoEm}em`, height:`${d.photoEm}em`, borderRadius:"50%", background:"rgba(184,150,110,0.18)", border:`0.12em solid rgba(184,150,110,0.45)`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:`${d.sectionGapEm*0.55}em`, flexShrink:0, color:"rgba(255,255,255,0.5)", fontSize:`${d.photoEm*0.28}em`, fontWeight:700, maxWidth:"100%" }}>{initials(name)}</div>
        )}
        <div style={{ fontSize:`${d.nameEm}em`, fontWeight:700, color:"#FFF", lineHeight:1.15, marginBottom:"0.2em", ...NO_BREAK }}>{name}</div>
        <div style={{ fontSize:`${d.titleEm*0.85}em`, color:GOLD, letterSpacing:"0.07em", fontFamily:"Arial,sans-serif", marginBottom:`${d.sectionGapEm*0.5}em`, textTransform:"uppercase" as const, ...NO_BREAK }}>{title}</div>
        <div style={{ width:"1.4em", height:"0.1em", background:GOLD, marginBottom:`${d.sectionGapEm*0.5}em` }} />
        {sL("Contact")}
        <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.86}em`, color:"rgba(255,255,255,0.55)", lineHeight:d.lineHeight*0.92, marginBottom:`${d.sectionGapEm*0.7}em`, ...NO_BREAK }}>
          {email && <div style={{ marginBottom:"0.25em" }}>{email}</div>}
          {phone && <div style={{ marginBottom:"0.25em" }}>{phone}</div>}
          {loc && <div style={{ marginBottom:"0.25em" }}>{loc}</div>}
          {link && <div style={{ color:GOLD }}>{link}</div>}
        </div>
        {sL("Skills")}
        <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.35em", marginBottom:`${d.sectionGapEm*0.7}em` }}>
          {skills.slice(0,12).map((s:string,i:number)=>(<span key={i} style={chip}>{s}</span>))}
        </div>
        {sL("Languages")}
        <div style={{ marginBottom:`${d.sectionGapEm*0.7}em` }}>
          {langs.filter((l:any)=>l.lang).map((l:any,i:number)=>(
            <div key={i} style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.86}em`, marginBottom:"0.28em", ...NO_BREAK }}>
              <span style={{ color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{l.lang}</span>
              <span style={{ color:"rgba(255,255,255,0.35)" }}> · {l.level}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"auto" }}>
          {hob && (<>{sL("Interests")}<div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.82}em`, color:"rgba(255,255,255,0.42)", lineHeight:d.lineHeight*0.9, ...NO_BREAK }}>{hob}</div></>)}
        </div>
      </div>
      <div style={{ flex:1, background:CREAM, padding:`${d.headerPadVEm}em ${d.bodyPadEm+0.3}em 0`, overflow:"hidden", display:"flex", flexDirection:"column" as const, minWidth:0 }}>
        {mL("Professional Profile")}
        <p style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, color:"#3A3A3A", lineHeight:d.lineHeight, margin:"0 0 0.2em", ...NO_BREAK }}>{sum}</p>
        {mL("Professional Experience")}
        {exps.filter((e:Exp)=>e.title||e.company).map((e:Exp,i:number)=>(
          <div key={i} style={{ marginBottom:`${d.sectionGapEm*0.72}em` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"0.5em" }}>
              <div style={{ fontSize:`${d.bodyEm*1.06}em`, fontWeight:700, color:INK, fontFamily:"Georgia,serif", ...NO_BREAK, flex:1 }}>{e.title}</div>
              <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm*0.82}em`, color:"#9B8B7A", flexShrink:0, whiteSpace:"nowrap" as const }}>{fmtDate(e.startMonth,e.startYear)}{(e.startYear||e.endYear||e.current)?` – ${e.current?"Present":fmtDate(e.endMonth,e.endYear)}`:""}</div>
            </div>
            <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.9}em`, color:GOLD, fontWeight:600, marginBottom:"0.3em", ...NO_BREAK }}>{e.company}</div>
            {e.bullets.filter((b:string)=>b.trim()).map((b:string,j:number)=>(
              <div key={j} style={{ display:"flex", gap:"0.5em", marginBottom:"0.16em", alignItems:"flex-start" }}>
                <span style={{ color:GOLD, fontSize:`${d.bulletEm*0.85}em`, flexShrink:0, marginTop:"0.22em", lineHeight:1 }}>—</span>
                <p style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm}em`, color:"#4A4A4A", lineHeight:d.lineHeight, margin:0, ...NO_BREAK }}>{b}</p>
              </div>
            ))}
          </div>
        ))}
        {ach && (
          <div style={{ background:"rgba(184,150,110,0.07)", border:"0.5px solid rgba(184,150,110,0.28)", borderRadius:"0.35em", padding:"0.65em 0.85em", marginBottom:`${d.sectionGapEm*0.45}em` }}>
            <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.secLabelEm*0.82}em`, fontWeight:700, color:GOLD, letterSpacing:"0.06em", textTransform:"uppercase" as const, marginBottom:"0.38em" }}>Key Achievements</div>
            {ach.split("·").map((a:string)=>a.trim()).filter(Boolean).map((a:string,i:number)=>(
              <div key={i} style={{ display:"flex", gap:"0.45em", marginBottom:"0.18em", alignItems:"flex-start" }}>
                <span style={{ color:GOLD, flexShrink:0, fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm*0.82}em`, marginTop:"0.12em" }}>✓</span>
                <span style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm*0.88}em`, color:"#4A4A4A", lineHeight:d.lineHeight*0.88, ...NO_BREAK }}>{a}</span>
              </div>
            ))}
          </div>
        )}
        {mL("Education")}
        {edus.filter((e:Edu)=>e.institution).map((e:Edu,i:number)=>(
          <div key={i} style={{ marginBottom:"0.5em" }}>
            <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm*1.02}em`, fontWeight:700, color:INK, ...NO_BREAK }}>{e.degree}</div>
            <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.86}em`, color:"#6B6B6B", marginBottom:"0.3em", ...NO_BREAK }}>{e.institution}</div>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.35em" }}>
              {e.field && <span style={eduChip}>{e.field}</span>}
              {eduRange(e) && <span style={eduChip}>{eduRange(e)}</span>}
            </div>
          </div>
        ))}
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #E0DDD8", marginTop:"1em", padding:"0.6em 0 0.9em", fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm*0.66}em`, color:"#9B8B7A", letterSpacing:"0.04em" }}>
          <span style={NO_BREAK}>{name} · {title}</span>
          <span style={{ whiteSpace:"nowrap" as const }}>GPS Talent Network · Confidential</span>
        </div>
      </div>
    </div>
  )
}

// ═══ TEMPLATE 2 — ARCHITECT (white, teal, full-height sidebar) ═══
function TplArchitect({ form, d }: { form:FormData; d:D }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const loc = f.personal.location || PH.location
  const link = (f.personal.linkedin || PH.linkedin || "").replace("https://","").replace(/\/notifications.*$/,"")
  const sum = f.summary || PH.summary
  const exps = f.experience.some((e:Exp)=>e.title) ? f.experience : PH.experience
  const edus = f.education.some((e:Edu)=>e.institution) ? f.education : PH.education
  const skills = f.skills.length>0 ? f.skills : PH.skills
  const langs = f.languages.filter((l:any)=>l.lang).length>0 ? f.languages : PH.languages
  const hob = f.hobbies||(d.showHobbies?PH.hobbies:"")
  const ach = f.achievements||(d.showAchievements?PH.achievements:"")
  const TEAL="#026B77", INK="#111827", MIST="#F4F7F7"
  const sec = (label:string) => (
    <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm}em`, fontWeight:800, color:TEAL, letterSpacing:"0.11em", textTransform:"uppercase" as const, marginTop:`${d.sectionGapEm*0.9}em`, marginBottom:"0.5em", display:"flex", alignItems:"center", gap:"0.6em" }}>
      {label}<div style={{ flex:1, height:"1.5px", background:"#E8EAEC" }} />
    </div>
  )
  const secS = (label:string) => (
    <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm*0.92}em`, fontWeight:800, color:"#FFF", letterSpacing:"0.11em", textTransform:"uppercase" as const, marginTop:`${d.sectionGapEm*0.9}em`, marginBottom:"0.5em" }}>{label}</div>
  )
  return (
    <div style={{ background:"#FFF", height:"100%", display:"flex", flexDirection:"column" as const, fontFamily:"Georgia,serif" }}>
      <div style={{ padding:`${d.headerPadVEm*0.82}em ${d.headerPadHEm*1.05}em`, borderBottom:`3px solid ${TEAL}`, display:"flex", alignItems:"flex-start", gap:"1.1em" }}>
        {f.personal.photo && (<img src={f.personal.photo} alt="" style={{ width:`${d.photoEm*0.8}em`, height:`${d.photoEm*0.8}em`, objectFit:"cover", borderRadius:"0.28em", flexShrink:0, border:"0.5px solid #E0E0E0", maxWidth:"100%" }} />)}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontWeight:900, fontSize:`${d.nameEm*1.02}em`, color:INK, letterSpacing:"-0.02em", lineHeight:1.05, marginBottom:"0.2em", ...NO_BREAK }}>{name.toUpperCase()}</div>
          <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.titleEm*0.88}em`, color:TEAL, fontWeight:600, letterSpacing:"0.09em", textTransform:"uppercase" as const, marginBottom:"0.45em", ...NO_BREAK }}>{title}</div>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.9em" }}>
            {[email,phone,loc,link].filter(Boolean).map((c:string,i:number)=>(<span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, color:"#6B7280", ...NO_BREAK }}>{c}</span>))}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", flex:1, overflow:"hidden", minHeight:0 }}>
        <div style={{ flex:1, padding:`${d.bodyPadEm*0.65}em ${d.bodyPadEm*0.85}em 0 ${d.headerPadHEm*1.05}em`, overflow:"hidden", minWidth:0, display:"flex", flexDirection:"column" as const }}>
          {sec("Profile")}
          <p style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, color:"#374151", lineHeight:d.lineHeight, margin:"0 0 0.28em", ...NO_BREAK }}>{sum}</p>
          {sec("Experience")}
          {exps.filter((e:Exp)=>e.title||e.company).map((e:Exp,i:number)=>(
            <div key={i} style={{ marginBottom:`${d.sectionGapEm*0.62}em`, paddingLeft:"0.65em", borderLeft:`0.17em solid ${i===0?TEAL:"#D1D5DB"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"0.4em" }}>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*1.03}em`, fontWeight:700, color:INK, ...NO_BREAK, flex:1 }}>{e.title}</span>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm*0.8}em`, color:"#9CA3AF", flexShrink:0, whiteSpace:"nowrap" as const }}>{fmtDate(e.startMonth,e.startYear)}{(e.startYear||e.endYear||e.current)?` – ${e.current?"Present":fmtDate(e.endMonth,e.endYear)}`:""}</span>
              </div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.86}em`, color:TEAL, fontWeight:600, marginBottom:"0.28em", ...NO_BREAK }}>{e.company}</div>
              {e.bullets.filter((b:string)=>b.trim()).map((b:string,j:number)=>(
                <div key={j} style={{ display:"flex", gap:"0.4em", marginBottom:"0.13em", alignItems:"flex-start" }}>
                  <span style={{ color:TEAL, fontWeight:700, fontSize:`${d.bulletEm*0.82}em`, flexShrink:0, marginTop:"0.18em", lineHeight:1 }}>›</span>
                  <p style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm}em`, color:"#4B5563", lineHeight:d.lineHeight, margin:0, ...NO_BREAK }}>{b}</p>
                </div>
              ))}
            </div>
          ))}
          {ach && (
            <div style={{ background:MIST, borderRadius:"0.32em", padding:"0.6em 0.8em", borderLeft:`0.18em solid ${TEAL}`, marginTop:`${d.sectionGapEm*0.45}em` }}>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm*0.8}em`, fontWeight:800, color:TEAL, letterSpacing:"0.09em", textTransform:"uppercase" as const, marginBottom:"0.32em" }}>Key Achievements</div>
              {ach.split("·").map((a:string)=>a.trim()).filter(Boolean).map((a:string,i:number)=>(
                <div key={i} style={{ display:"flex", gap:"0.4em", marginBottom:"0.13em", alignItems:"flex-start" }}>
                  <span style={{ color:TEAL, fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm*0.82}em`, flexShrink:0, marginTop:"0.1em" }}>✓</span>
                  <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm*0.88}em`, color:"#374151", lineHeight:d.lineHeight*0.86, ...NO_BREAK }}>{a}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex:1 }} />
          <div style={{ borderTop:"1px solid #E8EAEC", marginTop:"1em", padding:"0.6em 0 0.9em", fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.68}em`, color:"#9CA3AF", letterSpacing:"0.04em", ...NO_BREAK }}>{name} · {title} — GPS Talent Network · Confidential</div>
        </div>
        <div style={{ width:"32%", flexShrink:0, padding:`${d.bodyPadEm*0.65}em ${d.bodyPadEm*0.7}em`, background:TEAL, overflow:"hidden", minWidth:0, display:"flex", flexDirection:"column" as const }}>
          {secS("Skills")}
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.3em" }}>
            {skills.map((s:string,i:number)=>(<span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, background:"rgba(255,255,255,0.15)", color:"#EAF6F7", padding:"0.16em 0.55em", borderRadius:"1em", ...NO_BREAK }}>{s}</span>))}
          </div>
          {secS("Education")}
          {edus.filter((e:Edu)=>e.institution).map((e:Edu,i:number)=>(
            <div key={i} style={{ marginBottom:"0.55em" }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm*0.94}em`, fontWeight:700, color:"#FFF", lineHeight:1.3, ...NO_BREAK }}>{e.degree}</div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, color:"rgba(255,255,255,0.7)", marginBottom:"0.3em", ...NO_BREAK }}>{e.institution}</div>
              <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.3em" }}>
                {e.field && <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.76}em`, background:"rgba(255,255,255,0.18)", color:"#EAF6F7", padding:"0.14em 0.5em", borderRadius:"1em", ...NO_BREAK }}>{e.field}</span>}
                {eduRange(e) && <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.76}em`, background:"rgba(255,255,255,0.18)", color:"#EAF6F7", padding:"0.14em 0.5em", borderRadius:"1em", ...NO_BREAK }}>{eduRange(e)}</span>}
              </div>
            </div>
          ))}
          {secS("Languages")}
          {langs.filter((l:any)=>l.lang).map((l:any,i:number)=>(
            <div key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.84}em`, color:"rgba(255,255,255,0.85)", marginBottom:"0.22em", ...NO_BREAK }}>
              <span style={{ fontWeight:700, color:"#FFF" }}>{l.lang}</span><span style={{ color:"rgba(255,255,255,0.55)" }}> · {l.level}</span>
            </div>
          ))}
          <div style={{ marginTop:"auto" }}>
            {hob && (<>{secS("Interests")}<div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, color:"rgba(255,255,255,0.7)", lineHeight:d.lineHeight*0.88, ...NO_BREAK }}>{hob}</div></>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ TEMPLATE 3 — MERIDIAN (navy header, full-height body, footer) ═══
function TplMeridian({ form, d }: { form:FormData; d:D }) {
  const f = form
  const name = f.personal.name || PH.name
  const title = f.personal.title || PH.title
  const email = f.personal.email || PH.email
  const phone = f.personal.phone || PH.phone
  const loc = f.personal.location || PH.location
  const link = (f.personal.linkedin || PH.linkedin || "").replace("https://","").replace(/\/notifications.*$/,"")
  const sum = f.summary || PH.summary
  const exps = f.experience.some((e:Exp)=>e.title) ? f.experience : PH.experience
  const edus = f.education.some((e:Edu)=>e.institution) ? f.education : PH.education
  const skills = f.skills.length>0 ? f.skills : PH.skills
  const langs = f.languages.filter((l:any)=>l.lang).length>0 ? f.languages : PH.languages
  const hob = f.hobbies||(d.showHobbies?PH.hobbies:"")
  const ach = f.achievements||(d.showAchievements?PH.achievements:"")
  const NAVY="#0F2742", BLUE="#2E6DA4", INK="#1A2330", MIST="#F5F8FB"
  const sec = (label:string, color:string) => (
    <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm}em`, fontWeight:800, color:color, letterSpacing:"0.1em", textTransform:"uppercase" as const, marginTop:`${d.sectionGapEm*0.85}em`, marginBottom:"0.45em", display:"flex", alignItems:"center", gap:"0.5em" }}>
      {label}<div style={{ flex:1, height:"1px", background:"#E3E9F0" }} />
    </div>
  )
  return (
    <div style={{ background:"#FFF", height:"100%", display:"flex", flexDirection:"column" as const, fontFamily:"Georgia,serif" }}>
      <div style={{ background:NAVY, padding:`${d.headerPadVEm*0.8}em ${d.headerPadHEm}em`, display:"flex", alignItems:"center", gap:"1.1em", flexShrink:0 }}>
        {f.personal.photo ? (<img src={f.personal.photo} alt="" style={{ width:`${d.photoEm*0.72}em`, height:`${d.photoEm*0.72}em`, borderRadius:"50%", objectFit:"cover", border:"0.12em solid rgba(255,255,255,0.5)", flexShrink:0, maxWidth:"100%" }} />) : (
          <div style={{ width:`${d.photoEm*0.72}em`, height:`${d.photoEm*0.72}em`, borderRadius:"50%", background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.7)", fontFamily:"Arial,sans-serif", fontWeight:700, fontSize:`${d.photoEm*0.22}em`, flexShrink:0 }}>{initials(name)}</div>
        )}
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.nameEm*0.92}em`, fontWeight:700, color:"#FFF", lineHeight:1.1, ...NO_BREAK }}>{name}</div>
          <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.titleEm*0.82}em`, color:"#9FC1E0", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" as const, margin:"0.2em 0 0.4em", ...NO_BREAK }}>{title}</div>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.8em" }}>
            {[email,phone,loc,link].filter(Boolean).map((c:string,i:number)=>(<span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.76}em`, color:"rgba(255,255,255,0.6)", ...NO_BREAK }}>{c}</span>))}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", flex:1, overflow:"hidden", minHeight:0 }}>
        <div style={{ flex:1, padding:`${d.bodyPadEm*0.6}em ${d.bodyPadEm*0.85}em 0 ${d.headerPadHEm}em`, overflow:"hidden", minWidth:0, display:"flex", flexDirection:"column" as const }}>
          {sec("Profile", BLUE)}
          <p style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, color:"#374151", lineHeight:d.lineHeight, margin:"0 0 0.28em", ...NO_BREAK }}>{sum}</p>
          {sec("Experience", BLUE)}
          {exps.filter((e:Exp)=>e.title||e.company).map((e:Exp,i:number)=>(
            <div key={i} style={{ marginBottom:`${d.sectionGapEm*0.6}em` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"0.4em" }}>
                <span style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm*1.05}em`, fontWeight:700, color:INK, ...NO_BREAK, flex:1 }}>{e.title}</span>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm*0.8}em`, color:"#9CA3AF", flexShrink:0, whiteSpace:"nowrap" as const }}>{fmtDate(e.startMonth,e.startYear)}{(e.startYear||e.endYear||e.current)?` – ${e.current?"Present":fmtDate(e.endMonth,e.endYear)}`:""}</span>
              </div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.86}em`, color:BLUE, fontWeight:600, marginBottom:"0.28em", ...NO_BREAK }}>{e.company}</div>
              {e.bullets.filter((b:string)=>b.trim()).map((b:string,j:number)=>(
                <div key={j} style={{ display:"flex", gap:"0.45em", marginBottom:"0.13em", alignItems:"flex-start" }}>
                  <span style={{ color:BLUE, fontSize:`${d.bulletEm*0.82}em`, flexShrink:0, marginTop:"0.2em", lineHeight:1 }}>▸</span>
                  <p style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm}em`, color:"#4B5563", lineHeight:d.lineHeight, margin:0, ...NO_BREAK }}>{b}</p>
                </div>
              ))}
            </div>
          ))}
          {ach && (
            <div style={{ background:MIST, borderRadius:"0.3em", padding:"0.6em 0.8em", borderLeft:`0.18em solid ${BLUE}`, marginTop:`${d.sectionGapEm*0.4}em` }}>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm*0.8}em`, fontWeight:800, color:BLUE, letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:"0.3em" }}>Key Achievements</div>
              {ach.split("·").map((a:string)=>a.trim()).filter(Boolean).map((a:string,i:number)=>(
                <div key={i} style={{ display:"flex", gap:"0.4em", marginBottom:"0.12em", alignItems:"flex-start" }}>
                  <span style={{ color:BLUE, fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm*0.82}em`, flexShrink:0, marginTop:"0.1em" }}>✓</span>
                  <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm*0.86}em`, color:"#374151", lineHeight:d.lineHeight*0.86, ...NO_BREAK }}>{a}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex:1 }} />
          <div style={{ borderTop:"1px solid #E3E9F0", marginTop:"1em", padding:"0.6em 0 0.9em", fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.68}em`, color:"#9CA3AF", letterSpacing:"0.04em", ...NO_BREAK }}>{name} · {title} — GPS Talent Network · Confidential</div>
        </div>
        <div style={{ width:"33%", flexShrink:0, padding:`${d.bodyPadEm*0.6}em ${d.bodyPadEm*0.7}em`, background:MIST, borderLeft:"1px solid #E3E9F0", overflow:"hidden", minWidth:0, display:"flex", flexDirection:"column" as const }}>
          {sec("Skills", BLUE)}
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.3em" }}>
            {skills.map((s:string,i:number)=>(<span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, background:"#E7EEF6", color:"#274B72", padding:"0.16em 0.55em", borderRadius:"1em", ...NO_BREAK }}>{s}</span>))}
          </div>
          {sec("Education", BLUE)}
          {edus.filter((e:Edu)=>e.institution).map((e:Edu,i:number)=>(
            <div key={i} style={{ marginBottom:"0.55em" }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm*0.94}em`, fontWeight:700, color:INK, lineHeight:1.3, ...NO_BREAK }}>{e.degree}</div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, color:"#6B7280", marginBottom:"0.3em", ...NO_BREAK }}>{e.institution}</div>
              <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.3em" }}>
                {e.field && <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.76}em`, background:"#E7EEF6", color:"#274B72", padding:"0.14em 0.5em", borderRadius:"1em", ...NO_BREAK }}>{e.field}</span>}
                {eduRange(e) && <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.76}em`, background:"#E7EEF6", color:"#274B72", padding:"0.14em 0.5em", borderRadius:"1em", ...NO_BREAK }}>{eduRange(e)}</span>}
              </div>
            </div>
          ))}
          {sec("Languages", BLUE)}
          {langs.filter((l:any)=>l.lang).map((l:any,i:number)=>(
            <div key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.84}em`, color:"#374151", marginBottom:"0.22em", ...NO_BREAK }}>
              <span style={{ fontWeight:700, color:INK }}>{l.lang}</span><span style={{ color:"#9CA3AF" }}> · {l.level}</span>
            </div>
          ))}
          <div style={{ marginTop:"auto" }}>
            {hob && (<>{sec("Interests", BLUE)}<div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm*0.8}em`, color:"#6B7280", lineHeight:d.lineHeight*0.88, ...NO_BREAK }}>{hob}</div></>)}
          </div>
        </div>
      </div>
    </div>
  )
}

const TEMPLATES = [
  { id:"prestige",  name:"Prestige",  sub:"Finance · C-Suite · Legal",   component:TplPrestige },
  { id:"architect", name:"Architect", sub:"Tech · Strategy · Ops",       component:TplArchitect },
  { id:"meridian",  name:"Meridian",  sub:"HR · Sales · Marketing",      component:TplMeridian },
]

// ── CV PREVIEW ────────────────────────────────────────────────────────────────
// basePx drives ALL sizing inside the CV (everything is in em).
// It has two inputs:
//   1. Box width  → keeps the CV proportional at any preview size
//   2. Density t  → scales type UP when content is sparse so it fills the page
//
// At t=0 (empty CV):  font is 45% larger than at t=1 (full CV)
// At t=1 (full CV):   font is at baseline — nothing overflows
// This means a candidate with 1 job gets text that fills the page just like
// a candidate with 4 jobs — the type simply breathes more.
function CVPreview({ form, templateId }: { form:FormData; templateId:string }) {
  const [boxWidth, setBoxWidth] = useState(790)
  const [boost, setBoost] = useState(1)
  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current; if(!el) return
    const update = () => setBoxWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update); ro.observe(el)
    return ()=>ro.disconnect()
  },[])

  const density = getContentDensity(form)
  const tpl = TEMPLATES.find(t=>t.id===templateId)||TEMPLATES[0]
  const TplComponent = tpl.component
  const densityFactor = lerp(1.22, 1.0, Math.min(density.t, 1))
  const basePx = Math.round(9.5 * densityFactor * 10) / 10

  const A4W = 794, A4H = 1123
  const scale = Math.min(1, boxWidth / A4W)

  useEffect(() => {
    const m = measureRef.current; if(!m) return
    const natural = m.getBoundingClientRect().height
    if(!natural) return
    let b = A4H / natural
    b = Math.max(1, Math.min(1.7, b))
    setBoost(Math.round(b*100)/100)
  }, [form, templateId, basePx])

  const dFit = { ...density,
    lineHeight: Math.round(density.lineHeight*boost*1000)/1000,
    sectionGapEm: Math.round(density.sectionGapEm*boost*1000)/1000,
    headerPadVEm: Math.round(density.headerPadVEm*boost*1000)/1000,
    bodyPadEm: Math.round(density.bodyPadEm*boost*1000)/1000,
  }

  return (
    <div style={{ background:"#1a2228", padding:"14px", borderRadius:"10px", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px" }}>
        <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e" }} />
        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" as const }}>Live preview</span>
        <span style={{ marginLeft:"auto", fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>A4</span>
      </div>
      <div ref={measureRef} aria-hidden={true} style={{ position:"absolute" as const, left:"-99999px", top:0, width:A4W+"px", height:"auto", fontSize:`${basePx}px`, visibility:"hidden" as const, pointerEvents:"none" as const }}>
        <TplComponent form={form} d={density} />
      </div>
      <div ref={boxRef} style={{ flex:1, overflow:"hidden", display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
        <div style={{ position:"relative" as const, width:Math.round(A4W*scale)+"px", height:Math.round(A4H*scale)+"px" }}>
          <div id="cv-preview-print" style={{ position:"absolute" as const, top:0, left:0, width:A4W+"px", height:A4H+"px", background:"white", borderRadius:"3px", boxShadow:"0 6px 24px rgba(0,0,0,0.28)", overflow:"hidden", fontSize:`${basePx}px`, transform:`scale(${scale})`, transformOrigin:"top left", WebkitFontSmoothing:"antialiased" as const }}>
            <TplComponent form={form} d={dFit} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PREMIUM DATE PICKER ───────────────────────────────────────────────────────
function DatePicker({ label, month, year, onMonth, onYear, disabled=false }:
  { label:string; month:string; year:string; onMonth:(v:string)=>void; onYear:(v:string)=>void; disabled?:boolean }) {
  const sel:React.CSSProperties = { padding:"9px 10px", border:"1.5px solid #e5e7eb", borderRadius:"9px", fontSize:"13px", color:disabled?"#9ca3af":"#0a1f24", background:disabled?"#f9fafb":"white", cursor:disabled?"default":"pointer", outline:"none", appearance:"none" as const, WebkitAppearance:"none" as const }
  return (
    <div>
      <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"#6b7280", marginBottom:"5px", letterSpacing:".02em" }}>{label}</label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
        <select style={sel} value={month} disabled={disabled} onChange={e=>onMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}
        </select>
        <select style={sel} value={year} disabled={disabled} onChange={e=>onYear(e.target.value)}>
          <option value="">Year</option>
          {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CVBuilderPage() {
  const [activeTab, setActiveTab] = useState<"builder"|"reviewer">("builder")
  const [pendingAutosave, setPendingAutosave] = useState(false)
  useEffect(()=>{
    if(typeof window!=="undefined"){
      const p=new URLSearchParams(window.location.search)
      if(p.get("tab")==="reviewer") setActiveTab("reviewer")
      if(p.get("autosave")==="1") {
        // User returned from login — go to template step and trigger save
        setPendingAutosave(true)
        // Clean URL
        const url = new URL(window.location.href)
        url.searchParams.delete("autosave")
        window.history.replaceState({}, "", url.toString())
      }
    }
  },[])

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      try { const _s = window.localStorage.getItem("cvbuilder_preview_form"); if (_s) return { ...INITIAL, ...JSON.parse(_s) } } catch (_e) {}
    }
    return INITIAL
  })
  useEffect(() => {
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("cvbuilder_preview_form", JSON.stringify(form)) } catch (_e) {}
    }
  }, [form])
  const [selectedTemplate, setSelectedTemplate] = useState("prestige")
  const [generating, setGenerating] = useState(false)
  const [generatingBullet, setGeneratingBullet] = useState<number|null>(null)
  const [saving, setSaving] = useState(false)
  // Trigger save when returning from login with autosave=1
  useEffect(()=>{
    if(!pendingAutosave) return
    setPendingAutosave(false)
    // Jump to template step so they see their CV, then auto-save
    setStep(STEPS.length - 1)
    setActiveTab("builder")
    // Small delay so the component renders before we call save
    setTimeout(()=>{ handleSaveAndDownload() }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingAutosave])
  const [showSignup, setShowSignup] = useState(false)
  const [authMode, setAuthMode] = useState<"signup"|"signin"|"forgot">("signup")
  const [authForgotSent, setAuthForgotSent] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [reviewFile, setReviewFile] = useState<File|null>(null)
  const [reviewText, setReviewText] = useState("")
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
  const isTemplateStep = currentStepId === "template"

  const setPersonal = (k: keyof FormData["personal"], v: string) =>
    setForm(f=>({...f,personal:{...f.personal,[k]:v}}))

  async function generateSummary() {
    if(!form.personal.title) return
    setGenerating(true)
    const density = getContentDensity(form)
    try {
      const res = await fetch("/api/generate-cv",{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ type:"summary", title:form.personal.title, level:form.level, function:form.job_function, experience:form.experience, skills:form.skills, location:form.personal.location, targetWords:density.summaryTargetWords, isSparse:density.isSparse }) })
      const data = await res.json()
      if(data.text) setForm(f=>({...f,summary:data.text}))
    } catch{}
    setGenerating(false)
  }

  async function generateBullets(idx: number) {
    const exp = form.experience[idx]
    if(!exp.title||!exp.company) return
    setGeneratingBullet(idx)
    const density = getContentDensity(form)
    try {
      const res = await fetch("/api/generate-cv",{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ type:"bullets", title:exp.title, company:exp.company, roughBullets:exp.bullets.filter(b=>b.trim()), minBullets:density.minBulletsPerRole }) })
      const data = await res.json()
      if(data.bullets){ const u=[...form.experience]; u[idx]={...u[idx],bullets:data.bullets}; setForm(f=>({...f,experience:u})) }
    } catch{}
    setGeneratingBullet(null)
  }

  async function generateAchievements() {
    if(!form.personal.title) return
    try {
      const res = await fetch("/api/generate-cv",{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ type:"achievements", title:form.personal.title, level:form.level, function:form.job_function, experience:form.experience }) })
      const data = await res.json()
      if(data.text) setForm(f=>({...f,achievements:data.text}))
    } catch{}
  }

  function addExp() { setForm(f=>({...f,experience:[...f.experience,{ company:"",title:"",startMonth:"",startYear:"",endMonth:"",endYear:"",current:false,bullets:[""] }]})) }
  function removeExp(i:number){ setForm(f=>({...f,experience:f.experience.filter((_,idx)=>idx!==i)})) }
  function updateExp(i:number, k:string, v:any){ const u=[...form.experience]; u[i]={...u[i],[k]:v}; setForm(f=>({...f,experience:u})) }
  function updateBullet(ei:number,bi:number,v:string){ const u=[...form.experience]; const b=[...u[ei].bullets]; b[bi]=v; u[ei]={...u[ei],bullets:b}; setForm(f=>({...f,experience:u})) }
  function addEdu(){ setForm(f=>({...f,education:[...f.education,{institution:"",degree:"",field:"",startYear:"",endYear:""}]})) }
  function updateEdu(i:number,k:string,v:string){ const u=[...form.education]; u[i]={...u[i],[k]:v}; setForm(f=>({...f,education:u})) }
  function toggleSkill(s:string){ setForm(f=>({...f,skills:f.skills.includes(s)?f.skills.filter(x=>x!==s):[...f.skills,s]})) }
  function handlePhoto(e:React.ChangeEvent<HTMLInputElement>){ const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=ev=>setPersonal("photo",ev.target?.result as string); r.readAsDataURL(file) }

  function triggerPDFDownload(){
    if(typeof window==="undefined") return
    const style=document.createElement("style")
    // Use a density-aware font size at print time too
    const printDensity = getContentDensity(form)
    const printDensityFactor = 1.0 + (1.0 - Math.min(printDensity.t, 1)) * 0.22
    const printBasePx = Math.round(9.5 * printDensityFactor * 10) / 10
    style.innerHTML=`@media print{body *{visibility:hidden}#cv-preview-print,#cv-preview-print *{visibility:visible}#cv-preview-print{position:fixed;left:0;top:0;width:210mm;height:297mm;box-shadow:none;border-radius:0;transform:none;font-size:${printBasePx}px}}`
    document.head.appendChild(style); window.print(); setTimeout(()=>document.head.removeChild(style),1000)
  }

  async function handleSaveAndDownload(){
    const user=(await supabase.auth.getUser()).data.user
    if(!user){ setShowSignup(true); return }
    setSaving(true)
    try {
      const { data:upserted } = await supabase.from("candidates").upsert({
        user_id:user.id, full_name:form.personal.name,
        email:form.personal.email||user.email, phone:form.personal.phone,
        location:form.personal.location, nationality:form.personal.nationality,
        job_function:form.job_function, level:form.level,
        cv_summary:form.summary, skills:form.skills,
        source:"cv_builder", template_used:selectedTemplate,
        updated_at:new Date().toISOString(),
      },{ onConflict:"user_id" }).select("id").single()
      const candidateId=upserted?.id
      if(candidateId){
        const cvText=[form.personal.name,form.personal.title,form.level,form.job_function,form.summary,
          form.experience.map(e=>`${e.title} at ${e.company}: ${e.bullets.filter(b=>b.trim()).join(". ")}`).join("\n"),
          form.skills.join(", "),form.education.map(e=>`${e.degree} ${e.field} ${e.institution}`).join(", "),
          form.languages.map(l=>`${l.lang} ${l.level}`).join(", "),
        ].filter(Boolean).join("\n")
        fetch("/api/extract-structured",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidateId,cv_text:cvText})})
          .then(()=>fetch("/api/generate-embedding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidateId,text:cvText})}))
          .catch(()=>{})
        fetch("/api/generate-cv-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidateId,form,templateId:selectedTemplate})}).catch(()=>{})
      }
      triggerPDFDownload()
      window.location.href="/cv-builder/success"
    } catch(err){ console.error(err) }
    setSaving(false)
  }

  async function handleSignupAndSave(){
    setAuthLoading(true); setAuthError("")
    const{error}=await supabase.auth.signUp({email,password})
    if(error){
      // Existing account — switch to signin mode with email pre-filled
      if(error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists")){
        setAuthMode("signin")
        setAuthError("You already have an account. Sign in below.")
      } else {
        setAuthError(error.message)
      }
      setAuthLoading(false); return
    }
    setShowSignup(false); await handleSaveAndDownload(); setAuthLoading(false)
  }

  async function handleSigninAndSave(){
    setAuthLoading(true); setAuthError("")
    const{error}=await supabase.auth.signInWithPassword({email,password})
    if(error){ setAuthError("Incorrect password. Try again or reset it below."); setAuthLoading(false); return }
    setShowSignup(false); await handleSaveAndDownload(); setAuthLoading(false)
  }

  async function handleForgotPassword(){
    setAuthLoading(true); setAuthError("")
    const{error}=await supabase.auth.resetPasswordForEmail(email,{
      redirectTo: `${window.location.origin}/cv-builder?autosave=1`
    })
    if(error){ setAuthError("Could not send reset email. Check your address."); setAuthLoading(false); return }
    setAuthForgotSent(true); setAuthLoading(false)
  }

  async function handleReview(){
    if(!reviewFile) return
    setReviewing(true); setReviewSaved(false); setReviewEmail(""); setReviewPassword(""); setReviewAuthError("")
    try {
      const text=await reviewFile.text(); setReviewText(text)
      const res=await fetch("/api/generate-cv",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"review",cvText:text.slice(0,4000)})})
      const data=await res.json(); if(data.email) setReviewEmail(data.email); setReviewResult(data)
    } catch{}
    setReviewing(false)
  }

  async function handleReviewSave(){
    if(!reviewEmail||!reviewPassword) return
    setReviewSaving(true); setReviewAuthError("")
    try {
      const{error:e}=await supabase.auth.signUp({email:reviewEmail,password:reviewPassword})
      if(e&&!e.message.includes("already registered")){ setReviewAuthError(e.message); setReviewSaving(false); return }
      const{data:ru}=await supabase.from("candidates").upsert({
        email:reviewEmail,full_name:reviewResult?.name||"",name:reviewResult?.name||"",
        current_title:reviewResult?.current_title||"",current_company:reviewResult?.current_company||"",
        cv_text:reviewText.slice(0,50000),cv_score:reviewResult?.score||null,
        source:"cv_reviewer",updated_at:new Date().toISOString(),
      },{onConflict:"email"}).select("id").single()
      const rid=ru?.id
      if(rid&&reviewText.trim()){
        fetch("/api/extract-structured",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidateId:rid,cv_text:reviewText.slice(0,50000)})})
          .then(()=>fetch("/api/generate-embedding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidateId:rid,text:reviewText.slice(0,8000)})}))
          .catch(()=>{})
      }
      setReviewSaved(true)
    } catch(err:any){ setReviewAuthError(err.message||"Something went wrong") }
    setReviewSaving(false)
  }

  const suggestedSkills = SKILL_SUGGESTIONS[form.job_function] || Object.values(SKILL_SUGGESTIONS).flat().slice(0,12)
  const inp:React.CSSProperties = { width:"100%", padding:"10px 13px", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontSize:"13px", color:"#0a1f24", outline:"none", fontFamily:"inherit", background:"white", boxSizing:"border-box" as const }
  const sel:React.CSSProperties = { ...inp, cursor:"pointer" }
  const lbl:React.CSSProperties = { display:"block", fontSize:"11px", fontWeight:600, color:"#6b7280", marginBottom:"5px", letterSpacing:".02em" }

  const TOPBAR_H = 49
  const BODY_H = `calc(100vh - 64px - ${TOPBAR_H}px)`

  return (
    <div style={{ minHeight:"100vh", background:"#f0f2f4" }}>
      {/* Topbar */}
      <div style={{ background:"white", borderBottom:"1px solid #e8ecef", padding:"0 24px", height:`${TOPBAR_H}px`, display:"flex", alignItems:"center", gap:"16px" }}>
        <button onClick={()=>window.history.back()} style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", color:"#6b7280", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:500 }}>
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ width:"1px", height:"18px", background:"#e5e7eb" }} />
        <span style={{ fontSize:"13px", fontWeight:700, color:"#0a1f24", letterSpacing:"-0.01em" }}>CV Builder</span>
        {/* Template pills — only on template step */}
        {activeTab==="builder" && isTemplateStep && (
          <div style={{ display:"flex", gap:"4px", marginLeft:"12px" }}>
            {TEMPLATES.map(t=>(
              <button key={t.id} onClick={()=>setSelectedTemplate(t.id)}
                style={{ padding:"5px 12px", borderRadius:"6px", border:"1.5px solid", fontSize:"11px", fontWeight:700, cursor:"pointer", transition:"all .12s",
                  borderColor:selectedTemplate===t.id?"#028090":"#e5e7eb",
                  background:selectedTemplate===t.id?"#028090":"white",
                  color:selectedTemplate===t.id?"white":"#6b7280" }}>
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
          {(["builder","reviewer"] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{ padding:"6px 14px", borderRadius:"7px", border:"1.5px solid", fontSize:"12px", fontWeight:600, cursor:"pointer",
                borderColor:activeTab===t?"#028090":"#e5e7eb",
                background:activeTab===t?"#028090":"white",
                color:activeTab===t?"white":"#374151" }}>
              {t==="builder"?"Build CV":"Review CV"}
            </button>
          ))}
        </div>
      </div>

      {/* REVIEWER */}
      {activeTab==="reviewer" && (
        <div style={{ maxWidth:"680px", margin:"40px auto", padding:"0 24px 80px" }}>
          <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e8ecef", padding:"36px" }}>
            <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"8px" }}>AI CV Review</h2>
            <p style={{ color:"#9ca3af", fontSize:"14px", marginBottom:"28px" }}>Upload your existing CV and get an instant AI score with specific improvement suggestions for the MENA market.</p>
            {!reviewResult ? (
              <>
                <div onClick={()=>document.getElementById("review-input")?.click()}
                  style={{ border:"2px dashed #d1d5db", borderRadius:"14px", padding:"40px", textAlign:"center" as const, cursor:"pointer", marginBottom:"20px", background:reviewFile?"#f0fdf4":"white" }}>
                  <Upload size={28} color={reviewFile?"#028090":"#9ca3af"} style={{ margin:"0 auto 12px" }} />
                  <p style={{ fontWeight:600, color:reviewFile?"#028090":"#374151", fontSize:"15px", margin:0 }}>{reviewFile?reviewFile.name:"Drop your CV here"}</p>
                  <p style={{ color:"#9ca3af", fontSize:"13px", margin:"4px 0 0" }}>PDF or Word · Max 5MB</p>
                  <input id="review-input" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display:"none" }} onChange={e=>setReviewFile(e.target.files?.[0]||null)} />
                </div>
                <button onClick={handleReview} disabled={!reviewFile||reviewing}
                  style={{ width:"100%", padding:"14px", background:reviewFile?"#028090":"#e5e7eb", color:reviewFile?"white":"#9ca3af", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"15px", cursor:reviewFile?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  {reviewing?<><Loader2 size={16} className="animate-spin"/>Analysing…</>:<><Sparkles size={16}/>Analyse with AI</>}
                </button>
              </>
            ) : (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}>
                  {[{val:reviewResult.score||72,label:"CV score / 100",bg:"#f0fdf4",border:"#bbf7d0",color:"#059669"},
                    {val:reviewResult.strengths?.length||3,label:"Strengths",bg:"#f0fdf4",border:"#bbf7d0",color:"#059669"},
                    {val:reviewResult.concerns?.length||3,label:"Areas to improve",bg:"#fffbeb",border:"#fde68a",color:"#d97706"}
                  ].map((s,i)=>(
                    <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:"12px", padding:"16px", textAlign:"center" as const }}>
                      <div style={{ fontSize:"28px", fontWeight:800, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"#f9fafb", borderRadius:"12px", padding:"16px", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"#374151", lineHeight:1.7, margin:0 }}>{reviewResult.summary}</p>
                </div>
                {reviewResult.strengths?.length>0&&(
                  <div style={{ marginBottom:"12px" }}>
                    <p style={{ fontSize:"12px", fontWeight:600, color:"#059669", marginBottom:"8px" }}>✓ Strengths</p>
                    {reviewResult.strengths.map((s:string,i:number)=>(
                      <div key={i} style={{ fontSize:"13px", color:"#374151", padding:"6px 0", borderBottom:i<reviewResult.strengths.length-1?"1px solid #f3f4f6":"none" }}>• {s}</div>
                    ))}
                  </div>
                )}
                {reviewResult.concerns?.length>0&&(
                  <div style={{ marginBottom:"20px" }}>
                    <p style={{ fontSize:"12px", fontWeight:600, color:"#d97706", marginBottom:"8px" }}>⚠ Areas to improve</p>
                    {reviewResult.concerns.map((c:string,i:number)=>(
                      <div key={i} style={{ fontSize:"13px", color:"#374151", padding:"6px 0", borderBottom:i<reviewResult.concerns.length-1?"1px solid #f3f4f6":"none" }}>• {c}</div>
                    ))}
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                  <button onClick={()=>{setReviewResult(null);setReviewFile(null);setReviewSaved(false)}} style={{ padding:"12px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:"pointer", color:"#374151" }}>Review another CV</button>
                  <button onClick={()=>setActiveTab("builder")} style={{ padding:"12px", background:"#028090", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}><Sparkles size={13}/>Rebuild with AI</button>
                </div>
                {!reviewSaved?(
                  <div style={{ background:"linear-gradient(135deg,#0a1f24,#1a3a3a)", borderRadius:"16px", padding:"20px 22px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                      <CheckCircle size={16} color="#a8d5d1"/>
                      <p style={{ fontWeight:700, color:"white", fontSize:"14px", margin:0 }}>Save your CV to the GPS Talent Network</p>
                    </div>
                    <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"12px", lineHeight:1.6, marginBottom:"14px" }}>GPS recruiters will find you when a matching role opens. Free — 10 seconds.</p>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"12px" }}>
                      <input style={{ width:"100%", padding:"9px 12px", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", fontSize:"13px", background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }} type="email" placeholder="Your email" value={reviewEmail} onChange={e=>setReviewEmail(e.target.value)}/>
                      <input style={{ width:"100%", padding:"9px 12px", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", fontSize:"13px", background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }} type="password" placeholder="Choose a password" value={reviewPassword} onChange={e=>setReviewPassword(e.target.value)}/>
                    </div>
                    {reviewAuthError&&<p style={{ color:"#fca5a5", fontSize:"12px", marginBottom:"8px" }}>{reviewAuthError}</p>}
                    <button onClick={handleReviewSave} disabled={reviewSaving||!reviewEmail||!reviewPassword}
                      style={{ width:"100%", padding:"11px", background:"#028090", border:"none", borderRadius:"9px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", opacity:(!reviewEmail||!reviewPassword)?0.5:1 }}>
                      {reviewSaving?<><Loader2 size={13} className="animate-spin"/>Saving…</>:<>Save to GPS Network<ArrowRight size={13}/></>}
                    </button>
                  </div>
                ):(
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"14px", padding:"18px 20px", display:"flex", alignItems:"center", gap:"12px" }}>
                    <CheckCircle size={20} color="#059669"/>
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

      {/* BUILDER */}
      {activeTab==="builder" && (
        <div style={{ display:"grid", gridTemplateColumns:isTemplateStep?"440px 1fr":"1fr", height:BODY_H, overflow:"hidden" }}>
          {/* Form panel */}
          <div style={{ background:"white", borderRight:isTemplateStep?"1px solid #e8ecef":"none", display:"flex", flexDirection:"column" as const, overflow:"hidden", maxWidth:isTemplateStep?"440px":"720px", margin:isTemplateStep?"0":"0 auto", width:"100%" }}>
            {/* Step progress */}
            <div style={{ padding:"12px 24px 10px", borderBottom:"1px solid #f3f4f6" }}>
              <div style={{ display:"flex", alignItems:"center" }}>
                {STEPS.map((s,i)=>{
                  const Icon=s.icon; const done=i<step; const active=i===step
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", flex:i<STEPS.length-1?1:"none" }}>
                      <button onClick={()=>i<=step&&setStep(i)}
                        style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"2px", background:"none", border:"none", cursor:i<=step?"pointer":"default", padding:0, flexShrink:0 }}>
                        <div style={{ width:"24px", height:"24px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                          background:done?"#028090":active?"#0a1f24":"#f3f4f6", border:active?"2px solid #028090":"none", transition:"all 0.2s" }}>
                          {done?<CheckCircle size={12} color="white"/>:<Icon size={11} color={active?"white":"#9ca3af"}/>}
                        </div>
                        <span style={{ fontSize:"8px", fontWeight:600, color:active?"#0a1f24":done?"#028090":"#9ca3af", whiteSpace:"nowrap" as const }}>{s.label}</span>
                      </button>
                      {i<STEPS.length-1&&<div style={{ flex:1, height:"1.5px", background:done?"#028090":"#f3f4f6", margin:"0 3px 10px", borderRadius:"99px" }}/>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Form scroll */}
            <div style={{ flex:1, overflowY:"auto" as const, padding:isTemplateStep?"18px 24px":"32px 40px" }}>

              {/* STEP 1: PERSONAL */}
              {currentStepId==="personal"&&(
                <div>
                  <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Personal details</h2>
                  <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>Start with the basics. Your photo is strongly recommended for the MENA market.</p>
            <button type="button" onClick={()=>{ setForm(SAMPLE_FORM); setStep(STEPS.length-1) }} style={{ marginBottom:"18px", padding:"9px 14px", background:"#0a1f24", color:"#fff", border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>⚡ Fill test data &amp; jump to preview</button>
                  {/* Photo */}
                  <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"24px", padding:"16px 20px", background:"#f9fafb", borderRadius:"14px", border:"1px solid #e8ecef" }}>
                    <div style={{ position:"relative", cursor:"pointer", flexShrink:0 }} onClick={()=>photoRef.current?.click()}>
                      {form.personal.photo?(
                        <img src={form.personal.photo} style={{ width:"64px", height:"64px", borderRadius:"50%", objectFit:"cover", border:"3px solid #028090" }} alt=""/>
                      ):(
                        <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", border:"2px dashed #d1d5db" }}>
                          <Camera size={22} color="#9ca3af"/>
                        </div>
                      )}
                      <div style={{ position:"absolute", bottom:0, right:0, width:"20px", height:"20px", background:"#028090", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
                        <Plus size={10} color="white"/>
                      </div>
                    </div>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
                    <div>
                      <p style={{ fontWeight:700, color:"#0a1f24", fontSize:"14px", margin:0 }}>Profile photo</p>
                      <p style={{ color:"#6b7280", fontSize:"12px", margin:"3px 0 10px" }}>Strongly recommended for Egypt & MENA</p>
                      <button onClick={()=>photoRef.current?.click()} style={{ padding:"6px 14px", background:"#028090", color:"white", border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>
                        {form.personal.photo?"Change photo":"Upload photo"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={lbl}>Full name *</label>
                      <input style={inp} placeholder="Your full name" value={form.personal.name} onChange={e=>setPersonal("name",e.target.value)}/>
                    </div>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={lbl}>Current job title *</label>
                      <input style={inp} placeholder="e.g. Finance Manager" value={form.personal.title} onChange={e=>setPersonal("title",e.target.value)}/>
                    </div>
                    <div>
                      <label style={lbl}>Email</label>
                      <input style={inp} type="email" placeholder="name@company.com" value={form.personal.email} onChange={e=>setPersonal("email",e.target.value)}/>
                    </div>
                    <div>
                      <label style={lbl}>Phone</label>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <div style={{ ...inp, width:"52px", flexShrink:0, background:"#f9fafb", color:"#9ca3af", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 6px" }}>+20</div>
                        <input style={{ ...inp, flex:1 }} placeholder="100 123 4567"
                          value={form.personal.phone.replace(/^\+20\s?/,"")}
                          onChange={e=>setPersonal("phone","+20 "+e.target.value)}/>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>City / Location</label>
                      <input style={inp} placeholder="Cairo, Egypt" value={form.personal.location} onChange={e=>setPersonal("location",e.target.value)}/>
                    </div>
                    <div>
                      <label style={lbl}>Nationality</label>
                      <select style={sel} value={form.personal.nationality} onChange={e=>setPersonal("nationality",e.target.value)}>
                        <option value="">Select</option>
                        {NATIONALITIES.map(n=><option key={n}>{n}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={lbl}>LinkedIn URL</label>
                      <input style={inp} placeholder="linkedin.com/in/yourname" value={form.personal.linkedin} onChange={e=>setPersonal("linkedin",e.target.value)}/>
                    </div>
                    <div>
                      <label style={lbl}>Function / Department</label>
                      <select style={sel} value={form.job_function} onChange={e=>setForm(f=>({...f,job_function:e.target.value}))}>
                        <option value="">Select</option>
                        {FUNCTIONS.map(fn=><option key={fn}>{fn}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Seniority level</label>
                      <select style={sel} value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>
                        <option value="">Select</option>
                        {LEVELS.map(l=><option key={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: EXPERIENCE */}
              {currentStepId==="experience"&&(
                <div>
                  <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Work experience</h2>
                  <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"22px" }}>Add your roles, most recent first. Use AI to write strong, quantified bullet points.</p>
                  {form.experience.map((e,i)=>(
                    <div key={i} style={{ background:"#f9fafb", borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", border:"1px solid #e8ecef" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                        <span style={{ fontSize:"11px", fontWeight:700, color:"#028090", textTransform:"uppercase" as const, letterSpacing:"0.06em" }}>Role {i+1}</span>
                        {form.experience.length>1&&(
                          <button onClick={()=>removeExp(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", display:"flex", alignItems:"center", gap:"3px", fontSize:"11px", padding:0 }}>
                            <Trash2 size={11}/> Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Job title</label>
                          <input style={inp} placeholder="Finance Manager" value={e.title} onChange={ev=>updateExp(i,"title",ev.target.value)}/>
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Company</label>
                          <input style={inp} placeholder="ABC Group" value={e.company} onChange={ev=>updateExp(i,"company",ev.target.value)}/>
                        </div>
                        <DatePicker label="Start date" month={e.startMonth} year={e.startYear}
                          onMonth={v=>updateExp(i,"startMonth",v)} onYear={v=>updateExp(i,"startYear",v)}/>
                        {e.current?(
                          <div>
                            <label style={lbl}>End date</label>
                            <div style={{ ...inp, background:"#f9fafb", color:"#9ca3af", display:"flex", alignItems:"center" }}>Present</div>
                          </div>
                        ):(
                          <DatePicker label="End date" month={e.endMonth} year={e.endYear}
                            onMonth={v=>updateExp(i,"endMonth",v)} onYear={v=>updateExp(i,"endYear",v)}/>
                        )}
                      </div>
                      <label style={{ ...lbl, display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", marginBottom:"12px" }}>
                        <input type="checkbox" checked={e.current} onChange={ev=>updateExp(i,"current",ev.target.checked)}/> I currently work here
                      </label>
                      <label style={lbl}>Your rough notes for this role</label>
                      <p style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"8px", lineHeight:1.5 }}>
                        Jot down what you did — team size, budgets, results, anything. Add at least 3 notes, then AI will rewrite them into polished bullet points.
                      </p>
                      {e.bullets.map((b,j)=>(
                        <div key={j} style={{ display:"flex", gap:"6px", marginBottom:"5px", alignItems:"flex-start" }}>
                          <span style={{ color:"#028090", fontSize:"14px", marginTop:"10px", flexShrink:0, lineHeight:1 }}>▸</span>
                          <input style={{ ...inp, fontSize:"13px" }} placeholder={
                            j===0 ? "e.g. Managed a team of 8 people" :
                            j===1 ? "e.g. Cut costs by 20% through process changes" :
                            j===2 ? "e.g. Responsible for EGP 30M budget" :
                            "e.g. Another achievement or responsibility"
                          } value={b} onChange={ev=>updateBullet(i,j,ev.target.value)}/>
                        </div>
                      ))}
                      {(() => {
                        const filledBullets = e.bullets.filter(b=>b.trim()).length
                        const canAI = e.title && e.company && filledBullets >= 3
                        return (
                          <div style={{ marginTop:"8px" }}>
                            <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                              <button onClick={()=>{const u=[...form.experience];u[i].bullets=[...u[i].bullets,""];setForm(f=>({...f,experience:u}))}}
                                style={{ fontSize:"12px", color:"#028090", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>+ Add note</button>
                              <button onClick={()=>generateBullets(i)} disabled={!canAI||generatingBullet===i}
                                style={{ fontSize:"12px", color:"white", background:canAI?"#028090":"#d1d5db", border:"none", borderRadius:"7px", padding:"5px 12px", cursor:canAI?"pointer":"default", fontWeight:600, display:"flex", alignItems:"center", gap:"5px" }}>
                                {generatingBullet===i?<><Loader2 size={11} className="animate-spin"/>Polishing…</>:<><Sparkles size={11}/>Polish with AI</>}
                              </button>
                            </div>
                            {!canAI && e.title && e.company && (
                              <p style={{ fontSize:"11px", color:"#9ca3af", marginTop:"6px" }}>
                                Add {Math.max(0, 3-filledBullets)} more note{3-filledBullets!==1?"s":""} to unlock AI polish
                                {" · "}<span style={{ display:"inline-flex", gap:"3px" }}>
                                  {[0,1,2].map(n=><span key={n} style={{ width:"6px", height:"6px", borderRadius:"50%", background:n<filledBullets?"#028090":"#e5e7eb", display:"inline-block" }}/>)}
                                </span>
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                  <button onClick={addExp} style={{ width:"100%", padding:"12px", border:"1.5px dashed #d1d5db", borderRadius:"12px", background:"white", color:"#6b7280", fontSize:"13px", cursor:"pointer", fontWeight:600 }}>+ Add another role</button>
                </div>
              )}

              {/* STEP 3: SKILLS */}
              {currentStepId==="skills"&&(
                <div>
                  <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Skills & languages</h2>
                  <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"8px" }}>
                    {form.job_function
                      ? `Suggested skills for ${form.job_function} — tap to select.`
                      : "Tap to select your key skills. These appear on your CV."}
                  </p>
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"7px", marginBottom:"20px" }}>
                    {suggestedSkills.map(s=>(
                      <button key={s} onClick={()=>toggleSkill(s)}
                        style={{ padding:"7px 14px", borderRadius:"999px", border:"1.5px solid", fontSize:"12px", fontWeight:600, cursor:"pointer", transition:"all .12s",
                          borderColor:form.skills.includes(s)?"#028090":"#e5e7eb",
                          background:form.skills.includes(s)?"#028090":"white",
                          color:form.skills.includes(s)?"white":"#374151" }}>
                        {form.skills.includes(s)?"✓ ":""}{s}
                      </button>
                    ))}
                  </div>
                  {form.skills.length>0&&(
                    <div style={{ marginBottom:"20px", padding:"12px 14px", background:"#f0f9f8", borderRadius:"10px", border:"1px solid #d1f0ee" }}>
                      <p style={{ fontSize:"11px", fontWeight:600, color:"#028090", margin:"0 0 7px" }}>{form.skills.length} selected — tap to remove</p>
                      <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"5px" }}>
                        {form.skills.map(s=>(
                          <span key={s} onClick={()=>toggleSkill(s)} style={{ background:"#028090", color:"white", fontSize:"11px", padding:"3px 10px", borderRadius:"99px", cursor:"pointer", fontWeight:600 }}>{s} ×</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom:"18px" }}>
                    <label style={lbl}>Languages</label>
                    {form.languages.map((l,i)=>(
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:"8px", marginBottom:"8px", alignItems:"center" }}>
                        <select style={sel} value={l.lang} onChange={e=>{const u=[...form.languages];u[i]={...u[i],lang:e.target.value};setForm(f=>({...f,languages:u}))}}>
                          {LANGUAGES.map(ln=><option key={ln}>{ln}</option>)}
                        </select>
                        <select style={sel} value={l.level} onChange={e=>{const u=[...form.languages];u[i]={...u[i],level:e.target.value};setForm(f=>({...f,languages:u}))}}>
                          {["Native","Fluent","Advanced","Intermediate","Basic"].map(lv=><option key={lv}>{lv}</option>)}
                        </select>
                        {form.languages.length>1&&(
                          <button onClick={()=>setForm(f=>({...f,languages:f.languages.filter((_,idx)=>idx!==i)}))} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:"4px" }}><Trash2 size={14}/></button>
                        )}
                      </div>
                    ))}
                    <button onClick={()=>setForm(f=>({...f,languages:[...f.languages,{lang:"English",level:"Intermediate"}]}))}
                      style={{ fontSize:"12px", color:"#028090", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>+ Add language</button>
                  </div>
                  <div>
                    <label style={lbl}>Hobbies & interests <span style={{ color:"#d1d5db", fontWeight:400 }}>optional</span></label>
                    <input style={inp} placeholder="e.g. Football, reading, photography" value={form.hobbies} onChange={e=>setForm(f=>({...f,hobbies:e.target.value}))}/>
                  </div>
                </div>
              )}

              {/* STEP 4: EDUCATION */}
              {currentStepId==="education"&&(
                <div>
                  <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Education</h2>
                  <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"22px" }}>Add your degrees. Certifications go in the achievements field below.</p>
                  {form.education.map((e,i)=>(
                    <div key={i} style={{ background:"#f9fafb", borderRadius:"14px", padding:"18px 20px", marginBottom:"12px", border:"1px solid #e8ecef" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Institution</label>
                          <input style={inp} placeholder="Cairo University" value={e.institution} onChange={ev=>updateEdu(i,"institution",ev.target.value)}/>
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Degree</label>
                          <input style={inp} placeholder="B.Sc. Accounting" value={e.degree} onChange={ev=>updateEdu(i,"degree",ev.target.value)}/>
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Field of study</label>
                          <input style={inp} placeholder="Finance" value={e.field} onChange={ev=>updateEdu(i,"field",ev.target.value)}/>
                        </div>
                        <div>
                          <label style={lbl}>Start year</label>
                          <select style={sel} value={e.startYear} onChange={ev=>updateEdu(i,"startYear",ev.target.value)}>
                            <option value="">Year</option>
                            {YEARS.map(y=><option key={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>End year</label>
                          <select style={sel} value={e.endYear} onChange={ev=>updateEdu(i,"endYear",ev.target.value)}>
                            <option value="">Year</option>
                            {YEARS.map(y=><option key={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addEdu} style={{ width:"100%", padding:"11px", border:"1.5px dashed #d1d5db", borderRadius:"12px", background:"white", color:"#6b7280", fontSize:"13px", cursor:"pointer", fontWeight:600, marginBottom:"20px" }}>+ Add education</button>
                  <div>
                    <label style={lbl}>Achievements & certifications <span style={{ color:"#d1d5db", fontWeight:400 }}>optional</span></label>
                    <p style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"8px" }}>Separate with · e.g. "CMA certified · Top performer Q3 2022"</p>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <textarea style={{ ...inp, height:"60px", resize:"none" as const, fontSize:"13px", flex:1 }} placeholder="CMA certified · Top performer Q3 2022" value={form.achievements} onChange={e=>setForm(f=>({...f,achievements:e.target.value}))}/>
                      <button onClick={generateAchievements} title="Generate with AI"
                        style={{ flexShrink:0, width:"42px", background:"#028090", color:"white", border:"none", borderRadius:"10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Sparkles size={15}/>
                      </button>
                    </div>
                    <p style={{ fontSize:"11px", color:"#9ca3af", marginTop:"6px" }}>The ✨ button generates achievements based on your experience.</p>
                  </div>
                </div>
              )}

              {/* STEP 5: SUMMARY */}
              {currentStepId==="summary"&&(
                <div>
                  <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Professional summary</h2>
                  <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"20px" }}>
                    3–4 sentences about who you are. The AI reads your job title, experience, and skills to write this — the more you've filled in, the richer it'll be.
                  </p>
                  <textarea style={{ ...inp, height:"150px", resize:"none" as const, lineHeight:1.65, marginBottom:"14px", fontSize:"14px" }}
                    placeholder="Experienced finance professional with 8+ years…"
                    value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))}/>
                  {generating?(
                    <div style={{ display:"flex", alignItems:"center", gap:"7px", color:"#028090", fontSize:"13px" }}>
                      <Loader2 size={14} className="animate-spin"/> Writing your summary…
                    </div>
                  ):(
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <button onClick={generateSummary} disabled={!form.personal.title}
                        style={{ display:"flex", alignItems:"center", gap:"7px", padding:"10px 18px",
                          background:form.personal.title?"#028090":"#e5e7eb",
                          color:form.personal.title?"white":"#9ca3af",
                          border:"none", borderRadius:"10px", fontWeight:700, fontSize:"13px",
                          cursor:form.personal.title?"pointer":"default" }}>
                        <Sparkles size={13}/>
                        {form.summary?"Regenerate with AI":"Generate with AI"}
                      </button>
                      {form.summary&&<div style={{ display:"flex", alignItems:"center", gap:"5px", color:"#059669", fontSize:"12px" }}><CheckCircle size={12}/>Generated — edit freely</div>}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: TEMPLATE */}
              {currentStepId==="template"&&(
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Choose your template</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"16px" }}>3 premium designs. Your CV is live on the right — switch anytime.</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginBottom:"18px" }}>
                    {TEMPLATES.map(t=>(
                      <button key={t.id} onClick={()=>setSelectedTemplate(t.id)}
                        style={{ padding:0, border:selectedTemplate===t.id?"2.5px solid #028090":"1.5px solid #e5e7eb", borderRadius:"10px", overflow:"hidden", cursor:"pointer", background:"white",
                          boxShadow:selectedTemplate===t.id?"0 0 0 3px rgba(2,128,144,0.15)":"0 1px 3px rgba(0,0,0,0.05)", transition:"all .15s", textAlign:"left" as const }}>
                        <div style={{ padding:"10px 10px 8px" }}>
                          <p style={{ fontSize:"11px", fontWeight:800, color:selectedTemplate===t.id?"#028090":"#0a1f24", margin:0, marginBottom:"3px" }}>{t.name}</p>
                          <p style={{ fontSize:"9px", color:"#9ca3af", margin:0, lineHeight:1.4 }}>{t.sub}</p>
                        </div>
                        {selectedTemplate===t.id&&<div style={{ background:"#028090", padding:"3px 0", textAlign:"center" as const, fontSize:"8px", color:"white", fontWeight:700, letterSpacing:".05em" }}>✓ SELECTED</div>}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"11px 14px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"10px", marginBottom:"16px" }}>
                    <span style={{ fontSize:"16px" }}>🇸🇦</span>
                    <div>
                      <p style={{ fontSize:"12px", fontWeight:600, color:"#166534", margin:0 }}>Arabic CV — coming soon</p>
                      <p style={{ fontSize:"11px", color:"#15803d", margin:0 }}>Full RTL Arabic version. Save now and we'll notify you.</p>
                    </div>
                  </div>
                  <button onClick={handleSaveAndDownload} disabled={saving}
                    style={{ width:"100%", padding:"14px", background:"#028090", color:"white", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                    {saving?<><Loader2 size={15} className="animate-spin"/>Saving…</>:<><Download size={15}/>Save & Download PDF</>}
                  </button>
                  <p style={{ textAlign:"center" as const, fontSize:"11px", color:"#9ca3af", marginTop:"8px" }}>Saves to GPS recruiter database · Free download · No watermark</p>
                </div>
              )}
            </div>

            {/* Bottom nav */}
            <div style={{ padding:"12px 24px", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center", background:"white" }}>
              <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
                style={{ display:"flex", alignItems:"center", gap:"4px", padding:"9px 16px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"9px", cursor:step===0?"default":"pointer", color:step===0?"#d1d5db":"#374151", fontWeight:600, fontSize:"13px" }}>
                <ArrowLeft size={13}/> Back
              </button>
              <span style={{ fontSize:"11px", color:"#9ca3af" }}>Step {step+1} / {STEPS.length}</span>
              {step<STEPS.length-1?(
                <button onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}
                  style={{ display:"flex", alignItems:"center", gap:"4px", padding:"9px 18px", background:"#028090", border:"none", borderRadius:"9px", cursor:"pointer", color:"white", fontWeight:700, fontSize:"13px" }}>
                  Next <ArrowRight size={13}/>
                </button>
              ):<div style={{ width:"90px" }}/>}
            </div>
          </div>

          {/* RIGHT — preview (template step only) */}
          {isTemplateStep&&(
            <div style={{ padding:"14px", overflow:"hidden" }}>
              <CVPreview form={form} templateId={selectedTemplate}/>
            </div>
          )}
        </div>
      )}

      {/* SIGNUP / SIGNIN / FORGOT MODAL — 3-state, no data loss */}
      {showSignup&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"24px" }}>
          <div style={{ background:"white", borderRadius:"20px", padding:"32px", width:"100%", maxWidth:"400px", boxShadow:"0 24px 80px rgba(0,0,0,0.25)" }}>

            {/* ── STATE: signup ── */}
            {authMode==="signup"&&(<>
              <div style={{ textAlign:"center" as const, marginBottom:"20px" }}>
                <div style={{ width:"44px", height:"44px", background:"#e6f5f3", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                  <CheckCircle size={20} color="#028090"/>
                </div>
                <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Almost there!</h2>
                <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.5 }}>
                  Create a free account to save your CV to the GPS Talent Network — our recruiters will be able to find you instantly.
                </p>
              </div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:"10px", marginBottom:"12px" }}>
                <input style={inp} type="email" placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
                <input style={inp} type="password" placeholder="Choose a password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)}/>
              </div>
              {authError&&<p style={{ color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>{authError}</p>}
              <button onClick={handleSignupAndSave} disabled={authLoading||!email||!password}
                style={{ width:"100%", padding:"12px", background:"#028090", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", marginBottom:"12px" }}>
                {authLoading?<><Loader2 size={14} className="animate-spin"/>Saving…</>:<>Save CV & Go Live<ArrowRight size={14}/></>}
              </button>
              <p style={{ textAlign:"center" as const, fontSize:"12px", color:"#9ca3af" }}>
                Already have an account?{" "}
                <button onClick={()=>{setAuthMode("signin");setAuthError("")}} style={{ color:"#028090", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontSize:"12px", padding:0 }}>Sign in instead</button>
              </p>
              <button onClick={()=>setShowSignup(false)} style={{ width:"100%", padding:"8px", background:"none", border:"none", color:"#9ca3af", fontSize:"12px", cursor:"pointer", marginTop:"4px" }}>Cancel</button>
            </>)}

            {/* ── STATE: signin ── */}
            {authMode==="signin"&&(<>
              <div style={{ textAlign:"center" as const, marginBottom:"20px" }}>
                <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Welcome back</h2>
                <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.5 }}>Sign in to save your CV — your form data is still here.</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:"10px", marginBottom:"12px" }}>
                <input style={inp} type="email" placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
                <input style={inp} type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)}/>
              </div>
              {authError&&<p style={{ color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>{authError}</p>}
              <button onClick={handleSigninAndSave} disabled={authLoading||!email||!password}
                style={{ width:"100%", padding:"12px", background:"#028090", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", marginBottom:"12px" }}>
                {authLoading?<><Loader2 size={14} className="animate-spin"/>Signing in…</>:<>Sign in & Save CV<ArrowRight size={14}/></>}
              </button>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                <button onClick={()=>{setAuthMode("forgot");setAuthError("")}} style={{ color:"#6b7280", background:"none", border:"none", cursor:"pointer", fontSize:"12px", padding:0 }}>Forgot password?</button>
                <button onClick={()=>{setAuthMode("signup");setAuthError("")}} style={{ color:"#028090", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontSize:"12px", padding:0 }}>Create account</button>
              </div>
              <button onClick={()=>setShowSignup(false)} style={{ width:"100%", padding:"8px", background:"none", border:"none", color:"#9ca3af", fontSize:"12px", cursor:"pointer", marginTop:"8px" }}>Cancel</button>
            </>)}

            {/* ── STATE: forgot ── */}
            {authMode==="forgot"&&(<>
              <div style={{ textAlign:"center" as const, marginBottom:"20px" }}>
                <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Reset your password</h2>
                <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.5 }}>
                  {authForgotSent
                    ? `Check your inbox at ${email}. Click the link, then come back here and sign in.`
                    : "We'll email you a reset link. Your CV data stays right here."}
                </p>
              </div>
              {!authForgotSent&&(<>
                <input style={{ ...inp, marginBottom:"12px" }} type="email" placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
                {authError&&<p style={{ color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>{authError}</p>}
                <button onClick={handleForgotPassword} disabled={authLoading||!email}
                  style={{ width:"100%", padding:"12px", background:"#028090", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", marginBottom:"12px" }}>
                  {authLoading?<><Loader2 size={14} className="animate-spin"/>Sending…</>:<>Send reset link</>}
                </button>
              </>)}
              {authForgotSent&&(
                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"10px", padding:"14px 16px", marginBottom:"14px", textAlign:"center" as const }}>
                  <CheckCircle size={20} color="#059669" style={{ margin:"0 auto 6px" }}/>
                  <p style={{ fontSize:"13px", color:"#059669", fontWeight:600, margin:0 }}>Reset link sent!</p>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                <button onClick={()=>{setAuthMode("signin");setAuthError("");setAuthForgotSent(false)}} style={{ color:"#6b7280", background:"none", border:"none", cursor:"pointer", fontSize:"12px", padding:0 }}>← Back to sign in</button>
              </div>
              <button onClick={()=>setShowSignup(false)} style={{ width:"100%", padding:"8px", background:"none", border:"none", color:"#9ca3af", fontSize:"12px", cursor:"pointer", marginTop:"8px" }}>Cancel — I'll do this later</button>
            </>)}
          </div>
        </div>
      )}
    </div>
  )
}
