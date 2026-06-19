"use client"
import { useState, useRef } from "react"
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
  { id:"summary",     icon:Star,          label:"Summary" },
  { id:"experience",  icon:Briefcase,     label:"Experience" },
  { id:"education",   icon:GraduationCap, label:"Education" },
  { id:"skills",      icon:Sparkles,      label:"Skills" },
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
  education: Array<{ institution:string; degree:string; field:string; year:string }>
  skills: string[]
  languages: Array<{ lang:string; level:string }>
  function: string
  level: string
}

const INITIAL: FormData = {
  personal: { name:"", title:"", email:"", phone:"", location:"", nationality:"", dob:"", linkedin:"", photo:null },
  summary: "",
  experience: [{ company:"", title:"", start:"", end:"", current:false, bullets:[""] }],
  education: [{ institution:"", degree:"", field:"", year:"" }],
  skills: [],
  languages: [{ lang:"Arabic", level:"Native" }, { lang:"English", level:"Fluent" }],
  function: "",
  level: "",
}

export default function CVBuilderPage() {
  const [activeTab, setActiveTab] = useState<"builder"|"reviewer">("builder")
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
        body: JSON.stringify({ type:"summary", title:form.personal.title, level:form.level, function:form.function, experience:form.experience })
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
    setForm(f => ({ ...f, education: [...f.education, { institution:"", degree:"", field:"", year:"" }] }))
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
        const { data: newCand } = await supabase.from("candidates").insert([{
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
      window.location.href = "/cv-builder/success"
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
                    <input style={inp} placeholder="Nader Botros" value={form.personal.name} onChange={e => setPersonal("name", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Job title / headline *</label>
                    <input style={inp} placeholder="Finance Manager" value={form.personal.title} onChange={e => setPersonal("title", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Email *</label>
                    <input style={inp} type="email" placeholder="name@email.com" value={form.personal.email} onChange={e => setPersonal("email", e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Phone</label>
                    <input style={inp} placeholder="+20 100 000 0000" value={form.personal.phone} onChange={e => setPersonal("phone", e.target.value)} />
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
                    <input style={inp} type="date" value={form.personal.dob} onChange={e => setPersonal("dob", e.target.value)} />
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
              <div style={{ padding:"32px" }}>
                <h2 style={{ fontSize:"20px", fontWeight:800, color:"#0a1f24", marginBottom:"6px" }}>Professional summary</h2>
                <p style={{ color:"#9ca3af", fontSize:"13px", marginBottom:"24px" }}>A 3–4 line overview of who you are. Let AI write it based on your profile, or write your own.</p>
                <button onClick={generateSummary} disabled={generating || !form.personal.title} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"11px 20px", background:form.personal.title?"#028090":"#e5e7eb", color:form.personal.title?"white":"#9ca3af", border:"none", borderRadius:"10px", fontWeight:600, fontSize:"13px", cursor:form.personal.title?"pointer":"default", marginBottom:"16px" }}>
                  {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate with AI</>}
                </button>
                <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary:e.target.value }))} rows={5} placeholder="Experienced finance professional with 8+ years across FMCG and banking sectors in Egypt and the Gulf. Proven track record of…" style={{ ...inp, resize:"vertical" }} />
                <p style={{ fontSize:"12px", color:"#9ca3af", marginTop:"8px" }}>Tip: AI will use your job title ({form.personal.title || "not set yet"}), function, and level to generate a market-relevant summary.</p>
              </div>
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
                      <div><label style={label}>Job title *</label><input style={inp} placeholder="Finance Manager" value={exp.title} onChange={e => updateExp(i,"title",e.target.value)} /></div>
                      <div><label style={label}>Company *</label><input style={inp} placeholder="ABC Company" value={exp.company} onChange={e => updateExp(i,"company",e.target.value)} /></div>
                      <div><label style={label}>Start date</label><input style={inp} type="month" value={exp.start} onChange={e => updateExp(i,"start",e.target.value)} /></div>
                      <div>
                        <label style={label}>End date</label>
                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          <input style={{ ...inp, flex:1 }} type="month" value={exp.end} disabled={exp.current} onChange={e => updateExp(i,"end",e.target.value)} />
                          <label style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", color:"#374151", whiteSpace:"nowrap", cursor:"pointer" }}>
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
                      <div><label style={label}>Field of study</label><input style={inp} placeholder="Accounting" value={edu.field} onChange={e => updateEdu(i,"field",e.target.value)} /></div>
                      <div><label style={label}>Year</label><input style={inp} type="number" placeholder="2015" value={edu.year} onChange={e => updateEdu(i,"year",e.target.value)} /></div>
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
                <button onClick={() => setForm(f=>({...f,languages:[...f.languages,{lang:"French",level:"Intermediate"}]}))} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 18px", background:"white", border:"1.5px dashed #d1d5db", borderRadius:"10px", cursor:"pointer", color:"#6b7280", fontSize:"13px", fontWeight:500 }}>
                  <Plus size={14} /> Add language
                </button>
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

                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", marginBottom:"28px" }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{ padding:0, border:selectedTemplate===t.id?"2.5px solid #028090":"1.5px solid #e5e7eb", borderRadius:"14px", overflow:"hidden", cursor:"pointer", background:"white", boxShadow:selectedTemplate===t.id?"0 0 0 3px rgba(2,128,144,0.12)":"none", transition:"all 0.15s" }}>
                      {/* Mini template preview */}
                      <div style={{ height:"90px", background:t.color, display:"flex", flexDirection:"column", padding:"8px", gap:"4px", position:"relative" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                          <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:t.accent, opacity:0.7, flexShrink:0 }} />
                          <div style={{ height:"3px", background:t.accent === "white"?"rgba(255,255,255,0.6)":"rgba(0,0,0,0.15)", borderRadius:"2px", flex:1 }} />
                        </div>
                        {[70,50,80,40].map((w,i) => <div key={i} style={{ height:"3px", background:t.accent==="white"?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.08)", borderRadius:"2px", width:`${w}%` }} />)}
                      </div>
                      <div style={{ padding:"8px 10px" }}>
                        <p style={{ fontSize:"11px", fontWeight:700, color:"#0a1f24", margin:0 }}>{t.name}</p>
                        <p style={{ fontSize:"10px", color:"#9ca3af", margin:0 }}>{t.desc}</p>
                      </div>
                      {selectedTemplate===t.id && <div style={{ background:"#028090", padding:"3px 0", textAlign:"center", fontSize:"10px", color:"white", fontWeight:600 }}>Selected ✓</div>}
                    </button>
                  ))}
                </div>

                {/* CV Preview panel */}
                <div style={{ border:"1.5px solid #e5e7eb", borderRadius:"14px", overflow:"hidden", marginBottom:"24px" }}>
                  <div style={{ padding:"12px 16px", background:"#f9fafb", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <p style={{ fontSize:"13px", fontWeight:600, color:"#374151", margin:0 }}>Preview — {TEMPLATES.find(t=>t.id===selectedTemplate)?.name}</p>
                    <span style={{ fontSize:"11px", color:"#9ca3af" }}>A4 format</span>
                  </div>
                  {/* Simplified CV preview */}
                  <div style={{ padding:"24px", background:"white", minHeight:"300px" }}>
                    <div style={{ maxWidth:"500px", margin:"0 auto", background:TEMPLATES.find(t=>t.id===selectedTemplate)?.id==="minimal"?"white":"#f9fafb", borderRadius:"8px", overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.08)" }}>
                      <div style={{ background:TEMPLATES.find(t=>t.id===selectedTemplate)?.headerBg, padding:"16px 20px", display:"flex", alignItems:"center", gap:"12px" }}>
                        {form.personal.photo ? (
                          <img src={form.personal.photo} style={{ width:"40px", height:"40px", borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.3)", flexShrink:0 }} alt="" />
                        ) : (
                          <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <User size={18} color="rgba(255,255,255,0.5)" />
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight:700, color:TEMPLATES.find(t=>t.id===selectedTemplate)?.id==="minimal"||TEMPLATES.find(t=>t.id===selectedTemplate)?.id==="twocol"?"#0a1f24":"white", fontSize:"15px", margin:0 }}>{form.personal.name || "Your Name"}</p>
                          <p style={{ color:TEMPLATES.find(t=>t.id===selectedTemplate)?.id==="minimal"||TEMPLATES.find(t=>t.id===selectedTemplate)?.id==="twocol"?"#6b7280":"rgba(255,255,255,0.7)", fontSize:"12px", margin:0 }}>{form.personal.title || "Your Job Title"}</p>
                        </div>
                      </div>
                      <div style={{ padding:"16px 20px" }}>
                        {form.summary && <p style={{ fontSize:"12px", color:"#374151", lineHeight:1.6, marginBottom:"12px" }}>{form.summary.substring(0,200)}{form.summary.length>200?"...":""}</p>}
                        {form.experience[0]?.title && (
                          <div>
                            <p style={{ fontSize:"10px", fontWeight:700, color:"#028090", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"6px" }}>Experience</p>
                            <p style={{ fontSize:"12px", fontWeight:600, color:"#374151", margin:0 }}>{form.experience[0].title}</p>
                            <p style={{ fontSize:"11px", color:"#9ca3af", margin:0 }}>{form.experience[0].company}</p>
                          </div>
                        )}
                        {form.skills.length > 0 && (
                          <div style={{ marginTop:"12px" }}>
                            <p style={{ fontSize:"10px", fontWeight:700, color:"#028090", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"6px" }}>Skills</p>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                              {form.skills.slice(0,6).map(s => <span key={s} style={{ padding:"2px 8px", background:"#e6f5f3", color:"#028090", borderRadius:"99px", fontSize:"10px" }}>{s}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arabic notice */}
                <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 18px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"12px", marginBottom:"20px" }}>
                  <span style={{ fontSize:"20px" }}>🇸🇦</span>
                  <div>
                    <p style={{ fontSize:"13px", fontWeight:600, color:"#92400e", margin:0 }}>Arabic CV available after saving</p>
                    <p style={{ fontSize:"12px", color:"#b45309", margin:0 }}>Save your CV to unlock the Arabic RTL version — perfect for Gulf applications.</p>
                  </div>
                </div>

                {/* Save / Download */}
                <button onClick={handleSaveAndDownload} disabled={saving || !form.personal.name} style={{ width:"100%", padding:"16px", background:form.personal.name?"#028090":"#e5e7eb", color:form.personal.name?"white":"#9ca3af", border:"none", borderRadius:"14px", fontWeight:700, fontSize:"16px", cursor:form.personal.name?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Saving to GPS Talent Network…</> : <><Download size={18} /> Save CV & Join GPS Talent Network</>}
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
