import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpF(a: number, b: number, t: number) { return parseFloat(lerp(a, b, t).toFixed(3)) }

function getContentDensity(form: FormData) {
  const expCount = form.experience.filter(e => e.title || e.company).length
  const bulletCount = form.experience.reduce((acc, e) => acc + e.bullets.filter(b => b.trim()).length, 0)
  const hasPhoto = !!form.personal.photo
  const hasEdu = form.education.some(e => e.institution)
  const skillCount = form.skills.length
  const summaryLen = form.summary.length
  const hasHobbies = !!form.hobbies.trim()
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
    bodyEm: lerpF(1.06, 0.85, t),
    bulletEm: lerpF(1.02, 0.82, t),
    secLabelEm: lerpF(0.88, 0.68, t),
    lineHeight: lerpF(1.78, 1.52, t),
    letterSp: lerpF(0.04, 0.10, t),
    nameEm: lerpF(1.90, 1.50, t),
    titleEm: lerpF(1.08, 0.88, t),
    photoEm: lerpF(7.00, 5.00, t),
    sectionGapEm: lerpF(1.80, 0.80, t),
    headerPadVEm: lerpF(2.30, 1.40, t),
    headerPadHEm: lerpF(2.40, 1.60, t),
    bodyPadEm: lerpF(1.70, 1.10, t),
    sidebarPct: 32,
    showHobbies: hasHobbies || score < 58,
    showAchievements: hasAchievements || score < 42,
    summaryTargetWords: Math.round(lerp(120, 55, t)),
    minBulletsPerRole: score < 45 ? 5 : 3,
  }
}
type D = ReturnType<typeof getContentDensity>

function fmtDate(month: string, year: string) {
  if (!year) return ""
  const mi = parseInt(month, 10)
  const m = (mi >= 1 && mi <= 12) ? MONTHS[mi - 1] : ""
  return m ? `${m} ${year}` : year
}
function initials(name: string) {
  const p = name.trim().split(" ")
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?"
}
const NO_BREAK: React.CSSProperties = { overflowWrap: "break-word", wordBreak: "break-word", hyphens: "auto", minWidth: 0 }
const PH = {
  name:"Ahmed Hassan", title:"Finance Manager", email:"ahmed@email.com", phone:"+20 100 123 4567",
  location:"Cairo, Egypt", linkedin:"linkedin.com/in/ahmed",
  summary:"Experienced professional.",
  experience:[{ company:"ABC Group", title:"Manager", startMonth:"01", startYear:"2020", endMonth:"", endYear:"", current:true, bullets:["Led teams."] }],
  education:[{ institution:"Cairo University", degree:"B.Sc.", field:"", startYear:"2012", endYear:"2016" }],
  skills:["Leadership"], languages:[{ lang:"Arabic", level:"Native" }],
  hobbies:"Reading", achievements:"Top performer",
}
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
  { id:"prestige", name:"Prestige", component:TplPrestige },
  { id:"architect", name:"Architect", component:TplArchitect },
  { id:"meridian", name:"Meridian", component:TplMeridian },
]

export function renderCvHtml(form: FormData, templateId: string, boost = 1): string {
  const density = getContentDensity(form)
  const b = Math.max(1, Math.min(1.7, boost || 1))
  const d = { ...density,
    lineHeight: Math.round(density.lineHeight*b*1000)/1000,
    sectionGapEm: Math.round(density.sectionGapEm*b*1000)/1000,
    headerPadVEm: Math.round(density.headerPadVEm*b*1000)/1000,
    bodyPadEm: Math.round(density.bodyPadEm*b*1000)/1000,
  }
  const densityFactor = lerp(1.22, 1.0, Math.min(density.t, 1))
  const basePx = Math.round(9.5 * densityFactor * 10) / 10
  const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]
  const Comp = tpl.component as any
  const inner = renderToStaticMarkup(React.createElement(Comp, { form, d }))
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{width:210mm;height:297mm}#cvpage{width:210mm;height:297mm;font-size:${basePx}px;overflow:hidden;background:#ffffff;font-family:Georgia,serif}</style></head><body><div id="cvpage">${inner}</div></body></html>`
}
