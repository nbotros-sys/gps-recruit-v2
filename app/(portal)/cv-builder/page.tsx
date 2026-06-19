"use client"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { ArrowRight, ArrowLeft, Upload, Sparkles, CheckCircle, Loader2, User, FileText, Briefcase, GraduationCap, Star, Download, Eye, RefreshCw, Camera, Plus, Trash2, ChevronDown } from "lucide-react"
import Link from "next/link"

const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","C-Suite / Executive","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level / Executive"]
const NATIONALITIES = ["Egyptian","Saudi","Emirati","Kuwaiti","Jordanian","Lebanese","Syrian","Palestinian","Sudanese","Libyan","Moroccan","Tunisian","Algerian","British","American","Canadian","French","German","Other"]
const LANGUAGES = ["Arabic","English","French","German","Spanish","Italian","Turkish","Mandarin","Other"]

const TEMPLATES = [
  { id:"executive", name:"Executive Dark", desc:"Finance · Legal · C-Suite", color:"#0a1f24", accent:"#028090", headerBg:"#0a1f24", sidebar:true },
  { id:"modern",    name:"Modern Header",  desc:"HR · Sales · Marketing",    color:"#028090", accent:"#f4f8f7", headerBg:"#028090", sidebar:false },
  { id:"twocol",    name:"Two-Column Pro", desc:"Consulting · Management",   color:"#f4f8f7", accent:"#028090", headerBg:"#f4f8f7", sidebar:true },
  { id:"bold",      name:"Bold Block",     desc:"Creative · Media · Tech",   color:"#3D5A4E", accent:"white",   headerBg:"#3D5A4E", sidebar:true },
  { id:"minimal",   name:"Clean Minimal",  desc:"Tech · Engineering · International", color:"white", accent:"#0a1f24", headerBg:"white", sidebar:false },
]

const STEPS = [
  { id:"personal",    icon:User,          label:"Personal" },
  { id:"experience",  icon:Briefcase,     label:"Experience" },
  { id:"skills",      icon:Sparkles,      label:"Skills" },
  { id:"education",   icon:GraduationCap, label:"Education" },
  { id:"summary",     icon:Star,          label:"Summary" },
  { id:"template",    icon:Eye,           label:"Template" },
]

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  "Finance & Accounting": ["Financial Reporting","IFRS","SAP","Excel Advanced","Budgeting","Forecasting","Cash Flow Management","ERP Systems","VAT Compliance","Financial Modelling"],
  "HR & People": ["Talent Acquisition","Performance Management","HRIS","Payroll","Labour Law","Employee Relations","Onboarding","Learning & Development","Compensation & Benefits","Organisation Design"],
  "Sales & Business Development": ["B2B Sales","CRM","Negotiation","Key Account Management","Pipeline Management","Salesforce","Business Development","Client Retention","Tendering","Market Expansion"],
  "Marketing": ["Digital Marketing","SEO/SEM","Social Media","Content Strategy","Google Analytics","Email Marketing","Brand Management","Campaign Management","Adobe Creative Suite","Arabic Content"],
  "Technology & IT": ["Python","JavaScript","SQL","Cloud (AWS/Azure)","Agile/Scrum","DevOps","Cybersecurity","System Architecture","API Development","Data Analysis"],
  "Operations": ["Process Improvement","Supply Chain","ERP","Lean/Six Sigma","Vendor Management","KPI Management","Project Management","Risk Management","Quality Control","Logistics"],
  "General Management": ["P&L Management","Strategic Planning","Team Leadership","Change Management","Stakeholder Management","Business Strategy","Operational Excellence","Cross-functional Leadership","Budget Management","Board Reporting"],
}

type FormData = {
  personal: { name:string; title:string; email:string; phone:string; location:string; nationality:string; dob:string; linkedin:string; photo:string|null }
  summary: string
  experience: Array<{ company:string; title:string; start:string; end:string; current:boolean; bullets:string[] }>
  education: Array<{ institution:string; degree:string; field:string; startYear:string; endYear:string }>
  hobbies: string
  skills: string[]
  languages: Array<{ lang:string; level:string }>
  function: string
  level: string
}

const INITIAL: FormData = {
  personal: { name:"", title:"", email:"", phone:"", location:"", nationality:"", dob:"", linkedin:"", photo:null },
  summary: "",
  experience: [{ company:"", title:"", start:"", end:"", current:false, bullets:[""] }],
  education: [{ institution:"", degree:"", field:"", startYear:"", endYear:"" }],
  hobbies: "",
  skills: [],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  function: "",
  level: "",
}

function SummaryStep({ form, generating, setForm, generateSummary, inp }: any) {
  useEffect(() => {
    if (!form.summary && form.experience.some((e: any) => e.title || e.company)) {
      generateSummary()
    }
  }, [])

  return (
    <div style={{ padding:"32px" }}>
      <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Professional summary</h2>
      <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>
        AI has read your experience and written a tailored summary. Edit freely or regenerate.
      </p>

      {generating ? (
        <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"20px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"12px", marginBottom:"16px" }}>
          <Loader2 size={18} color="#028090" className="animate-spin" />
          <div>
            <p style={{ fontWeight:600, color:"#028090", fontSize:"13px", margin:0 }}>Writing your summary…</p>
            <p style={{ color:"#6b7280", fontSize:"12px", margin:0 }}>AI is reading your experience and crafting a market-relevant summary</p>
          </div>
        </div>
      ) : (
        <div style={{ position:"relative", marginBottom:"16px" }}>
          <textarea
            value={form.summary}
            onChange={e => setForm((f: any) => ({ ...f, summary:e.target.value }))}
            rows={6}
            placeholder="Your professional summary will appear here once AI generates it…"
            style={{ ...inp, resize:"vertical", lineHeight:1.7 }}
          />
          {form.summary && (
            <div style={{ position:"absolute", bottom:"10px", right:"10px" }}>
              <button
                onClick={generateSummary}
                style={{ display:"flex", alignItems:"center", gap:"5px", padding:"5px 10px", background:"white", border:"1px solid #e5e7eb", borderRadius:"8px", fontSize:"11px", fontWeight:600, color:"#6b7280", cursor:"pointer" }}
              >
                <Sparkles size={11} /> Regenerate
              </button>
            </div>
          )}
        </div>
      )}

      {!generating && form.summary && (
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 14px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"10px" }}>
          <CheckCircle size={14} color="#059669" />
          <p style={{ fontSize:"12px", color:"#059669", margin:0, fontWeight:500 }}>
            Generated from your {form.experience.filter((e: any) => e.title).length} role{form.experience.filter((e: any) => e.title).length !== 1 ? "s" : ""} and {form.skills.length} skills — edit anything you like
          </p>
        </div>
      )}

      {!generating && !form.summary && (
        <button
          onClick={generateSummary}
          disabled={!form.personal.title}
          style={{ display:"flex", alignItems:"center", gap:"8px", padding:"11px 20px", background:form.personal.title?"#028090":"#e5e7eb", color:form.personal.title?"white":"#9ca3af", border:"none", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:form.personal.title?"pointer":"default" }}
        >
          <Sparkles size={14} /> Generate with AI
        </button>
      )}
    </div>
  )
}


// ── TEMPLATE COLOURS ──
const T: Record<string, { headerBg:string; accentColor:string; sidebarBg:string; textOnHeader:string; subtitleOnHeader:string; isDark:boolean; hasSidebar:boolean }> = {
  executive: { headerBg:"#0a1f24", accentColor:"#028090", sidebarBg:"#f0fdf4", textOnHeader:"white", subtitleOnHeader:"rgba(168,213,209,0.8)", isDark:true, hasSidebar:true },
  modern:    { headerBg:"#028090", accentColor:"#0a1f24", sidebarBg:"#f9fafb", textOnHeader:"white", subtitleOnHeader:"rgba(255,255,255,0.75)", isDark:true, hasSidebar:false },
  twocol:    { headerBg:"#f4f8f7", accentColor:"#028090", sidebarBg:"#e8f4f2", textOnHeader:"#0a1f24", subtitleOnHeader:"#6b7280", isDark:false, hasSidebar:true },
  bold:      { headerBg:"#3D5A4E", accentColor:"#028090", sidebarBg:"#f0fdf4", textOnHeader:"white", subtitleOnHeader:"rgba(255,255,255,0.7)", isDark:true, hasSidebar:true },
  minimal:   { headerBg:"white", accentColor:"#028090", sidebarBg:"#f9fafb", textOnHeader:"#0a1f24", subtitleOnHeader:"#6b7280", isDark:false, hasSidebar:false },
}

function CVPreview({ form, templateId }: { form: FormData; templateId: string }) {
  const t = T[templateId] || T.executive
  const name = form.personal.name || "Your Name"
  const title = form.personal.title || "Your Job Title"
  const location = form.personal.location || ""
  const phone = form.personal.phone || ""
  const linkedin = form.personal.linkedin || ""
  const hasExperience = form.experience.some(e => e.title || e.company)
  const hasSkills = form.skills.length > 0
  const hasEducation = form.education.some(e => e.institution || e.degree)
  // Placeholder data shown when form is mostly empty — so preview never looks blank
  const previewName = name !== "Your Name" ? name : "Ahmed Hassan"
  const previewTitle = title !== "Your Job Title" ? title : "Finance Manager"
  const previewSummary = form.summary || "Experienced finance professional with 8+ years across banking and FMCG sectors in Egypt. Proven track record in financial planning, team leadership and stakeholder management across Cairo and the Gulf region."
  const previewExp = hasExperience ? form.experience : [
    { title:"Finance Manager", company:"ABC Group", start:"2020-01", end:"", current:true, bullets:["Led financial reporting for EGP 50M portfolio across 3 business units","Managed team of 6 accountants, reducing month-end close from 7 to 3 days"] },
    { title:"Senior Accountant", company:"XYZ Bank", start:"2017-03", end:"2019-12", current:false, bullets:["Prepared monthly management accounts and variance analysis reports"] }
  ]
  const previewSkills = hasSkills ? form.skills : ["Financial Reporting","Budgeting","SAP","Excel Advanced","Team Leadership"]
  const isPlaceholder = !hasExperience && !form.summary && name === "Your Name"

  const sectionLabel = (label: string) => (
    <div style={{ display:"flex", alignItems:"center", gap:"8px", margin:"14px 0 8px" }}>
      <span style={{ fontSize:"9px", fontWeight:700, color:t.accentColor, textTransform:"uppercase", letterSpacing:"0.1em" }}>{label}</span>
      <div style={{ flex:1, height:"1px", background:t.accentColor, opacity:0.25 }} />
    </div>
  )

  const mainContent = (
    <div style={{ flex:1, minWidth:0, padding: t.hasSidebar ? "0 0 0 14px" : "0" }}>
      {/* Summary */}
      {(form.summary || isPlaceholder) && (
        <div>
          {sectionLabel("Professional Summary")}
          <p style={{ fontSize:"8.5px", color: isPlaceholder && !form.summary ? "#9ca3af" : "#374151", lineHeight:1.65, margin:0, fontStyle: isPlaceholder && !form.summary ? "italic" : "normal" }}>{previewSummary}</p>
        </div>
      )}
      {/* Experience */}
      {(hasExperience || isPlaceholder) && (
        <div>
          {sectionLabel("Work Experience")}
          {previewExp.filter((e:any) => e.title || e.company).map((exp:any, i:number) => (
            <div key={i} style={{ marginBottom:"10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <p style={{ fontSize:"9.5px", fontWeight:700, color:"#0a1f24", margin:0 }}>{exp.title}</p>
                  <p style={{ fontSize:"8.5px", color:t.accentColor, fontWeight:600, margin:"1px 0" }}>{exp.company}</p>
                </div>
                {(exp.start || exp.end) && (
                  <p style={{ fontSize:"8px", color:"#9ca3af", margin:0, flexShrink:0, marginLeft:"8px" }}>
                    {exp.start ? exp.start.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)] + " " + y) : ""}
                    {" – "}
                    {exp.current ? "Present" : exp.end ? exp.end.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)] + " " + y) : ""}
                  </p>
                )}
              </div>
              {exp.bullets.filter(b => b.trim()).map((b, bi) => (
                <div key={bi} style={{ display:"flex", gap:"5px", marginTop:"3px" }}>
                  <span style={{ color:t.accentColor, fontSize:"8px", flexShrink:0, marginTop:"1px" }}>▸</span>
                  <p style={{ fontSize:"8px", color:"#4b5563", lineHeight:1.5, margin:0 }}>{b}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {/* Education (in main column only if no sidebar) */}
      {!t.hasSidebar && (hasEducation || isPlaceholder) && (
        <div>
          {sectionLabel("Education")}
          {form.education.filter(e => e.institution).map((edu, i) => (
            <div key={i} style={{ marginBottom:"7px" }}>
              <p style={{ fontSize:"9px", fontWeight:700, color:"#0a1f24", margin:0 }}>{edu.degree}{edu.field ? ` — ${edu.field}` : ""}</p>
              <p style={{ fontSize:"8px", color:"#6b7280", margin:"1px 0" }}>{edu.institution}{edu.year ? ` · ${edu.year}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const sidebarContent = t.hasSidebar ? (
    <div style={{ width:"130px", flexShrink:0, background:t.sidebarBg, padding:"14px 12px", borderRight:t.isDark ? "none" : "1px solid #e8ecef" }}>
      {/* Contact */}
      {sectionLabel("Contact")}
      {location && <p style={{ fontSize:"7.5px", color:"#4b5563", marginBottom:"4px", lineHeight:1.4 }}>📍 {location}</p>}
      {phone && <p style={{ fontSize:"7.5px", color:"#4b5563", marginBottom:"4px", lineHeight:1.4 }}>📞 {phone}</p>}
      {linkedin && <p style={{ fontSize:"7.5px", color:t.accentColor, marginBottom:"4px", lineHeight:1.4, wordBreak:"break-all" as const }}>{linkedin.replace("https://","")}</p>}
      {/* Skills */}
      {(hasSkills || isPlaceholder) && (
        <>
          {sectionLabel("Skills")}
          <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
            {previewSkills.slice(0, 8).map((s:string) => (
              <div key={s} style={{ fontSize:"7.5px", color: isPlaceholder && !hasSkills ? "#9ca3af" : "#374151", display:"flex", alignItems:"center", gap:"4px", fontStyle: isPlaceholder && !hasSkills ? "italic" : "normal" }}>
                <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:t.accentColor, flexShrink:0 }} />
                {s}
              </div>
            ))}
          </div>
        </>
      )}
      {/* Languages */}
      {form.languages.some(l => l.lang) && (
        <>
          {sectionLabel("Languages")}
          {form.languages.filter(l => l.lang).map((l, i) => (
            <div key={i} style={{ fontSize:"7.5px", color:"#374151", marginBottom:"3px" }}>
              <span style={{ fontWeight:600 }}>{l.lang}</span>
              <span style={{ color:"#9ca3af" }}> · {l.level}</span>
            </div>
          ))}
        </>
      )}
      {/* Education in sidebar */}
      {(hasEducation || isPlaceholder) && (
        <>
          {sectionLabel("Education")}
          {(hasEducation ? form.education.filter((e:any) => e.institution) : [{ institution:"Cairo University", degree:"B.Sc. Accounting", field:"", startYear:"2012", endYear:"2016" }]).map((edu:any, i:number) => (
            <div key={i} style={{ marginBottom:"6px" }}>
              <p style={{ fontSize:"8px", fontWeight:700, color: isPlaceholder && !hasEducation ? "#9ca3af" : "#0a1f24", margin:0, lineHeight:1.3, fontStyle: isPlaceholder && !hasEducation ? "italic" : "normal" }}>{edu.degree}</p>
              {edu.field && <p style={{ fontSize:"7.5px", color:"#6b7280", margin:0 }}>{edu.field}</p>}
              <p style={{ fontSize:"7.5px", color:t.accentColor, margin:0 }}>{edu.institution}</p>
              {edu.endYear && <p style={{ fontSize:"7px", color:"#9ca3af", margin:0 }}>{edu.endYear}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  ) : null

  return (
    <div style={{ background:"#e5e7eb", padding:"12px", borderRadius:"12px" }}>
      {/* A4 paper shadow */}
      <div id="cv-preview-print" style={{
        background:"white",
        borderRadius:"3px",
        boxShadow:"0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)",
        overflow:"hidden",
        fontFamily:"Georgia, serif",
        width:"100%",
        aspectRatio:"210/297",
        position:"relative",
      }}>
        {/* Header */}
        <div style={{ background:t.headerBg, padding:"18px 20px 16px", display:"flex", alignItems:"center", gap:"14px" }}>
          {form.personal.photo ? (
            <img src={form.personal.photo} alt="" style={{ width:"44px", height:"44px", borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.3)", flexShrink:0 }} />
          ) : (
            <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <User size={18} color="rgba(255,255,255,0.5)" />
            </div>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ fontSize:"16px", fontWeight:700, color:t.textOnHeader, margin:0, letterSpacing:"-0.3px", lineHeight:1.2 }}>{previewName}</h1>
            <p style={{ fontSize:"10px", color:t.subtitleOnHeader, margin:"3px 0 0", fontFamily:"sans-serif", letterSpacing:"0.02em" }}>{previewTitle}</p>
            {!t.hasSidebar && (
              <div style={{ display:"flex", gap:"12px", marginTop:"5px", flexWrap:"wrap" as const }}>
                {location && <span style={{ fontSize:"8px", color:t.subtitleOnHeader, fontFamily:"sans-serif" }}>📍 {location}</span>}
                {phone && <span style={{ fontSize:"8px", color:t.subtitleOnHeader, fontFamily:"sans-serif" }}>📞 {phone}</span>}
              </div>
            )}
          </div>
          {/* Minimal accent line for minimal template */}
          {templateId === "minimal" && (
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"3px", background:t.accentColor }} />
          )}
        </div>

        {/* Body */}
        <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100% - 78px)" }}>
          {t.hasSidebar ? (
            <>
              {sidebarContent}
              <div style={{ flex:1, padding:"14px 16px", overflowY:"hidden" as const }}>
                {mainContent}
              </div>
            </>
          ) : (
            <div style={{ flex:1, padding:"14px 20px", overflowY:"hidden" as const }}>
              {!t.hasSidebar && hasSkills && (
                <div>
                  {sectionLabel("Skills")}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"2px" }}>
                    {form.skills.slice(0,10).map(s => (
                      <span key={s} style={{ fontSize:"7.5px", padding:"2px 7px", background:t.accentColor+"15", color:t.accentColor, borderRadius:"99px", fontFamily:"sans-serif", fontWeight:600 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {mainContent}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
  // Reviewer state
  const [reviewFile, setReviewFile] = useState<File|null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function setPersonal(k: keyof FormData["personal"], v: string) {
    setForm(f => ({ ...f, personal: { ...f.personal, [k]: v } }))
  }

  async function generateSummary() {
    if (!form.personal.title) return
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          type:"summary",
          title: form.personal.title,
          level: form.level,
          function: form.function,
          experience: form.experience,
          skills: form.skills,
          location: form.personal.location,
        })
      })
      const data = await res.json()
      if (data.text) setForm((f: any) => ({ ...f, summary: data.text }))
    } catch {}
    setGenerating(false)
  }

  async function generateBullets(idx: number) {
    const exp = form.experience[idx]
    if (!exp.title || !exp.company) return
    setGeneratingBullet(idx)
    try {
      const res = await fetch("/api/generate-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ type:"bullets", title:exp.title, company:exp.company, roughBullets:exp.bullets.filter(b=>b.trim()) })
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

  function addExp() {
    setForm(f => ({ ...f, experience: [...f.experience, { company:"", title:"", start:"", end:"", current:false, bullets:[""] }] }))
  }

  function removeExp(i: number) {
    setForm(f => ({ ...f, experience: f.experience.filter((_,idx) => idx !== i) }))
  }

  function updateExp(i: number, k: string, v: any) {
    const updated = [...form.experience]
    updated[i] = { ...updated[i], [k]: v }
    setForm(f => ({ ...f, experience: updated }))
  }

  function updateBullet(expIdx: number, bulletIdx: number, v: string) {
    const updated = [...form.experience]
    const bullets = [...updated[expIdx].bullets]
    bullets[bulletIdx] = v
    updated[expIdx] = { ...updated[expIdx], bullets }
    setForm(f => ({ ...f, experience: updated }))
  }

  function addEdu() {
    setForm(f => ({ ...f, education: [...f.education, { institution:"", degree:"", field:"", startYear:"", endYear:"" }] }))
  }

  function updateEdu(i: number, k: string, v: string) {
    const updated = [...form.education]
    updated[i] = { ...updated[i], [k]: v }
    setForm(f => ({ ...f, education: updated }))
  }

  function toggleSkill(s: string) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s]
    }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPersonal("photo", ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleReview() {
    if (!reviewFile) return
    setReviewing(true)
    try {
      const formData = new FormData()
      formData.append("file", reviewFile)
      const extractRes = await fetch("/api/extract-cv", { method:"POST", body:formData })
      const { text } = await extractRes.json()
      const scoreRes = await fetch("/api/score-cv", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ cv_text:text, job_description:"General professional role in Egypt/MENA market. Looking for well-structured CV with clear achievements, quantified results, and professional presentation.", mandate_title:"GPS Talent Network Review" })
      })
      const result = await scoreRes.json()
      setReviewResult({ ...result, cv_text:text })
    } catch { setReviewResult({ error:"Failed to review CV. Please try again." }) }
    setReviewing(false)
  }

  function triggerPDFDownload() {
    // Open a new window with just the CV for printing/saving as PDF
    const cvEl = document.getElementById("cv-preview-print")
    if (!cvEl) return
    const cvHTML = cvEl.outerHTML
    const printWindow = window.open("", "_blank", "width=900,height=1200")
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${form.personal.name || "CV"} — GPS Talent Network</title>
          <meta charset="utf-8" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Georgia, serif; background: white; }
            @page { size: A4; margin: 0; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${cvHTML}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          <\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  async function handleSaveAndDownload() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setShowSignup(true); return }
    await saveToDatabase(user)
  }

  async function saveToDatabase(user: any) {
    setSaving(true)
    try {
      const cvText = [
        form.personal.name, form.personal.title,
        form.summary,
        ...form.experience.flatMap(e => [e.title, e.company, ...e.bullets]),
        ...form.skills
      ].join(" ")

      const { data: existing } = await supabase.from("candidates").select("id").eq("email", user.email).single()

      if (existing) {
        await supabase.from("candidates").update({
          name: form.personal.name,
          phone: form.personal.phone,
          current_title: form.personal.title,
          location: form.personal.location,
          linkedin_url: form.personal.linkedin,
          cv_text: cvText,
          source: "cv_builder",
        }).eq("id", existing.id)
      } else {
        await supabase.from("candidates").insert([{
          name: form.personal.name,
          email: user.email,
          phone: form.personal.phone,
          current_title: form.personal.title,
          location: form.personal.location,
          linkedin_url: form.personal.linkedin,
          cv_text: cvText,
          source: "cv_builder",
          tags: [],
        }]).select().single()
      }
      setSaved(true)
      // Trigger PDF download first, then redirect to success
      triggerPDFDownload()
      setTimeout(() => { window.location.href = "/cv-builder/success" }, 800)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleSignupAndSave() {
    setAuthLoading(true); setAuthError("")
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data.user) await saveToDatabase(data.user)
    } catch (e: any) { setAuthError(e.message || "Signup failed") }
    setAuthLoading(false)
  }

  const currentStepId = STEPS[step]?.id
  const suggestedSkills = SKILL_SUGGESTIONS[form.function] || SKILL_SUGGESTIONS["General Management"]

  // ── INPUT STYLES ──
  const inp = { width:"100%", padding:"11px 14px", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontSize:"14px", outline:"none", background:"white", boxSizing:"border-box" as const }
  const sel = { ...inp, appearance:"none" as const, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }
  const label = { display:"block" as const, fontSize:"12px", fontWeight:500, color:"#374151", marginBottom:"6px" }

  return (
    <div style={{ minHeight:"100vh", background:"#F4F8F7" }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ background:"white", borderBottom:"1px solid #e8ecef", padding:"20px 40px" }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", margin:0 }}>GPS CV Studio</h1>
            <p style={{ fontSize:"13px", color:"#9ca3af", margin:0 }}>Free AI-powered CV builder & reviewer for MENA professionals</p>
          </div>
          <div style={{ display:"flex", background:"#f3f4f6", borderRadius:"10px", padding:"4px" }}>
            {(["builder","reviewer"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding:"8px 20px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:600, background:activeTab===t?"white":"transparent", color:activeTab===t?"#0a1f24":"#9ca3af", boxShadow:activeTab===t?"0 1px 4px rgba(0,0,0,0.08)":"none", transition:"all 0.15s" }}>
                {t === "builder" ? "Build CV" : "Review my CV"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── REVIEWER TAB ── */}
      {activeTab === "reviewer" && (
        <div style={{ maxWidth:"760px", margin:"48px auto", padding:"0 24px" }}>
          <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e8ecef", padding:"40px" }}>
            <div style={{ textAlign:"center", marginBottom:"32px" }}>
              <div style={{ width:"56px", height:"56px", background:"#e6f5f3", borderRadius:"16px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <Sparkles size={24} color="#028090" />
              </div>
              <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0a1f24", marginBottom:"8px" }}>AI CV Review</h2>
              <p style={{ color:"#6b7280", fontSize:"14px", lineHeight:1.6 }}>Upload your existing CV and our AI will score it, identify weak sections, and suggest improvements — tailored for MENA recruiters.</p>
            </div>

            {!reviewResult ? (
              <>
                <div
                  onClick={() => document.getElementById("review-file-input")?.click()}
                  style={{ border:"2px dashed #d1d5db", borderRadius:"16px", padding:"48px", textAlign:"center", cursor:"pointer", transition:"border-color 0.15s", background:reviewFile?"#f0fdf4":"#fafafa" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor="#028090"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor=reviewFile?"#028090":"#d1d5db"}
                >
                  <input id="review-file-input" type="file" accept=".pdf,.doc,.docx" style={{ display:"none" }} onChange={e => setReviewFile(e.target.files?.[0] || null)} />
                  {reviewFile ? (
                    <div>
                      <CheckCircle size={32} color="#028090" style={{ margin:"0 auto 12px", display:"block" }} />
                      <p style={{ fontWeight:700, color:"#028090", marginBottom:"4px" }}>{reviewFile.name}</p>
                      <p style={{ fontSize:"12px", color:"#9ca3af" }}>Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} color="#9ca3af" style={{ margin:"0 auto 12px", display:"block" }} />
                      <p style={{ fontWeight:600, color:"#374151", marginBottom:"4px" }}>Drop your CV here or click to browse</p>
                      <p style={{ fontSize:"12px", color:"#9ca3af" }}>PDF, Word (.doc, .docx) supported</p>
                    </div>
                  )}
                </div>

                <button onClick={handleReview} disabled={!reviewFile || reviewing} style={{ width:"100%", marginTop:"16px", padding:"15px", background:reviewFile && !reviewing?"#028090":"#e5e7eb", color:reviewFile && !reviewing?"white":"#9ca3af", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"15px", cursor:reviewFile && !reviewing?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  {reviewing ? <><Loader2 size={16} className="animate-spin" /> Reviewing your CV…</> : <><Sparkles size={16} /> Review my CV</>}
                </button>
              </>
            ) : reviewResult.error ? (
              <div style={{ textAlign:"center", padding:"24px" }}>
                <p style={{ color:"#ef4444" }}>{reviewResult.error}</p>
                <button onClick={() => setReviewResult(null)} style={{ marginTop:"16px", padding:"10px 24px", background:"#028090", color:"white", border:"none", borderRadius:"10px", cursor:"pointer", fontWeight:600 }}>Try again</button>
              </div>
            ) : (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"24px" }}>
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"14px", padding:"16px", textAlign:"center" }}>
                    <div style={{ fontSize:"32px", fontWeight:800, color:"#059669" }}>{reviewResult.score}<span style={{ fontSize:"16px" }}>/100</span></div>
                    <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>Overall score</div>
                  </div>
                  <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"14px", padding:"16px", textAlign:"center" }}>
                    <div style={{ fontSize:"32px", fontWeight:800, color:"#1d4ed8" }}>{reviewResult.strengths?.length || 0}</div>
                    <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>Strengths</div>
                  </div>
                  <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"14px", padding:"16px", textAlign:"center" }}>
                    <div style={{ fontSize:"32px", fontWeight:800, color:"#d97706" }}>{reviewResult.concerns?.length || 0}</div>
                    <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"4px" }}>Areas to improve</div>
                  </div>
                </div>

                <div style={{ background:"#f9fafb", borderRadius:"14px", padding:"18px", marginBottom:"16px" }}>
                  <p style={{ fontSize:"13px", color:"#374151", lineHeight:1.7, margin:0 }}>{reviewResult.summary}</p>
                </div>

                {reviewResult.strengths?.length > 0 && (
                  <div style={{ marginBottom:"14px" }}>
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

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                  <button onClick={() => { setReviewResult(null); setReviewFile(null) }} style={{ padding:"12px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:"pointer", color:"#374151" }}>
                    Review another CV
                  </button>
                  <button onClick={() => setActiveTab("builder")} style={{ padding:"12px", background:"#028090", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                    <Sparkles size={13} /> Rebuild with AI builder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BUILDER TAB ── */}
      {activeTab === "builder" && (
        <div style={{ maxWidth:"1000px", margin:"32px auto", padding:"0 24px 80px" }}>

          {/* Step indicator */}
          <div style={{ display:"flex", alignItems:"center", marginBottom:"28px", background:"white", borderRadius:"16px", border:"1px solid #e8ecef", padding:"16px 24px" }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i < step
              const active = i === step
              return (
                <div key={s.id} style={{ display:"flex", alignItems:"center", flex:i<STEPS.length-1?1:"none" }}>
                  <button onClick={() => i <= step && setStep(i)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", background:"none", border:"none", cursor:i<=step?"pointer":"default", padding:0 }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:done?"#028090":active?"#0a1f24":"#f3f4f6", border:active?"2px solid #028090":"none", transition:"all 0.2s" }}>
                      {done ? <CheckCircle size={15} color="white" /> : <Icon size={14} color={active?"white":"#9ca3af"} />}
                    </div>
                    <span style={{ fontSize:"10px", fontWeight:500, color:active?"#0a1f24":done?"#028090":"#9ca3af", whiteSpace:"nowrap" }}>{s.label}</span>
                  </button>
                  {i < STEPS.length-1 && <div style={{ flex:1, height:"2px", background:done?"#028090":"#f3f4f6", margin:"0 6px 14px", borderRadius:"99px" }} />}
                </div>
              )
            })}
          </div>

          <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e8ecef", overflow:"hidden" }}>

            {/* ── STEP 1: PERSONAL ── */}
            {currentStepId === "personal" && (
              <div style={{ padding:"32px" }}>
                <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Personal details</h2>
                <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"28px" }}>Your basic information. Photo is recommended — expected by most MENA recruiters.</p>

                {/* Photo upload */}
                <div style={{ display:"flex", alignItems:"center", gap:"20px", marginBottom:"28px", padding:"20px", background:"#f9fafb", borderRadius:"14px", border:"1px solid #e8ecef" }}>
                  <div style={{ position:"relative", cursor:"pointer" }} onClick={() => photoRef.current?.click()}>
                    {form.personal.photo ? (
                      <img src={form.personal.photo} style={{ width:"72px", height:"72px", borderRadius:"50%", objectFit:"cover", border:"3px solid #028090" }} alt="Profile" />
                    ) : (
                      <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", border:"2px dashed #d1d5db" }}>
                        <Camera size={22} color="#9ca3af" />
                      </div>
                    )}
                    <div style={{ position:"absolute", bottom:0, right:0, width:"22px", height:"22px", background:"#028090", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
                      <Plus size={11} color="white" />
                    </div>
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto} />
                  <div>
                    <p style={{ fontWeight:600, color:"#0a1f24", fontSize:"14px", margin:0 }}>Profile photo</p>
                    <p style={{ color:"#6b7280", fontSize:"12px", margin:"4px 0 8px", lineHeight:1.5 }}>CVs with photos get significantly more recruiter views in Egypt & MENA. Use a professional headshot.</p>
                    <button onClick={() => photoRef.current?.click()} style={{ padding:"6px 14px", background:"#028090", color:"white", border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>
                      {form.personal.photo ? "Change photo" : "Upload photo"}
                    </button>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                  <div>
                    <label style={label}>Full name *</label>
                    <input style={inp} placeholder="Your full name" value={form.personal.name} onChange={e => setPersonal("name", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Job title / headline *</label>
                    <input style={inp} placeholder="e.g. Finance Manager" value={form.personal.title} onChange={e => setPersonal("title", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Email *</label>
                    <input style={inp} type="email" placeholder="name@email.com" value={form.personal.email} onChange={e => setPersonal("email", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Phone</label>
                    <div style={{ display:"flex", border:"1.5px solid #e5e7eb", borderRadius:"10px", overflow:"hidden", background:"white" }}>
                      <div style={{ padding:"11px 14px", background:"#f5f5f5", borderRight:"1.5px solid #e5e7eb", fontSize:"14px", fontWeight:700, color:"#555", userSelect:"none", flexShrink:0, display:"flex", alignItems:"center" }}>+20</div>
                      <input
                        type="tel"
                        placeholder="100 123 4567"
                        value={form.personal.phone.replace(/^\+20\s?/, "")}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9 ]/g, "")
                          setPersonal("phone", "+20 " + digits)
                        }}
                        style={{ flex:1, padding:"11px 14px", border:"none", outline:"none", fontSize:"14px", background:"transparent" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={label}>Location</label>
                    <input style={inp} placeholder="Cairo, Egypt" value={form.personal.location} onChange={e => setPersonal("location", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Nationality</label>
                    <select style={sel} value={form.personal.nationality} onChange={e => setPersonal("nationality", e.target.value)}>
                      <option value="">Select nationality</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>LinkedIn URL</label>
                    <input style={inp} placeholder="linkedin.com/in/yourname" value={form.personal.linkedin} onChange={e => setPersonal("linkedin", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Date of birth <span style={{ color:"#9ca3af", fontWeight:400 }}>(optional — common in MENA)</span></label>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <select
                        value={form.personal.dob ? form.personal.dob.split("-")[2] : ""}
                        onChange={e => {
                          const parts = form.personal.dob ? form.personal.dob.split("-") : ["","",""]
                          setPersonal("dob", `${parts[0] || "2000"}-${parts[1] || "01"}-${e.target.value || "01"}`)
                        }}
                        style={{ ...sel, flex:1 }}
                      >
                        <option value="">Day</option>
                        {Array.from({length:31}, (_,i) => String(i+1).padStart(2,"0")).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select
                        value={form.personal.dob ? form.personal.dob.split("-")[1] : ""}
                        onChange={e => {
                          const parts = form.personal.dob ? form.personal.dob.split("-") : ["","",""]
                          setPersonal("dob", `${parts[0] || "2000"}-${e.target.value || "01"}-${parts[2] || "01"}`)
                        }}
                        style={{ ...sel, flex:1.4 }}
                      >
                        <option value="">Month</option>
                        {["01 — January","02 — February","03 — March","04 — April","05 — May","06 — June","07 — July","08 — August","09 — September","10 — October","11 — November","12 — December"].map((m,i) => {
                          const val = String(i+1).padStart(2,"0")
                          return <option key={val} value={val}>{m}</option>
                        })}
                      </select>
                      <select
                        value={form.personal.dob ? form.personal.dob.split("-")[0] : ""}
                        onChange={e => {
                          const parts = form.personal.dob ? form.personal.dob.split("-") : ["","",""]
                          setPersonal("dob", `${e.target.value || "2000"}-${parts[1] || "01"}-${parts[2] || "01"}`)
                        }}
                        style={{ ...sel, flex:1.2 }}
                      >
                        <option value="">Year</option>
                        {Array.from({length:60}, (_,i) => String(new Date().getFullYear() - 18 - i)).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={label}>Function / industry</label>
                    <select style={sel} value={form.function} onChange={e => setForm(f => ({ ...f, function:e.target.value }))}>
                      <option value="">Select your function</option>
                      {FUNCTIONS.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Seniority level</label>
                    <select style={sel} value={form.level} onChange={e => setForm(f => ({ ...f, level:e.target.value }))}>
                      <option value="">Select your level</option>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: SUMMARY ── */}
            {currentStepId === "summary" && (
              <SummaryStep
                form={form}
                generating={generating}
                setForm={setForm}
                generateSummary={generateSummary}
                inp={inp}
              />
            )}

            {/* ── STEP 3: EXPERIENCE ── */}
            {currentStepId === "experience" && (
              <div style={{ padding:"32px" }}>
                <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Work experience</h2>
                <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>Add your roles. Describe them roughly and AI will rewrite them as powerful, quantified bullet points.</p>
                {form.experience.map((exp, i) => (
                  <div key={i} style={{ border:"1.5px solid #e5e7eb", borderRadius:"14px", padding:"20px", marginBottom:"16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
                      <p style={{ fontWeight:700, color:"#0a1f24", fontSize:"14px", margin:0 }}>Role {i+1}</p>
                      {form.experience.length > 1 && <button onClick={() => removeExp(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", display:"flex", alignItems:"center", gap:"4px", fontSize:"12px" }}><Trash2 size={13} /> Remove</button>}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                      <div><label style={label}>Job title *</label><input style={inp} placeholder="e.g. Finance Manager" value={exp.title} onChange={e => updateExp(i,"title",e.target.value)} /></div>
                      <div><label style={label}>Company *</label><input style={inp} placeholder="ABC Company" value={exp.company} onChange={e => updateExp(i,"company",e.target.value)} /></div>
                      <div>
                        <label style={label}>Start date</label>
                        <div style={{ display:"flex", gap:"8px" }}>
                          <select style={{ ...sel, flex:1.4 }} value={exp.start ? exp.start.split("-")[1] : ""} onChange={e => { const y=exp.start?exp.start.split("-")[0]:""; updateExp(i,"start",`${y||new Date().getFullYear()}-${e.target.value||"01"}`); }}>
                            <option value="">Month</option>
                            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi) => <option key={m} value={String(mi+1).padStart(2,"0")}>{m}</option>)}
                          </select>
                          <select style={{ ...sel, flex:1 }} value={exp.start ? exp.start.split("-")[0] : ""} onChange={e => { const m=exp.start?exp.start.split("-")[1]:"01"; updateExp(i,"start",`${e.target.value||new Date().getFullYear()}-${m}`); }}>
                            <option value="">Year</option>
                            {Array.from({length:40},(_,idx)=>String(new Date().getFullYear()-idx)).map(y=><option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={label}>End date</label>
                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          {!exp.current && (
                            <select style={{ ...sel, flex:1.4 }} value={exp.end ? exp.end.split("-")[1] : ""} onChange={e => { const y=exp.end?exp.end.split("-")[0]:""; updateExp(i,"end",`${y||new Date().getFullYear()}-${e.target.value||"01"}`); }}>
                              <option value="">Month</option>
                              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi) => <option key={m} value={String(mi+1).padStart(2,"0")}>{m}</option>)}
                            </select>
                          )}
                          {!exp.current && (
                            <select style={{ ...sel, flex:1 }} value={exp.end ? exp.end.split("-")[0] : ""} onChange={e => { const m=exp.end?exp.end.split("-")[1]:"01"; updateExp(i,"end",`${e.target.value||new Date().getFullYear()}-${m}`); }}>
                              <option value="">Year</option>
                              {Array.from({length:40},(_,idx)=>String(new Date().getFullYear()-idx)).map(y=><option key={y} value={y}>{y}</option>)}
                            </select>
                          )}
                          <label style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", color:"#374151", whiteSpace:"nowrap", cursor:"pointer", flexShrink:0 }}>
                            <input type="checkbox" checked={exp.current} onChange={e => updateExp(i,"current",e.target.checked)} /> Present
                          </label>
                        </div>
                      </div>
                    </div>
                    <label style={label}>Bullet points <span style={{ color:"#9ca3af", fontWeight:400 }}>(rough notes — AI will polish them)</span></label>
                    {exp.bullets.map((b, j) => (
                      <div key={j} style={{ display:"flex", gap:"8px", marginBottom:"8px" }}>
                        <input style={{ ...inp, flex:1 }} placeholder={j===0?"e.g. managed accounts team of 8 people":"Add another bullet..."} value={b} onChange={e => updateBullet(i,j,e.target.value)} />
                        {j === exp.bullets.length-1 && <button onClick={() => { const updated=[...form.experience]; updated[i].bullets=[...updated[i].bullets,""]; setForm(f=>({...f,experience:updated})) }} style={{ padding:"0 12px", background:"#f3f4f6", border:"none", borderRadius:"8px", cursor:"pointer", color:"#6b7280", fontSize:"18px" }}>+</button>}
                      </div>
                    ))}
                    <button onClick={() => generateBullets(i)} disabled={generatingBullet===i || !exp.title} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"9px 16px", background:exp.title?"#0a1f24":"#e5e7eb", color:exp.title?"white":"#9ca3af", border:"none", borderRadius:"9px", fontWeight:600, fontSize:"12px", cursor:exp.title?"pointer":"default", marginTop:"8px" }}>
                      {generatingBullet===i ? <><Loader2 size={12} className="animate-spin" /> Rewriting…</> : <><Sparkles size={12} /> AI rewrite bullets</>}
                    </button>
                  </div>
                ))}
                <button onClick={addExp} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 18px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500 }}>
                  <Plus size={14} /> Add another role
                </button>
              </div>
            )}

            {/* ── STEP 4: EDUCATION + LANGUAGES ── */}
            {currentStepId === "education" && (
              <div style={{ padding:"32px" }}>
                <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Education & languages</h2>
                <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>Your academic background and language proficiency.</p>

                <h3 style={{ fontSize:"15px", fontWeight:700, color:"#374151", marginBottom:"14px" }}>Education</h3>
                {form.education.map((edu, i) => (
                  <div key={i} style={{ border:"1.5px solid #e5e7eb", borderRadius:"14px", padding:"18px", marginBottom:"12px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                      <div><label style={label}>Institution</label><input style={inp} placeholder="Cairo University" value={edu.institution} onChange={e => updateEdu(i,"institution",e.target.value)} /></div>
                      <div><label style={label}>Degree</label><input style={inp} placeholder="Bachelor's" value={edu.degree} onChange={e => updateEdu(i,"degree",e.target.value)} /></div>
                      <div style={{ gridColumn:"span 2" }}><label style={label}>Field of study</label><input style={inp} placeholder="Accounting" value={edu.field} onChange={e => updateEdu(i,"field",e.target.value)} /></div>
                      <div>
                        <label style={label}>Start year</label>
                        <select style={sel} value={edu.startYear} onChange={e => updateEdu(i,"startYear",e.target.value)}>
                          <option value="">Year</option>
                          {Array.from({length:40},(_,idx)=>String(new Date().getFullYear()-idx)).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={label}>End year <span style={{ color:"#9ca3af", fontWeight:400 }}>(or expected)</span></label>
                        <select style={sel} value={edu.endYear} onChange={e => updateEdu(i,"endYear",e.target.value)}>
                          <option value="">Year</option>
                          {Array.from({length:44},(_,idx)=>String(new Date().getFullYear()+3-idx)).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addEdu} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 18px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500, marginBottom:"28px" }}>
                  <Plus size={14} /> Add another qualification
                </button>

                <h3 style={{ fontSize:"15px", fontWeight:700, color:"#374151", marginBottom:"14px" }}>Languages</h3>
                {form.languages.map((lang, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:"10px", marginBottom:"10px", alignItems:"end" }}>
                    <div>
                      <label style={label}>Language</label>
                      <select style={sel} value={lang.lang} onChange={e => { const u=[...form.languages]; u[i]={...u[i],lang:e.target.value}; setForm(f=>({...f,languages:u})) }}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Proficiency</label>
                      <select style={sel} value={lang.level} onChange={e => { const u=[...form.languages]; u[i]={...u[i],level:e.target.value}; setForm(f=>({...f,languages:u})) }}>
                        {["Native","Fluent","Advanced","Intermediate","Basic"].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    {form.languages.length > 1 && <button onClick={() => setForm(f => ({...f, languages:f.languages.filter((_,idx)=>idx!==i)}))} style={{ height:"42px", padding:"0 12px", background:"none", border:"1px solid #fee2e2", borderRadius:"8px", cursor:"pointer", color:"#ef4444" }}><Trash2 size={13} /></button>}
                  </div>
                ))}
                <button onClick={() => setForm(f=>({...f,languages:[...f.languages,{lang:"French",level:"Intermediate"}]}))} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 18px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500, marginBottom:"28px" }}>
                  <Plus size={14} /> Add language
                </button>

                <h3 style={{ fontSize:"15px", fontWeight:700, color:"#374151", marginBottom:"6px" }}>Hobbies & interests <span style={{ fontSize:"12px", color:"#9ca3af", fontWeight:400 }}>(optional)</span></h3>
                <p style={{ color:"#9ca3af", fontSize:"12px", marginBottom:"12px" }}>A brief line about what you do outside work. Adds personality — especially valued in Egyptian & Gulf recruitment.</p>
                <input
                  style={inp}
                  placeholder="e.g. Playing football, reading Arabic literature, hiking, photography"
                  value={form.hobbies}
                  onChange={e => setForm(f => ({ ...f, hobbies: e.target.value }))}
                />
              </div>
            )}

            {/* ── STEP 5: SKILLS ── */}
            {currentStepId === "skills" && (
              <div style={{ padding:"32px" }}>
                <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Skills</h2>
                <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>Select skills relevant to your profile. We've suggested the most in-demand ones for your function.</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"24px" }}>
                  {suggestedSkills.map(s => (
                    <button key={s} onClick={() => toggleSkill(s)} style={{ padding:"7px 14px", borderRadius:"99px", border:form.skills.includes(s)?"2px solid #028090":"1.5px solid #e5e7eb", background:form.skills.includes(s)?"#e6f5f3":"white", color:form.skills.includes(s)?"#028090":"#374151", fontSize:"13px", fontWeight:500, cursor:"pointer", transition:"all 0.15s" }}>
                      {form.skills.includes(s) && "✓ "}{s}
                    </button>
                  ))}
                </div>
                <div>
                  <label style={label}>Add a custom skill</label>
                  <div style={{ display:"flex", gap:"8px" }}>
                    <input id="custom-skill" style={{ ...inp, flex:1 }} placeholder="e.g. Power BI" onKeyDown={e => { if(e.key==="Enter"){ const v=(e.target as HTMLInputElement).value.trim(); if(v){ toggleSkill(v);(e.target as HTMLInputElement).value="" }}}} />
                    <button onClick={() => { const el=document.getElementById("custom-skill") as HTMLInputElement; if(el?.value.trim()){ toggleSkill(el.value.trim()); el.value="" }}} style={{ padding:"11px 16px", background:"#0a1f24", color:"white", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"13px", fontWeight:600 }}>Add</button>
                  </div>
                </div>
                {form.skills.length > 0 && (
                  <div style={{ marginTop:"16px" }}>
                    <p style={{ fontSize:"12px", color:"#6b7280", marginBottom:"8px" }}>Selected ({form.skills.length}):</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                      {form.skills.map(s => <span key={s} style={{ padding:"5px 12px", background:"#028090", color:"white", borderRadius:"99px", fontSize:"12px", fontWeight:500 }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 6: TEMPLATE + PREVIEW ── */}
            {currentStepId === "template" && (
              <div style={{ padding:"32px" }}>
                <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Choose your template</h2>
                <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>5 designs built for the MENA market. All include photo support. Arabic version available after saving.</p>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px", marginBottom:"28px" }}>
                  {TEMPLATES.map(t => {
                    const isSelected = selectedTemplate === t.id
                    const isDark = t.id === "executive" || t.id === "modern" || t.id === "bold"
                    const hasSidebar = t.id === "executive" || t.id === "twocol" || t.id === "bold"
                    return (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{ padding:0, border:isSelected?"2.5px solid #028090":"1.5px solid #e5e7eb", borderRadius:"14px", overflow:"hidden", cursor:"pointer", background:"white", boxShadow:isSelected?"0 0 0 4px rgba(2,128,144,0.15)":"0 1px 4px rgba(0,0,0,0.05)", transition:"all 0.15s" }}>
                        {/* Proper mini CV layout */}
                        <div style={{ height:"110px", background:t.color === "white" ? "#fafafa" : t.color, position:"relative", overflow:"hidden", borderBottom: t.color === "white" ? "1px solid #e8e8e8" : "none" }}>
                          {/* Header bar */}
                          <div style={{ background:t.headerBg, padding:"7px 8px 6px", display:"flex", alignItems:"center", gap:"5px", borderBottom: t.id === "minimal" ? `2px solid ${t.accent}` : "none" }}>
                            <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:isDark?"rgba(255,255,255,0.35)":"rgba(0,0,0,0.15)", flexShrink:0 }} />
                            <div style={{ flex:1 }}>
                              <div style={{ height:"3px", borderRadius:"2px", background:isDark?"rgba(255,255,255,0.6)":"rgba(0,0,0,0.25)", width:"55%", marginBottom:"2px" }} />
                              <div style={{ height:"2px", borderRadius:"2px", background:isDark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.12)", width:"35%" }} />
                            </div>
                          </div>
                          {/* Body with optional sidebar */}
                          <div style={{ display:"flex", padding:"5px 6px", gap:"5px", flex:1 }}>
                            {hasSidebar && (
                              <div style={{ width:"28%", display:"flex", flexDirection:"column", gap:"3px" }}>
                                <div style={{ height:"2px", borderRadius:"1px", background:t.accent==="white"?"rgba(255,255,255,0.5)":t.accent, opacity:0.6, width:"70%" }} />
                                {[100,80,90,70,85].map((w,i)=><div key={i} style={{ height:"2px", borderRadius:"1px", background:isDark?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.1)", width:`${w}%` }} />)}
                              </div>
                            )}
                            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"3px" }}>
                              <div style={{ height:"2px", borderRadius:"1px", background:t.accent==="white"?"rgba(255,255,255,0.5)":t.accent, opacity:0.7, width:"45%" }} />
                              {[100,85,90,75,80,65].map((w,i)=><div key={i} style={{ height:"2px", borderRadius:"1px", background:isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.09)", width:`${w}%` }} />)}
                            </div>
                          </div>
                        </div>
                        <div style={{ padding:"7px 10px", background:"white" }}>
                          <p style={{ fontSize:"11px", fontWeight:700, color:isSelected?"#028090":"#0a1f24", margin:0, transition:"color 0.15s" }}>{t.name}</p>
                          <p style={{ fontSize:"9px", color:"#9ca3af", margin:0, marginTop:"1px" }}>{t.desc}</p>
                        </div>
                        {isSelected && <div style={{ background:"#028090", padding:"3px 0", textAlign:"center", fontSize:"9px", color:"white", fontWeight:700, letterSpacing:"0.04em" }}>✓ SELECTED</div>}
                      </button>
                    )
                  })}
                </div>

                {/* CV Preview — proper A4 document render */}
                <div style={{ marginBottom:"24px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                    <p style={{ fontSize:"13px", fontWeight:600, color:"#374151", margin:0 }}>Live preview — {TEMPLATES.find(t=>t.id===selectedTemplate)?.name}</p>
                    <span style={{ fontSize:"11px", color:"#9ca3af", background:"#f3f4f6", padding:"3px 8px", borderRadius:"6px" }}>A4</span>
                  </div>
                  <CVPreview form={form} templateId={selectedTemplate} />
                </div>

                {/* Download only button */}
                <button onClick={triggerPDFDownload} style={{ width:"100%", marginBottom:"12px", padding:"12px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"12px", fontWeight:600, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", color:"#374151" }}>
                  <Download size={15} /> Preview & download PDF
                </button>

                {/* Arabic notice */}
                <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 18px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"12px", marginBottom:"20px" }}>
                  <span style={{ fontSize:"20px" }}>🇪🇬</span>
                  <div>
                    <p style={{ fontSize:"13px", fontWeight:600, color:"#166534", margin:0 }}>Arabic CV — coming soon</p>
                    <p style={{ fontSize:"12px", color:"#15803d", margin:0 }}>We're building a full Arabic RTL version. Save your CV now and we'll notify you when it's ready.</p>
                  </div>
                </div>

                {/* Save / Download */}
                <button onClick={handleSaveAndDownload} disabled={saving || !form.personal.name} style={{ width:"100%", padding:"16px", background:form.personal.name?"#028090":"#e5e7eb", color:form.personal.name?"white":"#9ca3af", border:"none", borderRadius:"14px", fontWeight:700, fontSize:"16px", cursor:form.personal.name?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Saving & preparing download…</> : <><Download size={18} /> Save to GPS & Download PDF</>}
                </button>
                <p style={{ textAlign:"center", fontSize:"12px", color:"#9ca3af", marginTop:"10px" }}>Your CV saves to the GPS recruiter database. Our consultants will be able to find you.</p>
              </div>
            )}

            {/* ── NAV BUTTONS ── */}
            <div style={{ padding:"20px 32px", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fafafa" }}>
              <button onClick={() => setStep(s => Math.max(0,s-1))} disabled={step===0} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 20px", background:"white", border:"1.5px solid #e5e7eb", borderRadius:"10px", cursor:step===0?"default":"pointer", color:step===0?"#d1d5db":"#374151", fontWeight:600, fontSize:"13px" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <span style={{ fontSize:"12px", color:"#9ca3af" }}>Step {step+1} of {STEPS.length}</span>
              {step < STEPS.length-1 ? (
                <button onClick={() => setStep(s => Math.min(STEPS.length-1,s+1))} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 20px", background:"#028090", border:"none", borderRadius:"10px", cursor:"pointer", color:"white", fontWeight:600, fontSize:"13px" }}>
                  Next <ArrowRight size={14} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── SIGNUP MODAL ── */}
      {showSignup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"24px" }}>
          <div style={{ background:"white", borderRadius:"24px", padding:"36px", width:"100%", maxWidth:"420px", boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign:"center", marginBottom:"24px" }}>
              <div style={{ width:"52px", height:"52px", background:"#e6f5f3", borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <CheckCircle size={24} color="#028090" />
              </div>
              <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Almost there!</h2>
              <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.6 }}>Create a free account to save your CV and go live on the GPS Talent Network.</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"16px" }}>
              <input style={inp} type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
              <input style={inp} type="password" placeholder="Choose a password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {authError && <p style={{ color:"#ef4444", fontSize:"13px", marginBottom:"12px" }}>{authError}</p>}
            <button onClick={handleSignupAndSave} disabled={authLoading || !email || !password} style={{ width:"100%", padding:"14px", background:"#028090", color:"white", border:"none", borderRadius:"12px", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"10px" }}>
              {authLoading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <>Save CV & Go Live <ArrowRight size={15} /></>}
            </button>
            <p style={{ textAlign:"center", fontSize:"12px", color:"#9ca3af" }}>
              Already have an account? <Link href="/login" style={{ color:"#028090", fontWeight:600 }}>Sign in</Link>
            </p>
            <button onClick={() => setShowSignup(false)} style={{ width:"100%", padding:"10px", background:"none", border:"none", color:"#9ca3af", fontSize:"12px", cursor:"pointer", marginTop:"8px" }}>Cancel</button>
          </div>
        </div>
      )}

    </div>
  )
}
