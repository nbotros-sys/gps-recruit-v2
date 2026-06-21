"use client"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { ArrowRight, ArrowLeft, Upload, Sparkles, CheckCircle, Loader2, User, FileText, Briefcase, GraduationCap, Star, Download, Camera, Plus, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"

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
  "Legal": ["Contract Drafting","Corporate Law","Compliance","Litigation","Regulatory Affairs","Due Diligence","Employment Law","IP Law","Legal Research","Commercial Contracts"],
  "Supply Chain & Logistics": ["Procurement","Inventory Management","Warehouse Operations","Freight Management","ERP","Vendor Management","Demand Planning","Customs Clearance","Fleet Management","Cost Reduction"],
  "C-Suite / Executive": ["P&L Management","Board Relations","M&A","Strategic Planning","Investor Relations","Corporate Governance","Fundraising","Organisational Design","Change Management","Executive Leadership"],
}

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
  hobbies: "", skills: [],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  job_function: "", level: "", achievements: "",
}

// ── DENSITY ENGINE — all sizes in em ────────────────────────────────────────
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
    bodyEm:         lerpF(1.05, 0.85, t),
    bulletEm:       lerpF(1.00, 0.82, t),
    secLabelEm:     lerpF(0.78, 0.68, t),
    lineHeight:     lerpF(1.90, 1.50, t),
    letterSp:       lerpF(0.04, 0.10, t),
    nameEm:         lerpF(2.00, 1.55, t),
    titleEm:        lerpF(1.10, 0.90, t),
    photoEm:        lerpF(7.50, 5.00, t),
    sectionGapEm:   lerpF(2.00, 0.90, t),
    headerPadVEm:   lerpF(2.60, 1.50, t),
    headerPadHEm:   lerpF(2.20, 1.80, t),
    bodyPadEm:      lerpF(1.80, 1.20, t),
    sidebarWidthEm: lerpF(15.0, 12.0, t),
    showHobbies:      hasHobbies || score < 58,
    showAchievements: hasAchievements || score < 42,
    summaryTargetWords: Math.round(lerp(85, 42, t)),
    minBulletsPerRole:  score < 45 ? 4 : 3,
  }
}

type D = ReturnType<typeof getContentDensity>

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

const PH = {
  name: "Ahmed Hassan", title: "Finance Manager",
  email: "ahmed@email.com", phone: "+20 100 123 4567",
  location: "Cairo, Egypt", linkedin: "linkedin.com/in/ahmed",
  summary: "Experienced finance professional with 8+ years across banking and FMCG sectors in Egypt and the Gulf. Proven track record in financial planning, team leadership and stakeholder management. Consistently delivers operational improvements and measurable cost savings.",
  experience: [
    { company:"ABC Group", title:"Finance Manager", start:"2020-01", end:"", current:true,
      bullets:["Led financial reporting for EGP 50M portfolio across 3 business units, improving accuracy by 40%","Managed team of 6 accountants, reducing month-end close from 7 to 3 days","Built Power BI dashboards eliminating 12 hours of manual reporting per week"] },
    { company:"XYZ Bank", title:"Senior Accountant", start:"2017-03", end:"2019-12", current:false,
      bullets:["Prepared monthly management accounts for EGP 120M portfolio","Coordinated external audit with zero material misstatements for 3 consecutive years"] },
  ],
  education: [{ institution:"Cairo University", degree:"B.Sc. Accounting", field:"", startYear:"2012", endYear:"2016" }],
  skills: ["Financial Reporting","Budgeting","SAP","Excel Advanced","Team Leadership","IFRS","Cash Flow Mgmt"],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  hobbies: "Football, reading Arabic literature, photography",
  achievements: "CMA certified · Top performer award Q3 2022 · Implemented first automated reporting system",
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — PRESTIGE  (dark slate sidebar, warm gold accents)
// ═══════════════════════════════════════════════════════════════════════════
function TplPrestige({ form, d }: { form: FormData; d: D }) {
  const f = form
  const name        = f.personal.name || PH.name
  const title       = f.personal.title || PH.title
  const email       = f.personal.email || PH.email
  const phone       = f.personal.phone || PH.phone
  const location    = f.personal.location || PH.location
  const linkedin    = f.personal.linkedin || PH.linkedin
  const summary     = f.summary || PH.summary
  const exps        = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus        = f.education.some(e => e.institution) ? f.education : PH.education
  const skills      = f.skills.length > 0 ? f.skills : PH.skills
  const langs       = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies     = f.hobbies || (d.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (d.showAchievements ? PH.achievements : "")

  const SLATE = "#1C2B35"
  const GOLD  = "#B8966E"
  const CREAM = "#FAFAF8"
  const INK   = "#1A1A1A"

  const sideLabel = (label: string) => (
    <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.secLabelEm}em`, fontWeight:700, color:GOLD, letterSpacing:`${d.letterSp + 0.04}em`, textTransform:"uppercase" as const, marginTop:`${d.sectionGapEm}em`, marginBottom:"0.5em", paddingBottom:"0.3em", borderBottom:`1px solid rgba(184,150,110,0.3)` }}>
      {label}
    </div>
  )
  const mainLabel = (label: string) => (
    <div style={{ display:"flex", alignItems:"center", gap:"0.6em", marginTop:`${d.sectionGapEm}em`, marginBottom:"0.6em" }}>
      <div style={{ width:"0.25em", height:"1.2em", background:GOLD, borderRadius:"2px", flexShrink:0 }} />
      <span style={{ fontFamily:"Georgia,serif", fontSize:`${d.secLabelEm}em`, fontWeight:700, color:SLATE, letterSpacing:`${d.letterSp}em`, textTransform:"uppercase" as const }}>{label}</span>
      <div style={{ flex:1, height:"0.5px", background:"#E0DDD8" }} />
    </div>
  )

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"Georgia,serif" }}>
      <div style={{ width:`${d.sidebarWidthEm}em`, flexShrink:0, background:SLATE, padding:`${d.headerPadVEm}em ${d.headerPadHEm * 0.75}em`, display:"flex", flexDirection:"column" as const, overflow:"hidden" }}>
        {f.personal.photo ? (
          <img src={f.personal.photo} alt="" style={{ width:`${d.photoEm}em`, height:`${d.photoEm}em`, borderRadius:"50%", objectFit:"cover", border:`0.15em solid ${GOLD}`, marginBottom:`${d.sectionGapEm * 0.6}em`, flexShrink:0 }} />
        ) : (
          <div style={{ width:`${d.photoEm}em`, height:`${d.photoEm}em`, borderRadius:"50%", background:"rgba(184,150,110,0.18)", border:`0.12em solid rgba(184,150,110,0.45)`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:`${d.sectionGapEm * 0.6}em`, flexShrink:0, color:"rgba(255,255,255,0.5)", fontSize:`${d.photoEm * 0.3}em`, fontWeight:700 }}>
            {initials(name)}
          </div>
        )}
        <div style={{ fontSize:`${d.nameEm}em`, fontWeight:700, color:"#FFF", lineHeight:1.15, marginBottom:"0.22em" }}>{name}</div>
        <div style={{ fontSize:`${d.titleEm * 0.88}em`, color:GOLD, letterSpacing:"0.08em", fontFamily:"Arial,sans-serif", fontWeight:400, marginBottom:`${d.sectionGapEm * 0.5}em`, textTransform:"uppercase" as const }}>{title}</div>
        <div style={{ width:"1.6em", height:"0.12em", background:GOLD, marginBottom:`${d.sectionGapEm * 0.5}em` }} />
        {sideLabel("Contact")}
        <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"rgba(255,255,255,0.52)", lineHeight:d.lineHeight * 0.95 }}>
          {email    && <div style={{ marginBottom:"0.2em" }}>{email}</div>}
          {phone    && <div style={{ marginBottom:"0.2em" }}>{phone}</div>}
          {location && <div style={{ marginBottom:"0.2em" }}>{location}</div>}
          {linkedin && <div style={{ color:GOLD, marginBottom:"0.2em" }}>{linkedin.replace("https://","")}</div>}
        </div>
        {sideLabel("Skills")}
        <div style={{ display:"flex", flexDirection:"column" as const, gap:"0.32em" }}>
          {skills.slice(0,9).map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.5em" }}>
              <div style={{ width:"0.28em", height:"0.28em", background:GOLD, borderRadius:"50%", flexShrink:0 }} />
              <span style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"rgba(255,255,255,0.58)" }}>{s}</span>
            </div>
          ))}
        </div>
        {sideLabel("Languages")}
        {langs.filter(l=>l.lang).map((l,i) => (
          <div key={i} style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"rgba(255,255,255,0.58)", marginBottom:"0.28em", lineHeight:1.4 }}>
            <span style={{ color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{l.lang}</span>
            <span style={{ color:"rgba(255,255,255,0.35)" }}> · {l.level}</span>
          </div>
        ))}
        {hobbies && (<>
          {sideLabel("Interests")}
          <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm * 0.82}em`, color:"rgba(255,255,255,0.4)", lineHeight:d.lineHeight * 0.9 }}>{hobbies}</div>
        </>)}
      </div>
      <div style={{ flex:1, background:CREAM, padding:`${d.headerPadVEm}em ${d.bodyPadEm + 0.4}em`, overflow:"hidden", display:"flex", flexDirection:"column" as const }}>
        {mainLabel("Professional Profile")}
        <p style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, color:"#3A3A3A", lineHeight:d.lineHeight, margin:0 }}>{summary}</p>
        {mainLabel("Professional Experience")}
        {exps.filter(e=>e.title||e.company).map((e,i) => (
          <div key={i} style={{ marginBottom:`${d.sectionGapEm * 0.75}em` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"0.18em" }}>
              <div style={{ fontSize:`${d.bodyEm * 1.08}em`, fontWeight:700, color:INK, fontFamily:"Georgia,serif" }}>{e.title}</div>
              {(e.start||e.end||e.current) && (
                <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm * 0.85}em`, color:"#9B8B7A", flexShrink:0, marginLeft:"0.8em" }}>
                  {fmtDate(e.start)}{(e.start||e.end||e.current) ? ` – ${e.current?"Present":fmtDate(e.end)}` : ""}
                </div>
              )}
            </div>
            <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm * 0.92}em`, color:GOLD, fontWeight:600, marginBottom:"0.35em" }}>{e.company}</div>
            {e.bullets.filter(b=>b.trim()).map((b,j) => (
              <div key={j} style={{ display:"flex", gap:"0.55em", marginBottom:"0.18em" }}>
                <span style={{ color:GOLD, fontSize:`${d.bulletEm * 0.9}em`, flexShrink:0, marginTop:"0.25em", lineHeight:1 }}>—</span>
                <p style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm}em`, color:"#4A4A4A", lineHeight:d.lineHeight, margin:0 }}>{b}</p>
              </div>
            ))}
          </div>
        ))}
        {achievements && (
          <div style={{ background:"rgba(184,150,110,0.07)", border:`0.5px solid rgba(184,150,110,0.3)`, borderRadius:"0.4em", padding:"0.7em 0.9em", marginBottom:`${d.sectionGapEm * 0.5}em` }}>
            <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.secLabelEm * 0.85}em`, fontWeight:700, color:GOLD, letterSpacing:"0.06em", textTransform:"uppercase" as const, marginBottom:"0.4em" }}>Key Achievements</div>
            {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i) => (
              <div key={i} style={{ display:"flex", gap:"0.5em", marginBottom:"0.2em" }}>
                <span style={{ color:GOLD, flexShrink:0, fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm * 0.85}em` }}>✓</span>
                <span style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm * 0.9}em`, color:"#4A4A4A", lineHeight:d.lineHeight * 0.9 }}>{a}</span>
              </div>
            ))}
          </div>
        )}
        {mainLabel("Education")}
        {edus.filter(e=>e.institution).map((e,i) => (
          <div key={i} style={{ marginBottom:"0.5em" }}>
            <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, fontWeight:700, color:INK }}>{e.degree}{e.field ? ` — ${e.field}` : ""}</div>
            <div style={{ fontFamily:"Arial,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"#6B6B6B" }}>{e.institution}{e.endYear ? ` · ${e.endYear}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — ARCHITECT  (white, bold sans name, sidebar right)
// ═══════════════════════════════════════════════════════════════════════════
function TplArchitect({ form, d }: { form: FormData; d: D }) {
  const f = form
  const name        = f.personal.name || PH.name
  const title       = f.personal.title || PH.title
  const email       = f.personal.email || PH.email
  const phone       = f.personal.phone || PH.phone
  const location    = f.personal.location || PH.location
  const linkedin    = f.personal.linkedin || PH.linkedin
  const summary     = f.summary || PH.summary
  const exps        = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus        = f.education.some(e => e.institution) ? f.education : PH.education
  const skills      = f.skills.length > 0 ? f.skills : PH.skills
  const langs       = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies     = f.hobbies || (d.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (d.showAchievements ? PH.achievements : "")

  const TEAL  = "#026B77"
  const INK   = "#111827"
  const MIST  = "#F8F9FA"

  const sec = (label: string) => (
    <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm}em`, fontWeight:800, color:TEAL, letterSpacing:"0.12em", textTransform:"uppercase" as const, marginTop:`${d.sectionGapEm * 0.9}em`, marginBottom:"0.55em", display:"flex", alignItems:"center", gap:"0.7em" }}>
      {label}<div style={{ flex:1, height:"1.5px", background:"#E8EAEC" }} />
    </div>
  )

  return (
    <div style={{ background:"#FFF", height:"100%", fontFamily:"Georgia,serif" }}>
      <div style={{ padding:`${d.headerPadVEm * 0.85}em ${d.headerPadHEm * 1.1}em`, borderBottom:`3px solid ${TEAL}`, display:"flex", alignItems:"flex-start", gap:"1.2em" }}>
        {f.personal.photo && (
          <img src={f.personal.photo} alt="" style={{ width:`${d.photoEm * 0.88}em`, height:`${d.photoEm * 0.88}em`, objectFit:"cover", borderRadius:"0.3em", flexShrink:0, border:"0.5px solid #E0E0E0" }} />
        )}
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontWeight:900, fontSize:`${d.nameEm * 1.05}em`, color:INK, letterSpacing:"-0.025em", lineHeight:1.05, marginBottom:"0.22em" }}>{name.toUpperCase()}</div>
          <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.titleEm * 0.92}em`, color:TEAL, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" as const, marginBottom:"0.5em" }}>{title}</div>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"1.2em" }}>
            {[email, phone, location, linkedin && linkedin.replace("https://","")].filter(Boolean).map((c,i) => (
              <span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.82}em`, color:"#6B7280" }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`1fr ${d.sidebarWidthEm * 0.78}em`, height:`calc(100% - ${d.headerPadVEm * 1.7 + 3.5}em)` }}>
        <div style={{ padding:`${d.bodyPadEm * 0.7}em ${d.bodyPadEm * 0.9}em ${d.bodyPadEm * 0.7}em ${d.headerPadHEm * 1.1}em`, overflow:"hidden" }}>
          {sec("Profile")}
          <p style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, color:"#374151", lineHeight:d.lineHeight, margin:`0 0 0.3em` }}>{summary}</p>
          {sec("Experience")}
          {exps.filter(e=>e.title||e.company).map((e,i) => (
            <div key={i} style={{ marginBottom:`${d.sectionGapEm * 0.65}em`, paddingLeft:"0.7em", borderLeft:`0.18em solid ${i===0?TEAL:"#D1D5DB"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 1.05}em`, fontWeight:700, color:INK }}>{e.title}</span>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm * 0.82}em`, color:"#9CA3AF", flexShrink:0, marginLeft:"0.6em" }}>
                  {fmtDate(e.start)}{(e.start||e.end||e.current) ? ` – ${e.current?"Present":fmtDate(e.end)}` : ""}
                </span>
              </div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:TEAL, fontWeight:600, marginBottom:"0.3em" }}>{e.company}</div>
              {e.bullets.filter(b=>b.trim()).map((b,j) => (
                <div key={j} style={{ display:"flex", gap:"0.45em", marginBottom:"0.15em" }}>
                  <span style={{ color:TEAL, fontWeight:700, fontSize:`${d.bulletEm * 0.85}em`, flexShrink:0, marginTop:"0.18em", lineHeight:1, fontFamily:"Arial,sans-serif" }}>›</span>
                  <p style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm}em`, color:"#4B5563", lineHeight:d.lineHeight, margin:0 }}>{b}</p>
                </div>
              ))}
            </div>
          ))}
          {achievements && (
            <div style={{ background:MIST, borderRadius:"0.35em", padding:"0.65em 0.85em", borderLeft:`0.2em solid ${TEAL}`, marginTop:`${d.sectionGapEm * 0.5}em` }}>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm * 0.82}em`, fontWeight:800, color:TEAL, letterSpacing:"0.1em", textTransform:"uppercase" as const, marginBottom:"0.35em" }}>Key Achievements</div>
              {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i) => (
                <div key={i} style={{ display:"flex", gap:"0.45em", marginBottom:"0.15em" }}>
                  <span style={{ color:TEAL, fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm * 0.85}em`, flexShrink:0 }}>✓</span>
                  <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm * 0.9}em`, color:"#374151", lineHeight:d.lineHeight * 0.88 }}>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:`${d.bodyPadEm * 0.7}em ${d.bodyPadEm * 0.75}em`, borderLeft:"1px solid #E8EAEC", background:MIST, overflow:"hidden" }}>
          {sec("Skills")}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:"0.28em" }}>
            {skills.map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.4em" }}>
                <div style={{ width:"0.22em", height:"0.22em", background:TEAL, borderRadius:"50%", flexShrink:0 }} />
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"#374151" }}>{s}</span>
              </div>
            ))}
          </div>
          {sec("Education")}
          {edus.filter(e=>e.institution).map((e,i) => (
            <div key={i} style={{ marginBottom:"0.55em" }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm * 0.96}em`, fontWeight:700, color:INK, lineHeight:1.3 }}>{e.degree}{e.field ? ` — ${e.field}` : ""}</div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.82}em`, color:"#6B7280" }}>{e.institution}</div>
              {e.endYear && <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.78}em`, color:"#9CA3AF" }}>{e.endYear}</div>}
            </div>
          ))}
          {sec("Languages")}
          {langs.filter(l=>l.lang).map((l,i) => (
            <div key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"#374151", marginBottom:"0.25em", lineHeight:1.5 }}>
              <span style={{ fontWeight:700, color:INK }}>{l.lang}</span>
              <span style={{ color:"#9CA3AF" }}> · {l.level}</span>
            </div>
          ))}
          {hobbies && (<>
            {sec("Interests")}
            <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.82}em`, color:"#6B7280", lineHeight:d.lineHeight * 0.9 }}>
              {hobbies.split(",").map(h=>h.trim()).map((h,i,arr) => <span key={i}>{h}{i<arr.length-1?" · ":""}</span>)}
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — MERIDIAN  (navy gradient header, white body)
// ═══════════════════════════════════════════════════════════════════════════
function TplMeridian({ form, d }: { form: FormData; d: D }) {
  const f = form
  const name        = f.personal.name || PH.name
  const title       = f.personal.title || PH.title
  const email       = f.personal.email || PH.email
  const phone       = f.personal.phone || PH.phone
  const location    = f.personal.location || PH.location
  const linkedin    = f.personal.linkedin || PH.linkedin
  const summary     = f.summary || PH.summary
  const exps        = f.experience.some(e => e.title) ? f.experience : PH.experience
  const edus        = f.education.some(e => e.institution) ? f.education : PH.education
  const skills      = f.skills.length > 0 ? f.skills : PH.skills
  const langs       = f.languages.filter(l => l.lang).length > 0 ? f.languages : PH.languages
  const hobbies     = f.hobbies || (d.showHobbies ? PH.hobbies : "")
  const achievements = f.achievements || (d.showAchievements ? PH.achievements : "")

  const NAVY = "#0D2B45"
  const AQUA = "#028090"
  const INK  = "#1A1A2E"

  const sec = (label: string) => (
    <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm}em`, fontWeight:700, color:NAVY, letterSpacing:"0.1em", textTransform:"uppercase" as const, marginTop:`${d.sectionGapEm * 0.85}em`, marginBottom:"0.5em", paddingBottom:"0.3em", borderBottom:"1.5px solid #E2E8F0" }}>
      {label}
    </div>
  )

  return (
    <div style={{ background:"#FFF", height:"100%", fontFamily:"Georgia,serif" }}>
      <div style={{ background:`linear-gradient(135deg, ${NAVY} 0%, #164B6E 100%)`, padding:`${d.headerPadVEm * 0.9}em ${d.headerPadHEm * 1.1}em` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"1.2em" }}>
          {f.personal.photo ? (
            <img src={f.personal.photo} alt="" style={{ width:`${d.photoEm * 0.9}em`, height:`${d.photoEm * 0.9}em`, borderRadius:"50%", objectFit:"cover", border:`0.18em solid ${AQUA}`, flexShrink:0 }} />
          ) : (
            <div style={{ width:`${d.photoEm * 0.9}em`, height:`${d.photoEm * 0.9}em`, borderRadius:"50%", background:"rgba(2,128,144,0.25)", border:`0.12em solid ${AQUA}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:`${d.photoEm * 0.27}em`, fontWeight:700, color:"rgba(255,255,255,0.65)", flexShrink:0, fontFamily:"Arial,sans-serif" }}>
              {initials(name)}
            </div>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.nameEm}em`, fontWeight:700, color:"#FFF", lineHeight:1.1, marginBottom:"0.2em" }}>{name}</div>
            <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.titleEm * 0.85}em`, color:AQUA, letterSpacing:"0.1em", textTransform:"uppercase" as const, fontWeight:600, marginBottom:"0.45em" }}>{title}</div>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.9em" }}>
              {[email, phone, location, linkedin && linkedin.replace("https://","")].filter(Boolean).map((c,i) => (
                <span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.82}em`, color:"rgba(255,255,255,0.55)" }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"0.4em", marginTop:"0.8em" }}>
          {skills.slice(0,9).map((s,i) => (
            <span key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.78}em`, color:"#FFF", background:"rgba(255,255,255,0.12)", border:"0.5px solid rgba(255,255,255,0.18)", padding:"0.2em 0.65em", borderRadius:"999px", fontWeight:500 }}>{s}</span>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`1fr ${d.sidebarWidthEm * 0.72}em`, height:`calc(100% - ${(d.headerPadVEm * 1.8) + d.photoEm * 0.9 * 0.6 + 2.5}em)` }}>
        <div style={{ padding:`${d.bodyPadEm * 0.7}em ${d.bodyPadEm}em`, overflow:"hidden" }}>
          {sec("Profile")}
          <p style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm}em`, color:"#374151", lineHeight:d.lineHeight, margin:"0 0 0.3em" }}>{summary}</p>
          {sec("Experience")}
          {exps.filter(e=>e.title||e.company).map((e,i) => (
            <div key={i} style={{ marginBottom:`${d.sectionGapEm * 0.65}em` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"0.5em" }}>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 1.05}em`, fontWeight:700, color:INK }}>{e.title}</span>
                <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm * 0.82}em`, color:"#9CA3AF", flexShrink:0 }}>
                  {fmtDate(e.start)}{(e.start||e.end||e.current) ? ` – ${e.current?"Present":fmtDate(e.end)}` : ""}
                </span>
              </div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.9}em`, color:AQUA, fontWeight:600, marginBottom:"0.32em" }}>{e.company}</div>
              {e.bullets.filter(b=>b.trim()).map((b,j) => (
                <div key={j} style={{ display:"flex", gap:"0.45em", marginBottom:"0.15em" }}>
                  <span style={{ color:AQUA, fontWeight:700, fontSize:`${d.bulletEm * 0.85}em`, flexShrink:0, marginTop:"0.2em", lineHeight:1, fontFamily:"Arial,sans-serif" }}>▸</span>
                  <p style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm}em`, color:"#4B5563", lineHeight:d.lineHeight, margin:0 }}>{b}</p>
                </div>
              ))}
            </div>
          ))}
          {achievements && (
            <div style={{ background:"#F0F7F8", borderRadius:"0.4em", padding:"0.65em 0.85em", borderLeft:`0.2em solid ${AQUA}`, marginTop:`${d.sectionGapEm * 0.4}em` }}>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.secLabelEm * 0.82}em`, fontWeight:700, color:NAVY, letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:"0.35em" }}>Key Achievements</div>
              {achievements.split("·").map(a=>a.trim()).filter(Boolean).map((a,i) => (
                <div key={i} style={{ display:"flex", gap:"0.45em", marginBottom:"0.15em" }}>
                  <span style={{ color:AQUA, fontFamily:"Arial,sans-serif", fontSize:`${d.bulletEm * 0.85}em`, flexShrink:0 }}>✓</span>
                  <span style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bulletEm * 0.9}em`, color:"#374151", lineHeight:d.lineHeight * 0.88 }}>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:`${d.bodyPadEm * 0.7}em ${d.bodyPadEm * 0.75}em`, borderLeft:"1px solid #E8EEF2", overflow:"hidden" }}>
          {sec("Education")}
          {edus.filter(e=>e.institution).map((e,i) => (
            <div key={i} style={{ marginBottom:"0.55em" }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:`${d.bodyEm * 0.96}em`, fontWeight:700, color:INK }}>{e.degree}{e.field ? ` — ${e.field}` : ""}</div>
              <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.84}em`, color:"#6B7280" }}>{e.institution}</div>
              {e.endYear && <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.78}em`, color:"#9CA3AF" }}>{e.endYear}</div>}
            </div>
          ))}
          {sec("Languages")}
          {langs.filter(l=>l.lang).map((l,i) => (
            <div key={i} style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.88}em`, color:"#374151", marginBottom:"0.28em", lineHeight:1.5 }}>
              <span style={{ fontWeight:700, color:INK }}>{l.lang}</span>
              <span style={{ color:"#9CA3AF" }}> · {l.level}</span>
            </div>
          ))}
          {hobbies && (<>
            {sec("Interests")}
            <div style={{ fontFamily:"Arial,Helvetica,sans-serif", fontSize:`${d.bodyEm * 0.82}em`, color:"#6B7280", lineHeight:d.lineHeight * 0.9 }}>
              {hobbies.split(",").map(h=>h.trim()).map((h,i,arr) => <span key={i}>{h}{i<arr.length-1?" · ":""}</span>)}
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

const TEMPLATES = [
  { id:"prestige",  name:"Prestige",   sub:"Finance · C-Suite · Legal",    component: TplPrestige },
  { id:"architect", name:"Architect",  sub:"Tech · Strategy · Ops",        component: TplArchitect },
  { id:"meridian",  name:"Meridian",   sub:"HR · Sales · Marketing",       component: TplMeridian },
]

// ── CV PREVIEW — ResizeObserver scales base em ───────────────────────────────
function CVPreview({ form, templateId }: { form: FormData; templateId: string }) {
  const [basePx, setBasePx] = useState(9.5)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => {
      const w = el.getBoundingClientRect().width
      setBasePx(Math.max(5.5, Math.min(11, w * 0.012)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const density = getContentDensity(form)
  const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]
  const TplComponent = tpl.component

  return (
    <div style={{ background:"#1a2228", padding:"14px", borderRadius:"10px", height:"100%", display:"flex", flexDirection:"column" as const }}>
      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px" }}>
        <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#22c55e" }} />
        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" as const }}>Live preview</span>
        <span style={{ marginLeft:"auto", fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>A4</span>
      </div>
      <div ref={boxRef} style={{ flex:1, overflow:"hidden" }}>
        <div id="cv-preview-print" style={{
          background:"white", borderRadius:"3px",
          boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
          overflow:"hidden", width:"100%",
          aspectRatio:"210/297",
          fontSize:`${basePx}px`,
        }}>
          <TplComponent form={form} d={density} />
        </div>
      </div>
      {density.isSparse && (
        <div style={{ marginTop:"8px", padding:"6px 10px", background:"rgba(2,128,144,0.15)", borderRadius:"6px", fontSize:"10px", color:"rgba(2,128,144,0.9)", display:"flex", alignItems:"center", gap:"6px" }}>
          <Sparkles size={10} /> AI will expand your content to fill the page beautifully
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
  const [selectedTemplate, setSelectedTemplate] = useState("prestige")
  const [generating, setGenerating] = useState(false)
  const [generatingBullet, setGeneratingBullet] = useState<number|null>(null)
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
        body: JSON.stringify({ type:"summary", title:form.personal.title, level:form.level, function:form.job_function, experience:form.experience, skills:form.skills, location:form.personal.location, targetWords:density.summaryTargetWords, isSparse:density.isSparse })
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
        body: JSON.stringify({ type:"bullets", title:exp.title, company:exp.company, roughBullets:exp.bullets.filter(b=>b.trim()), minBullets:density.minBulletsPerRole })
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
        body: JSON.stringify({ type:"achievements", title:form.personal.title, level:form.level, function:form.job_function, experience:form.experience })
      })
      const data = await res.json()
      if (data.text) setForm(f => ({ ...f, achievements: data.text }))
    } catch {}
  }

  function addExp() { setForm(f => ({ ...f, experience: [...f.experience, { company:"", title:"", start:"", end:"", current:false, bullets:[""] }] })) }
  function removeExp(i: number) { setForm(f => ({ ...f, experience: f.experience.filter((_,idx) => idx!==i) })) }
  function updateExp(i: number, k: string, v: any) {
    const u = [...form.experience]; u[i] = { ...u[i], [k]: v }
    setForm(f => ({ ...f, experience: u }))
  }
  function updateBullet(ei: number, bi: number, v: string) {
    const u = [...form.experience]; const b = [...u[ei].bullets]
    b[bi] = v; u[ei] = { ...u[ei], bullets:b }
    setForm(f => ({ ...f, experience: u }))
  }
  function addEdu() { setForm(f => ({ ...f, education: [...f.education, { institution:"", degree:"", field:"", startYear:"", endYear:"" }] })) }
  function updateEdu(i: number, k: string, v: string) {
    const u = [...form.education]; u[i] = { ...u[i], [k]: v }
    setForm(f => ({ ...f, education: u }))
  }
  function toggleSkill(s: string) {
    setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x=>x!==s) : [...f.skills, s] }))
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
    style.innerHTML = `@media print { body * { visibility:hidden } #cv-preview-print, #cv-preview-print * { visibility:visible } #cv-preview-print { position:fixed;left:0;top:0;width:210mm;height:297mm;box-shadow:none;border-radius:0;font-size:9.5px } }`
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
        user_id: user.id, full_name: form.personal.name,
        email: form.personal.email || user.email, phone: form.personal.phone,
        location: form.personal.location, nationality: form.personal.nationality,
        job_function: form.job_function, level: form.level,
        cv_summary: form.summary, skills: form.skills,
        source: "cv_builder", template_used: selectedTemplate,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("id").single()

      const candidateId = upserted?.id
      if (candidateId) {
        const cvText = [form.personal.name, form.personal.title, form.level, form.job_function, form.summary,
          form.experience.map(e=>`${e.title} at ${e.company}: ${e.bullets.filter(b=>b.trim()).join(". ")}`).join("\n"),
          form.skills.join(", "), form.education.map(e=>`${e.degree} ${e.field} ${e.institution}`).join(", "),
          form.languages.map(l=>`${l.lang} ${l.level}`).join(", "),
        ].filter(Boolean).join("\n")
        fetch("/api/extract-structured", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ candidateId, cv_text:cvText }) })
          .then(() => fetch("/api/generate-embedding", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ candidateId, text:cvText }) }))
          .catch(()=>{})
        fetch("/api/generate-cv-pdf", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ candidateId, form, templateId:selectedTemplate }) }).catch(()=>{})
      }
      triggerPDFDownload()
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
    setReviewing(true); setReviewSaved(false); setReviewEmail(""); setReviewPassword(""); setReviewAuthError("")
    try {
      const text = await reviewFile.text(); setReviewText(text)
      const res = await fetch("/api/generate-cv", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type:"review", cvText:text.slice(0,4000) }) })
      const data = await res.json()
      if (data.email) setReviewEmail(data.email)
      setReviewResult(data)
    } catch {}
    setReviewing(false)
  }

  async function handleReviewSave() {
    if (!reviewEmail || !reviewPassword) return
    setReviewSaving(true); setReviewAuthError("")
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email:reviewEmail, password:reviewPassword })
      if (signUpError && !signUpError.message.includes("already registered")) { setReviewAuthError(signUpError.message); setReviewSaving(false); return }
      const { data: ru } = await supabase.from("candidates").upsert({
        email:reviewEmail, full_name:reviewResult?.name||"", name:reviewResult?.name||"",
        current_title:reviewResult?.current_title||"", current_company:reviewResult?.current_company||"",
        cv_text:reviewText.slice(0,50000), cv_score:reviewResult?.score||null,
        source:"cv_reviewer", updated_at:new Date().toISOString(),
      }, { onConflict:"email" }).select("id").single()
      const rid = ru?.id
      if (rid && reviewText.trim()) {
        fetch("/api/extract-structured", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ candidateId:rid, cv_text:reviewText.slice(0,50000) }) })
          .then(() => fetch("/api/generate-embedding", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ candidateId:rid, text:reviewText.slice(0,8000) }) }))
          .catch(()=>{})
      }
      setReviewSaved(true)
    } catch (err: any) { setReviewAuthError(err.message || "Something went wrong") }
    setReviewSaving(false)
  }

  const suggestedSkills = SKILL_SUGGESTIONS[form.job_function] || Object.values(SKILL_SUGGESTIONS).flat().slice(0,12)

  // ── Input styles ──
  const inp: React.CSSProperties = { width:"100%", padding:"10px 13px", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontSize:"13px", color:"#0a1f24", outline:"none", fontFamily:"inherit", background:"white", boxSizing:"border-box" as const }
  const sel: React.CSSProperties = { ...inp, cursor:"pointer" }
  const lbl: React.CSSProperties = { display:"block", fontSize:"11px", fontWeight:600, color:"#6b7280", marginBottom:"5px", letterSpacing:".02em" }

  // ── PORTAL NAV = 64px, BUILDER TOPBAR = 49px, TOTAL = 113px ──────────────
  // The builder topbar is removed — we integrate the tab switcher directly into portal nav logic.
  // Instead, we use a slim integrated sub-bar (49px) so total offset is 64+49=113px.
  const TOPBAR_H = 49
  const BODY_H = `calc(100vh - 64px - ${TOPBAR_H}px)` // subtract portal nav + our topbar

  return (
    <div style={{ minHeight:"100vh", background:"#f0f2f4" }}>

      {/* ── Slim integrated topbar ── */}
      <div style={{ background:"white", borderBottom:"1px solid #e8ecef", padding:"0 24px", height:`${TOPBAR_H}px`, display:"flex", alignItems:"center", gap:"16px" }}>
        <button onClick={() => window.history.back()} style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", color:"#6b7280", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:500 }}>
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ width:"1px", height:"18px", background:"#e5e7eb" }} />
        <span style={{ fontSize:"13px", fontWeight:700, color:"#0a1f24", letterSpacing:"-0.01em" }}>CV Builder</span>

        {/* Template quick-switch — always visible in topbar */}
        <div style={{ display:"flex", gap:"4px", marginLeft:"12px" }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
              style={{ padding:"5px 12px", borderRadius:"6px", border:"1.5px solid", fontSize:"11px", fontWeight:700, cursor:"pointer", transition:"all .12s",
                borderColor: selectedTemplate===t.id ? "#028090" : "#e5e7eb",
                background: selectedTemplate===t.id ? "#028090" : "white",
                color: selectedTemplate===t.id ? "white" : "#6b7280" }}>
              {t.name}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
          {(["builder","reviewer"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ padding:"6px 14px", borderRadius:"7px", border:"1.5px solid", fontSize:"12px", fontWeight:600, cursor:"pointer",
                borderColor: activeTab===t ? "#028090" : "#e5e7eb",
                background: activeTab===t ? "#028090" : "white",
                color: activeTab===t ? "white" : "#374151" }}>
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
                <div onClick={() => document.getElementById("review-input")?.click()}
                  style={{ border:"2px dashed #d1d5db", borderRadius:"14px", padding:"40px", textAlign:"center" as const, cursor:"pointer", marginBottom:"20px", background:reviewFile?"#f0fdf4":"white" }}>
                  <Upload size={28} color={reviewFile?"#028090":"#9ca3af"} style={{ margin:"0 auto 12px" }} />
                  <p style={{ fontWeight:600, color:reviewFile?"#028090":"#374151", fontSize:"15px", margin:0 }}>{reviewFile ? reviewFile.name : "Drop your CV here"}</p>
                  <p style={{ color:"#9ca3af", fontSize:"13px", margin:"4px 0 0" }}>PDF or Word · Max 5MB</p>
                  <input id="review-input" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display:"none" }} onChange={e => setReviewFile(e.target.files?.[0]||null)} />
                </div>
                <button onClick={handleReview} disabled={!reviewFile||reviewing}
                  style={{ width:"100%", padding:"14px", background:reviewFile?"#028090":"#e5e7eb", color:reviewFile?"white":"#9ca3af", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"15px", cursor:reviewFile?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  {reviewing ? <><Loader2 size={16} className="animate-spin" /> Analysing…</> : <><Sparkles size={16} /> Analyse with AI</>}
                </button>
              </>
            ) : (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}>
                  {[{ val:reviewResult.score||72, label:"CV score / 100", bg:"#f0fdf4", border:"#bbf7d0", color:"#059669" },
                    { val:reviewResult.strengths?.length||3, label:"Strengths", bg:"#f0fdf4", border:"#bbf7d0", color:"#059669" },
                    { val:reviewResult.concerns?.length||3, label:"Areas to improve", bg:"#fffbeb", border:"#fde68a", color:"#d97706" }
                  ].map((s,i) => (
                    <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:"12px", padding:"16px", textAlign:"center" as const }}>
                      <div style={{ fontSize:"28px", fontWeight:800, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"#f9fafb", borderRadius:"12px", padding:"16px", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"#374151", lineHeight:1.7, margin:0 }}>{reviewResult.summary}</p>
                </div>
                {reviewResult.strengths?.length > 0 && (
                  <div style={{ marginBottom:"12px" }}>
                    <p style={{ fontSize:"12px", fontWeight:600, color:"#059669", marginBottom:"8px" }}>✓ Strengths</p>
                    {reviewResult.strengths.map((s: string, i: number) => (
                      <div key={i} style={{ fontSize:"13px", color:"#374151", padding:"6px 0", borderBottom:i<reviewResult.strengths.length-1?"1px solid #f3f4f6":"none" }}>• {s}</div>
                    ))}
                  </div>
                )}
                {reviewResult.concerns?.length > 0 && (
                  <div style={{ marginBottom:"20px" }}>
                    <p style={{ fontSize:"12px", fontWeight:600, color:"#d97706", marginBottom:"8px" }}>⚠ Areas to improve</p>
                    {reviewResult.concerns.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize:"13px", color:"#374151", padding:"6px 0", borderBottom:i<reviewResult.concerns.length-1?"1px solid #f3f4f6":"none" }}>• {c}</div>
                    ))}
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                  <button onClick={() => { setReviewResult(null); setReviewFile(null); setReviewSaved(false) }} style={{ padding:"12px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:"pointer", color:"#374151" }}>Review another CV</button>
                  <button onClick={() => setActiveTab("builder")} style={{ padding:"12px", background:"#028090", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                    <Sparkles size={13} /> Rebuild with AI
                  </button>
                </div>
                {!reviewSaved ? (
                  <div style={{ background:"linear-gradient(135deg,#0a1f24,#1a3a3a)", borderRadius:"16px", padding:"20px 22px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                      <CheckCircle size={16} color="#a8d5d1" />
                      <p style={{ fontWeight:700, color:"white", fontSize:"14px", margin:0 }}>Save your CV to the GPS Talent Network</p>
                    </div>
                    <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"12px", lineHeight:1.6, marginBottom:"14px" }}>GPS recruiters will find you when a matching role opens. Free — 10 seconds.</p>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:"8px", marginBottom:"12px" }}>
                      <input style={{ width:"100%", padding:"9px 12px", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", fontSize:"13px", background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }} type="email" placeholder="Your email" value={reviewEmail} onChange={e=>setReviewEmail(e.target.value)} />
                      <input style={{ width:"100%", padding:"9px 12px", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", fontSize:"13px", background:"rgba(255,255,255,0.08)", color:"white", outline:"none" }} type="password" placeholder="Choose a password (min 6 chars)" value={reviewPassword} onChange={e=>setReviewPassword(e.target.value)} />
                    </div>
                    {reviewAuthError && <p style={{ color:"#fca5a5", fontSize:"12px", marginBottom:"8px" }}>{reviewAuthError}</p>}
                    <button onClick={handleReviewSave} disabled={reviewSaving||!reviewEmail||!reviewPassword}
                      style={{ width:"100%", padding:"11px", background:"#028090", border:"none", borderRadius:"9px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", opacity:(!reviewEmail||!reviewPassword)?0.5:1 }}>
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

      {/* ── BUILDER TAB ── */}
      {activeTab === "builder" && (
        <div style={{ display:"grid", gridTemplateColumns:"400px 1fr", height:BODY_H, overflow:"hidden" }}>

          {/* LEFT — form panel */}
          <div style={{ background:"white", borderRight:"1px solid #e8ecef", display:"flex", flexDirection:"column" as const, overflow:"hidden" }}>

            {/* Step progress bar */}
            <div style={{ padding:"12px 20px 10px", borderBottom:"1px solid #f3f4f6" }}>
              <div style={{ display:"flex", alignItems:"center" }}>
                {STEPS.map((s, i) => {
                  const Icon = s.icon
                  const done = i < step; const active = i === step
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : "none" }}>
                      <button onClick={() => i <= step && setStep(i)}
                        style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"2px", background:"none", border:"none", cursor:i<=step?"pointer":"default", padding:0, flexShrink:0 }}>
                        <div style={{ width:"24px", height:"24px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                          background:done?"#028090":active?"#0a1f24":"#f3f4f6",
                          border:active?"2px solid #028090":"none", transition:"all 0.2s" }}>
                          {done ? <CheckCircle size={12} color="white" /> : <Icon size={11} color={active?"white":"#9ca3af"} />}
                        </div>
                        <span style={{ fontSize:"8px", fontWeight:600, color:active?"#0a1f24":done?"#028090":"#9ca3af", whiteSpace:"nowrap" as const }}>{s.label}</span>
                      </button>
                      {i < STEPS.length-1 && <div style={{ flex:1, height:"1.5px", background:done?"#028090":"#f3f4f6", margin:"0 3px 10px", borderRadius:"99px" }} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Form scroll area */}
            <div style={{ flex:1, overflowY:"auto" as const, padding:"18px 20px" }}>

              {/* ── STEP 1: PERSONAL ── */}
              {currentStepId === "personal" && (
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Personal details</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"18px" }}>Your photo is recommended — CVs with photos get more recruiter views in MENA.</p>

                  {/* Photo */}
                  <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"18px", padding:"14px", background:"#f9fafb", borderRadius:"12px", border:"1px solid #e8ecef" }}>
                    <div style={{ position:"relative", cursor:"pointer", flexShrink:0 }} onClick={() => photoRef.current?.click()}>
                      {form.personal.photo ? (
                        <img src={form.personal.photo} style={{ width:"56px", height:"56px", borderRadius:"50%", objectFit:"cover", border:"3px solid #028090" }} alt="" />
                      ) : (
                        <div style={{ width:"56px", height:"56px", borderRadius:"50%", background:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", border:"2px dashed #d1d5db" }}>
                          <Camera size={18} color="#9ca3af" />
                        </div>
                      )}
                      <div style={{ position:"absolute", bottom:0, right:0, width:"18px", height:"18px", background:"#028090", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
                        <Plus size={9} color="white" />
                      </div>
                    </div>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto} />
                    <div>
                      <p style={{ fontWeight:600, color:"#0a1f24", fontSize:"13px", margin:0 }}>Profile photo</p>
                      <p style={{ color:"#6b7280", fontSize:"11px", margin:"2px 0 8px" }}>Strongly recommended for MENA market</p>
                      <button onClick={() => photoRef.current?.click()} style={{ padding:"4px 10px", background:"#028090", color:"white", border:"none", borderRadius:"6px", fontSize:"11px", fontWeight:600, cursor:"pointer" }}>
                        {form.personal.photo ? "Change photo" : "Upload photo"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={lbl}>Full name *</label>
                      <input style={inp} placeholder="Ahmed Hassan" value={form.personal.name} onChange={e=>setPersonal("name",e.target.value)} />
                    </div>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={lbl}>Job title *</label>
                      <input style={inp} placeholder="Finance Manager" value={form.personal.title} onChange={e=>setPersonal("title",e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Email</label>
                      <input style={inp} type="email" placeholder="ahmed@email.com" value={form.personal.email} onChange={e=>setPersonal("email",e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Phone</label>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <div style={{ ...inp, width:"52px", flexShrink:0, background:"#f9fafb", color:"#9ca3af", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 6px" }}>+20</div>
                        <input style={{ ...inp, flex:1 }} placeholder="100 123 4567" value={form.personal.phone.replace(/^\+20\s?/,"")} onChange={e=>setPersonal("phone", "+20 "+e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Location</label>
                      <input style={inp} placeholder="Cairo, Egypt" value={form.personal.location} onChange={e=>setPersonal("location",e.target.value)} />
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
                      <input style={inp} placeholder="linkedin.com/in/yourname" value={form.personal.linkedin} onChange={e=>setPersonal("linkedin",e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Function</label>
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

              {/* ── STEP 2: EXPERIENCE ── */}
              {currentStepId === "experience" && (
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Work experience</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"16px" }}>Add your roles. Use AI to write strong, quantified bullet points.</p>
                  {form.experience.map((e, i) => (
                    <div key={i} style={{ background:"#f9fafb", borderRadius:"12px", padding:"14px", marginBottom:"12px", border:"1px solid #e8ecef" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                        <span style={{ fontSize:"11px", fontWeight:700, color:"#0a1f24", textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>Role {i+1}</span>
                        {form.experience.length > 1 && (
                          <button onClick={()=>removeExp(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", display:"flex", alignItems:"center", gap:"3px", fontSize:"11px", padding:0 }}>
                            <Trash2 size={11} /> Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Job title</label>
                          <input style={inp} placeholder="Finance Manager" value={e.title} onChange={ev=>updateExp(i,"title",ev.target.value)} />
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Company</label>
                          <input style={inp} placeholder="ABC Group" value={e.company} onChange={ev=>updateExp(i,"company",ev.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>Start</label>
                          <input style={inp} type="month" value={e.start} onChange={ev=>updateExp(i,"start",ev.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>End</label>
                          <input style={inp} type="month" value={e.end} disabled={e.current} onChange={ev=>updateExp(i,"end",ev.target.value)} />
                          <label style={{ ...lbl, marginTop:"6px", display:"flex", alignItems:"center", gap:"5px", cursor:"pointer", fontWeight:500 }}>
                            <input type="checkbox" checked={e.current} onChange={ev=>updateExp(i,"current",ev.target.checked)} /> Current role
                          </label>
                        </div>
                      </div>
                      <label style={lbl}>Bullet points</label>
                      {e.bullets.map((b, j) => (
                        <div key={j} style={{ display:"flex", gap:"6px", marginBottom:"5px", alignItems:"flex-start" }}>
                          <span style={{ color:"#028090", fontSize:"14px", marginTop:"10px", flexShrink:0, lineHeight:1 }}>▸</span>
                          <input style={{ ...inp, fontSize:"12px" }} placeholder={`Responsibility or achievement ${j+1}`} value={b} onChange={ev=>updateBullet(i,j,ev.target.value)} />
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:"8px", marginTop:"6px" }}>
                        <button onClick={()=>{ const u=[...form.experience]; u[i].bullets=[...u[i].bullets,""]; setForm(f=>({...f,experience:u})) }}
                          style={{ fontSize:"11px", color:"#028090", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>+ Add bullet</button>
                        <button onClick={()=>generateBullets(i)} disabled={!e.title||!e.company||generatingBullet===i}
                          style={{ fontSize:"11px", color:"white", background:(!e.title||!e.company)?"#d1d5db":"#028090", border:"none", borderRadius:"6px", padding:"4px 10px", cursor:(!e.title||!e.company)?"default":"pointer", fontWeight:600, display:"flex", alignItems:"center", gap:"4px" }}>
                          {generatingBullet===i ? <><Loader2 size={10} className="animate-spin" /> Writing…</> : <><Sparkles size={10} /> Write with AI</>}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addExp} style={{ width:"100%", padding:"10px", border:"1.5px dashed #d1d5db", borderRadius:"10px", background:"white", color:"#6b7280", fontSize:"13px", cursor:"pointer", fontWeight:600 }}>+ Add another role</button>
                </div>
              )}

              {/* ── STEP 3: SKILLS ── */}
              {currentStepId === "skills" && (
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Skills & languages</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"16px" }}>Tap to select your key skills. Add languages below.</p>
                  {form.job_function && (
                    <p style={{ fontSize:"11px", color:"#028090", fontWeight:600, marginBottom:"8px" }}>Showing skills for: {form.job_function}</p>
                  )}
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"6px", marginBottom:"18px" }}>
                    {suggestedSkills.map(s => (
                      <button key={s} onClick={()=>toggleSkill(s)}
                        style={{ padding:"6px 12px", borderRadius:"999px", border:"1.5px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", transition:"all .12s",
                          borderColor:form.skills.includes(s)?"#028090":"#e5e7eb",
                          background:form.skills.includes(s)?"#028090":"white",
                          color:form.skills.includes(s)?"white":"#374151" }}>
                        {form.skills.includes(s) ? "✓ " : ""}{s}
                      </button>
                    ))}
                  </div>
                  {form.skills.length > 0 && (
                    <div style={{ marginBottom:"16px", padding:"10px 12px", background:"#f0f9f8", borderRadius:"8px", border:"1px solid #d1f0ee" }}>
                      <p style={{ fontSize:"11px", fontWeight:600, color:"#028090", margin:"0 0 6px" }}>{form.skills.length} skills selected</p>
                      <div style={{ display:"flex", flexWrap:"wrap" as const, gap:"4px" }}>
                        {form.skills.map(s => (
                          <span key={s} onClick={()=>toggleSkill(s)} style={{ background:"#028090", color:"white", fontSize:"10px", padding:"2px 8px", borderRadius:"99px", cursor:"pointer", fontWeight:600 }}>{s} ×</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom:"16px" }}>
                    <label style={lbl}>Languages</label>
                    {form.languages.map((l, i) => (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:"6px", marginBottom:"6px", alignItems:"center" }}>
                        <select style={sel} value={l.lang} onChange={e=>{ const u=[...form.languages]; u[i]={...u[i],lang:e.target.value}; setForm(f=>({...f,languages:u})) }}>
                          {LANGUAGES.map(ln=><option key={ln}>{ln}</option>)}
                        </select>
                        <select style={sel} value={l.level} onChange={e=>{ const u=[...form.languages]; u[i]={...u[i],level:e.target.value}; setForm(f=>({...f,languages:u})) }}>
                          {["Native","Fluent","Advanced","Intermediate","Basic"].map(lv=><option key={lv}>{lv}</option>)}
                        </select>
                        {form.languages.length > 1 && (
                          <button onClick={()=>setForm(f=>({...f,languages:f.languages.filter((_,idx)=>idx!==i)}))} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:"4px" }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={()=>setForm(f=>({...f,languages:[...f.languages,{lang:"English",level:"Intermediate"}]}))}
                      style={{ fontSize:"11px", color:"#028090", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>+ Add language</button>
                  </div>
                  <div>
                    <label style={lbl}>Hobbies & interests <span style={{ color:"#d1d5db", fontWeight:400 }}>optional</span></label>
                    <input style={inp} placeholder="e.g. Football, reading, photography" value={form.hobbies} onChange={e=>setForm(f=>({...f,hobbies:e.target.value}))} />
                  </div>
                </div>
              )}

              {/* ── STEP 4: EDUCATION ── */}
              {currentStepId === "education" && (
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Education</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"16px" }}>Add your degrees. Include certifications in the achievements field below.</p>
                  {form.education.map((e, i) => (
                    <div key={i} style={{ background:"#f9fafb", borderRadius:"12px", padding:"14px", marginBottom:"10px", border:"1px solid #e8ecef" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Institution</label>
                          <input style={inp} placeholder="Cairo University" value={e.institution} onChange={ev=>updateEdu(i,"institution",ev.target.value)} />
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Degree</label>
                          <input style={inp} placeholder="B.Sc. Accounting" value={e.degree} onChange={ev=>updateEdu(i,"degree",ev.target.value)} />
                        </div>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Field of study</label>
                          <input style={inp} placeholder="Finance" value={e.field} onChange={ev=>updateEdu(i,"field",ev.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>Start year</label>
                          <input style={inp} placeholder="2012" value={e.startYear} onChange={ev=>updateEdu(i,"startYear",ev.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>End year</label>
                          <input style={inp} placeholder="2016" value={e.endYear} onChange={ev=>updateEdu(i,"endYear",ev.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addEdu} style={{ width:"100%", padding:"9px", border:"1.5px dashed #d1d5db", borderRadius:"10px", background:"white", color:"#6b7280", fontSize:"12px", cursor:"pointer", fontWeight:600, marginBottom:"16px" }}>+ Add education</button>
                  <div>
                    <label style={lbl}>Achievements & certifications <span style={{ color:"#d1d5db", fontWeight:400 }}>optional</span></label>
                    <p style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"6px" }}>Separate with · e.g. "CMA certified · Top performer Q3 2022"</p>
                    <div style={{ display:"flex", gap:"6px" }}>
                      <textarea style={{ ...inp, height:"56px", resize:"none" as const, fontSize:"12px", flex:1 }} placeholder="CMA certified · Top performer Q3 2022" value={form.achievements} onChange={e=>setForm(f=>({...f,achievements:e.target.value}))} />
                      <button onClick={generateAchievements} title="Generate with AI"
                        style={{ flexShrink:0, width:"38px", background:"#028090", color:"white", border:"none", borderRadius:"9px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Sparkles size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 5: SUMMARY ── */}
              {currentStepId === "summary" && (
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Professional summary</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"16px" }}>3–4 sentences about who you are and what you bring. AI will calibrate length to fill your CV perfectly.</p>
                  <textarea
                    style={{ ...inp, height:"130px", resize:"none" as const, lineHeight:1.65, marginBottom:"12px" }}
                    placeholder="Experienced finance professional with 8+ years…"
                    value={form.summary}
                    onChange={e=>setForm(f=>({...f,summary:e.target.value}))}
                  />
                  {generating ? (
                    <div style={{ display:"flex", alignItems:"center", gap:"7px", color:"#028090", fontSize:"13px" }}>
                      <Loader2 size={14} className="animate-spin" /> Writing your summary…
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:"8px" }}>
                      <button onClick={generateSummary} disabled={!form.personal.title}
                        style={{ display:"flex", alignItems:"center", gap:"7px", padding:"9px 16px",
                          background:form.personal.title?"#028090":"#e5e7eb",
                          color:form.personal.title?"white":"#9ca3af",
                          border:"none", borderRadius:"9px", fontWeight:600, fontSize:"12px",
                          cursor:form.personal.title?"pointer":"default" }}>
                        <Sparkles size={12} />
                        {form.summary ? "Regenerate with AI" : "Generate with AI"}
                      </button>
                      {form.summary && (
                        <div style={{ display:"flex", alignItems:"center", gap:"5px", color:"#059669", fontSize:"12px" }}>
                          <CheckCircle size={12} /> Generated — edit freely
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 6: TEMPLATE ── */}
              {currentStepId === "template" && (
                <div>
                  <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"3px" }}>Choose your template</h2>
                  <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"18px" }}>3 premium designs. Switch anytime — the live preview updates instantly on the right.</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginBottom:"20px" }}>
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={()=>setSelectedTemplate(t.id)}
                        style={{ padding:0, border:selectedTemplate===t.id?"2.5px solid #028090":"1.5px solid #e5e7eb", borderRadius:"10px", overflow:"hidden", cursor:"pointer", background:"white",
                          boxShadow:selectedTemplate===t.id?"0 0 0 3px rgba(2,128,144,0.15)":"0 1px 3px rgba(0,0,0,0.05)", transition:"all .15s", textAlign:"left" as const }}>
                        <div style={{ padding:"10px 10px 8px" }}>
                          <p style={{ fontSize:"11px", fontWeight:800, color:selectedTemplate===t.id?"#028090":"#0a1f24", margin:0, marginBottom:"3px" }}>{t.name}</p>
                          <p style={{ fontSize:"9px", color:"#9ca3af", margin:0, lineHeight:1.4 }}>{t.sub}</p>
                        </div>
                        {selectedTemplate===t.id && <div style={{ background:"#028090", padding:"3px 0", textAlign:"center" as const, fontSize:"8px", color:"white", fontWeight:700, letterSpacing:".05em" }}>✓ SELECTED</div>}
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
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Download size={15} /> Save & Download PDF</>}
                  </button>
                  <p style={{ textAlign:"center" as const, fontSize:"11px", color:"#9ca3af", marginTop:"8px" }}>Saves to GPS recruiter database · Free download · No watermark</p>
                </div>
              )}

            </div>

            {/* Bottom nav */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center", background:"white" }}>
              <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
                style={{ display:"flex", alignItems:"center", gap:"4px", padding:"8px 14px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"8px", cursor:step===0?"default":"pointer", color:step===0?"#d1d5db":"#374151", fontWeight:600, fontSize:"12px" }}>
                <ArrowLeft size={12} /> Back
              </button>
              <span style={{ fontSize:"10px", color:"#9ca3af" }}>Step {step+1} / {STEPS.length}</span>
              {step < STEPS.length-1 ? (
                <button onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}
                  style={{ display:"flex", alignItems:"center", gap:"4px", padding:"8px 14px", background:"#028090", border:"none", borderRadius:"8px", cursor:"pointer", color:"white", fontWeight:600, fontSize:"12px" }}>
                  Next <ArrowRight size={12} />
                </button>
              ) : <div style={{ width:"80px" }} />}
            </div>
          </div>

          {/* RIGHT — live preview */}
          <div style={{ padding:"14px", overflow:"hidden", display:"flex", flexDirection:"column" as const }}>
            <CVPreview form={form} templateId={selectedTemplate} />
          </div>
        </div>
      )}

      {/* ── SIGNUP MODAL ── */}
      {showSignup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"24px" }}>
          <div style={{ background:"white", borderRadius:"20px", padding:"32px", width:"100%", maxWidth:"380px", boxShadow:"0 24px 80px rgba(0,0,0,0.25)" }}>
            <div style={{ textAlign:"center" as const, marginBottom:"20px" }}>
              <div style={{ width:"44px", height:"44px", background:"#e6f5f3", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                <CheckCircle size={20} color="#028090" />
              </div>
              <h2 style={{ fontSize:"17px", fontWeight:800, color:"#0a1f24", marginBottom:"4px" }}>Almost there!</h2>
              <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.5 }}>Create a free account to save your CV and join the GPS Talent Network.</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:"10px", marginBottom:"12px" }}>
              <input style={inp} type="email" placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} />
              <input style={inp} type="password" placeholder="Choose a password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            {authError && <p style={{ color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>{authError}</p>}
            <button onClick={handleSignupAndSave} disabled={authLoading||!email||!password}
              style={{ width:"100%", padding:"12px", background:"#028090", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", marginBottom:"8px" }}>
              {authLoading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Save CV & Go Live <ArrowRight size={14} /></>}
            </button>
            <p style={{ textAlign:"center" as const, fontSize:"12px", color:"#9ca3af" }}>
              Already have an account? <Link href="/login" style={{ color:"#028090", fontWeight:600 }}>Sign in</Link>
            </p>
            <button onClick={()=>setShowSignup(false)} style={{ width:"100%", padding:"8px", background:"none", border:"none", color:"#9ca3af", fontSize:"12px", cursor:"pointer", marginTop:"4px" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
