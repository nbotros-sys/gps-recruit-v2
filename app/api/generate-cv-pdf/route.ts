import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { renderCvHtml } from "../../../lib/cv-pdf-templates"

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function fmtDate(month: string, year: string): string {
  if (!year) return ""
  if (!month) return year
  const mi = parseInt(month)
  return `${MONTHS[mi] || ""} ${year}`.trim()
}

function esc(s: string): string {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE STYLES shared across all templates
// ─────────────────────────────────────────────────────────────────────────────
const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: white;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { size: A4; margin: 0; }
  .page { width: 210mm; background: white; }
  .section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
    padding-bottom: 6px;
  }
  .exp-entry { margin-bottom: 20px; }
  .exp-entry:last-child { margin-bottom: 0; }
  ul.bullets { margin: 8px 0 0 16px; padding: 0; }
  ul.bullets li {
    font-size: 12px;
    color: #374151;
    line-height: 1.65;
    margin-bottom: 3px;
  }
  .pill-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill {
    display: inline-block;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 99px;
    line-height: 1.5;
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: PRESTIGE  (clean white, teal accent, circle photo top-right)
// ─────────────────────────────────────────────────────────────────────────────
function buildPrestige(form: any): string {
  const p       = form.personal || {}
  const name    = esc(p.name    || "")
  const title   = esc(p.title   || "")
  const email   = esc(p.email   || "")
  const phone   = esc(p.phone   || "")
  const loc     = esc(p.location|| "")
  const linkedin= esc((p.linkedin||"").replace(/^https?:\/\//,""))
  const summary = esc(form.summary || "")
  const photo   = p.photo || null

  const TEAL = "#028090"

  // Contact row items
  const contacts: string[] = []
  if (email)    contacts.push(`<span>✉&nbsp;${email}</span>`)
  if (phone)    contacts.push(`<span>✆&nbsp;${phone}</span>`)
  if (loc)      contacts.push(`<span>⌖&nbsp;${loc}</span>`)
  if (linkedin) contacts.push(`<span>in&nbsp;${linkedin}</span>`)
  const contactRow = contacts.join(`<span style="color:#d1d5db;margin:0 8px">|</span>`)

  // Photo or initials avatar
  const initials = (name.split(" ").map((w:string)=>w[0]||"").join("").slice(0,2)).toUpperCase()
  const photoHtml = photo
    ? `<img src="${photo}" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2.5px solid ${TEAL};flex-shrink:0" />`
    : `<div style="width:72px;height:72px;border-radius:50%;background:#e6f4f6;border:2px solid ${TEAL};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:${TEAL};flex-shrink:0">${initials}</div>`

  // Experience
  const experience = (form.experience || []).filter((e:any) => e.title || e.company).map((e:any) => {
    const dateRange = [fmtDate(e.startMonth, e.startYear), e.current ? "Present" : fmtDate(e.endMonth, e.endYear)].filter(Boolean).join(" – ")
    const bullets = (e.bullets || []).filter((b:string)=>b.trim()).map((b:string)=>
      `<li>${esc(b)}</li>`).join("")
    return `
    <div class="exp-entry">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:600;color:#111827">${esc(e.title||"")}</div>
          <div style="font-size:12px;font-weight:500;color:${TEAL};margin-top:1px">${esc(e.company||"")}</div>
        </div>
        <div style="font-size:11px;color:#9ca3af;white-space:nowrap;flex-shrink:0">${dateRange}</div>
      </div>
      ${bullets ? `<ul class="bullets">${bullets}</ul>` : ""}
    </div>`
  }).join("")

  // Skills as pills
  const skills = (form.skills || []).filter((s:string)=>s.trim()).map((s:string)=>
    `<span class="pill" style="background:#e6f4f6;color:#0e7a87;border:1px solid #b2dde3">${esc(s)}</span>`
  ).join("")

  // Languages
  const languages = (form.languages || []).filter((l:any)=>l.lang).map((l:any)=>
    `<span class="pill" style="background:#f3f4f6;color:#374151;border:1px solid #e5e7eb">${esc(l.lang)} <span style="font-weight:400;color:#9ca3af">${esc(l.level)}</span></span>`
  ).join("")

  // Education
  const education = (form.education || []).filter((e:any)=>e.institution).map((e:any)=>`
    <div style="margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:#111827">${esc(e.degree||"")}${e.field?` <span style="font-weight:400;color:#6b7280">· ${esc(e.field)}</span>`:"" }</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(e.institution||"")}${e.endYear?` · ${esc(e.endYear)}`:""}</div>
    </div>`).join("")

  // Achievements
  const achievements = form.achievements ? `
    <div style="margin-top:28px">
      <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Achievements & Certifications</div>
      <p style="font-size:12.5px;color:#374151;line-height:1.7">${esc(form.achievements)}</p>
    </div>` : ""

  // Hobbies
  const hobbies = form.hobbies ? `
    <div style="margin-top:20px">
      <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Interests</div>
      <p style="font-size:12px;color:#374151;line-height:1.7">${esc(form.hobbies)}</p>
    </div>` : ""

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${BASE_CSS}
</style>
</head>
<body>
<div class="page">

  <!-- ── HEADER ── -->
  <div style="padding:36px 40px 24px;border-bottom:3px solid ${TEAL}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px">
      <div style="flex:1;min-width:0">
        <h1 style="font-size:28px;font-weight:700;color:#0a1f24;letter-spacing:-0.5px;line-height:1.1">${name}</h1>
        <p style="font-size:14px;font-weight:500;color:${TEAL};margin-top:5px;letter-spacing:0.02em">${title}</p>
        ${contacts.length ? `
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:12px;font-size:11px;color:#6b7280">
          ${contactRow}
        </div>` : ""}
      </div>
      ${photoHtml}
    </div>
  </div>

  <!-- ── BODY ── -->
  <div style="display:flex;gap:0">

    <!-- MAIN COLUMN -->
    <div style="flex:1;min-width:0;padding:28px 32px 36px">

      ${summary ? `
      <div style="margin-bottom:28px">
        <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Professional Summary</div>
        <p style="font-size:13px;color:#374151;line-height:1.75">${summary}</p>
      </div>` : ""}

      ${experience ? `
      <div style="margin-bottom:28px">
        <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Work Experience</div>
        ${experience}
      </div>` : ""}

      ${achievements}
      ${hobbies}

    </div>

    <!-- SIDEBAR -->
    <div style="width:190px;flex-shrink:0;padding:28px 20px 36px;background:#f8fafb;border-left:1px solid #e5e7eb">

      ${skills ? `
      <div style="margin-bottom:24px">
        <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Skills</div>
        <div class="pill-wrap">${skills}</div>
      </div>` : ""}

      ${languages ? `
      <div style="margin-bottom:24px">
        <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Languages</div>
        <div class="pill-wrap">${languages}</div>
      </div>` : ""}

      ${education ? `
      <div>
        <div class="section-label" style="color:${TEAL};border-bottom:1.5px solid #e0f2f4">Education</div>
        ${education}
      </div>` : ""}

    </div>
  </div>

</div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: ARCHITECT  (minimal, all white, slate navy accent, no sidebar)
// ─────────────────────────────────────────────────────────────────────────────
function buildArchitect(form: any): string {
  const p       = form.personal || {}
  const name    = esc(p.name    || "")
  const title   = esc(p.title   || "")
  const email   = esc(p.email   || "")
  const phone   = esc(p.phone   || "")
  const loc     = esc(p.location|| "")
  const linkedin= esc((p.linkedin||"").replace(/^https?:\/\//,""))
  const summary = esc(form.summary || "")
  const photo   = p.photo || null

  const NAVY = "#1a3a5c"
  const ACCENT = "#2563eb"

  const initials = (name.split(" ").map((w:string)=>w[0]||"").join("").slice(0,2)).toUpperCase()
  const photoHtml = photo
    ? `<img src="${photo}" alt="" style="width:68px;height:68px;border-radius:6px;object-fit:cover;flex-shrink:0;box-shadow:0 0 0 2px #e2e8f0" />`
    : ""

  const contacts: string[] = []
  if (email)    contacts.push(email)
  if (phone)    contacts.push(phone)
  if (loc)      contacts.push(loc)
  if (linkedin) contacts.push(linkedin)

  // Experience
  const experience = (form.experience || []).filter((e:any) => e.title || e.company).map((e:any) => {
    const dateRange = [fmtDate(e.startMonth, e.startYear), e.current ? "Present" : fmtDate(e.endMonth, e.endYear)].filter(Boolean).join(" – ")
    const bullets = (e.bullets || []).filter((b:string)=>b.trim()).map((b:string)=>
      `<li>${esc(b)}</li>`).join("")
    return `
    <div class="exp-entry">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px">
        <div style="flex:1;min-width:0">
          <span style="font-size:13.5px;font-weight:600;color:${NAVY}">${esc(e.title||"")}</span>
          <span style="font-size:12px;color:#64748b;margin-left:8px">${esc(e.company||"")}</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;white-space:nowrap;flex-shrink:0">${dateRange}</div>
      </div>
      ${bullets ? `<ul class="bullets">${bullets}</ul>` : ""}
    </div>`
  }).join("")

  // Skills as pills
  const skills = (form.skills || []).filter((s:string)=>s.trim()).map((s:string)=>
    `<span class="pill" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">${esc(s)}</span>`
  ).join("")

  // Languages inline
  const languages = (form.languages || []).filter((l:any)=>l.lang).map((l:any)=>
    `<span class="pill" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0">${esc(l.lang)} <span style="font-weight:400;color:#94a3b8">${esc(l.level)}</span></span>`
  ).join("")

  // Education
  const education = (form.education || []).filter((e:any)=>e.institution).map((e:any)=>`
    <div style="margin-bottom:10px">
      <span style="font-size:13px;font-weight:600;color:${NAVY}">${esc(e.degree||"")}${e.field?`, ${esc(e.field)}`:""}</span>
      <span style="font-size:12px;color:#64748b"> · ${esc(e.institution||"")}${e.endYear?` · ${esc(e.endYear)}`:""}</span>
    </div>`).join("")

  const achievements = form.achievements ? `
    <div style="margin-top:28px">
      <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Achievements & Certifications</div>
      <p style="font-size:12.5px;color:#374151;line-height:1.7">${esc(form.achievements)}</p>
    </div>` : ""

  const hobbies = form.hobbies ? `
    <div style="margin-top:24px">
      <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Interests</div>
      <p style="font-size:12px;color:#374151;line-height:1.7">${esc(form.hobbies)}</p>
    </div>` : ""

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${BASE_CSS}
</style>
</head>
<body>
<div class="page" style="padding:44px 48px">

  <!-- ── HEADER ── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:8px">
    <div style="flex:1;min-width:0">
      <h1 style="font-size:30px;font-weight:700;color:${NAVY};letter-spacing:-0.5px;line-height:1.1">${name}</h1>
      <p style="font-size:13.5px;font-weight:500;color:${ACCENT};margin-top:6px">${title}</p>
    </div>
    ${photoHtml}
  </div>

  <!-- teal rule -->
  <div style="height:3px;background:linear-gradient(90deg,${ACCENT},#93c5fd);border-radius:2px;margin:14px 0 16px"></div>

  ${contacts.length ? `
  <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:11.5px;color:#64748b;margin-bottom:28px">
    ${contacts.map(c=>`<span>${esc(c)}</span>`).join("")}
  </div>` : `<div style="margin-bottom:28px"></div>`}

  <!-- ── TWO COLUMN BODY ── -->
  <div style="display:flex;gap:40px">

    <!-- MAIN -->
    <div style="flex:1;min-width:0">

      ${summary ? `
      <div style="margin-bottom:28px">
        <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Summary</div>
        <p style="font-size:13px;color:#374151;line-height:1.75">${summary}</p>
      </div>` : ""}

      ${experience ? `
      <div style="margin-bottom:28px">
        <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Experience</div>
        ${experience}
      </div>` : ""}

      ${achievements}
      ${hobbies}

    </div>

    <!-- SIDEBAR (narrower, no background) -->
    <div style="width:168px;flex-shrink:0">

      ${skills ? `
      <div style="margin-bottom:24px">
        <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Skills</div>
        <div class="pill-wrap">${skills}</div>
      </div>` : ""}

      ${languages ? `
      <div style="margin-bottom:24px">
        <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Languages</div>
        <div class="pill-wrap">${languages}</div>
      </div>` : ""}

      ${education ? `
      <div>
        <div class="section-label" style="color:${NAVY};border-bottom:2px solid #e2e8f0">Education</div>
        ${education}
      </div>` : ""}

    </div>
  </div>

</div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: MERIDIAN  (warm white, rose-teal accent, name-bar header)
// ─────────────────────────────────────────────────────────────────────────────
function buildMeridian(form: any): string {
  const p       = form.personal || {}
  const name    = esc(p.name    || "")
  const title   = esc(p.title   || "")
  const email   = esc(p.email   || "")
  const phone   = esc(p.phone   || "")
  const loc     = esc(p.location|| "")
  const linkedin= esc((p.linkedin||"").replace(/^https?:\/\//,""))
  const summary = esc(form.summary || "")
  const photo   = p.photo || null

  const FOREST = "#3D5A4E"
  const SAGE   = "#e8f0ec"

  const initials = (name.split(" ").map((w:string)=>w[0]||"").join("").slice(0,2)).toUpperCase()
  const photoHtml = photo
    ? `<img src="${photo}" alt="" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid white;box-shadow:0 0 0 2.5px ${FOREST};flex-shrink:0;margin-top:4px" />`
    : `<div style="width:76px;height:76px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white;flex-shrink:0;margin-top:4px">${initials}</div>`

  const contacts: string[] = []
  if (email)    contacts.push(email)
  if (phone)    contacts.push(phone)
  if (loc)      contacts.push(loc)
  if (linkedin) contacts.push(linkedin)

  // Experience
  const experience = (form.experience || []).filter((e:any) => e.title || e.company).map((e:any) => {
    const dateRange = [fmtDate(e.startMonth, e.startYear), e.current ? "Present" : fmtDate(e.endMonth, e.endYear)].filter(Boolean).join(" – ")
    const bullets = (e.bullets || []).filter((b:string)=>b.trim()).map((b:string)=>
      `<li>${esc(b)}</li>`).join("")
    return `
    <div class="exp-entry">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:600;color:#1a2e25">${esc(e.title||"")}</div>
          <div style="font-size:12px;font-weight:500;color:${FOREST};margin-top:1px">${esc(e.company||"")}</div>
        </div>
        <div style="font-size:11px;color:#9ca3af;white-space:nowrap;flex-shrink:0">${dateRange}</div>
      </div>
      ${bullets ? `<ul class="bullets">${bullets}</ul>` : ""}
    </div>`
  }).join("")

  // Skills as pills — warm sage
  const skills = (form.skills || []).filter((s:string)=>s.trim()).map((s:string)=>
    `<span class="pill" style="background:${SAGE};color:${FOREST};border:1px solid #c3d5ca">${esc(s)}</span>`
  ).join("")

  // Languages
  const languages = (form.languages || []).filter((l:any)=>l.lang).map((l:any)=>
    `<span class="pill" style="background:#f5f5f4;color:#44403c;border:1px solid #e7e5e4">${esc(l.lang)} <span style="font-weight:400;color:#a8a29e">${esc(l.level)}</span></span>`
  ).join("")

  // Education
  const education = (form.education || []).filter((e:any)=>e.institution).map((e:any)=>`
    <div style="margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:#1a2e25">${esc(e.degree||"")}${e.field?` <span style="font-weight:400;color:#6b7280">· ${esc(e.field)}</span>`:"" }</div>
      <div style="font-size:12px;color:#78716c;margin-top:2px">${esc(e.institution||"")}${e.endYear?` · ${esc(e.endYear)}`:""}</div>
    </div>`).join("")

  const achievements = form.achievements ? `
    <div style="margin-top:28px">
      <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Achievements & Certifications</div>
      <p style="font-size:12.5px;color:#374151;line-height:1.7">${esc(form.achievements)}</p>
    </div>` : ""

  const hobbies = form.hobbies ? `
    <div style="margin-top:24px">
      <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Interests</div>
      <p style="font-size:12px;color:#374151;line-height:1.7">${esc(form.hobbies)}</p>
    </div>` : ""

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${BASE_CSS}
</style>
</head>
<body>
<div class="page">

  <!-- ── HEADER BAR ── -->
  <div style="background:${FOREST};padding:32px 40px 28px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px">
    <div style="flex:1;min-width:0">
      <h1 style="font-size:27px;font-weight:700;color:white;letter-spacing:-0.3px;line-height:1.15">${name}</h1>
      <p style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.75);margin-top:5px;letter-spacing:0.04em">${title}</p>
      ${contacts.length ? `
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:14px;font-size:11px;color:rgba(255,255,255,0.6)">
        ${contacts.map(c=>`<span style="margin-right:14px">${esc(c)}</span>`).join("")}
      </div>` : ""}
    </div>
    ${photoHtml}
  </div>

  <!-- ── BODY ── -->
  <div style="display:flex;gap:0">

    <!-- MAIN COLUMN -->
    <div style="flex:1;min-width:0;padding:28px 32px 36px">

      ${summary ? `
      <div style="margin-bottom:28px">
        <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Professional Summary</div>
        <p style="font-size:13px;color:#374151;line-height:1.75">${summary}</p>
      </div>` : ""}

      ${experience ? `
      <div style="margin-bottom:28px">
        <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Work Experience</div>
        ${experience}
      </div>` : ""}

      ${achievements}
      ${hobbies}

    </div>

    <!-- SIDEBAR -->
    <div style="width:190px;flex-shrink:0;padding:28px 20px 36px;background:#fafaf8;border-left:1px solid #e7e5e4">

      ${skills ? `
      <div style="margin-bottom:24px">
        <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Skills</div>
        <div class="pill-wrap">${skills}</div>
      </div>` : ""}

      ${languages ? `
      <div style="margin-bottom:24px">
        <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Languages</div>
        <div class="pill-wrap">${languages}</div>
      </div>` : ""}

      ${education ? `
      <div>
        <div class="section-label" style="color:${FOREST};border-bottom:1.5px solid #d1dbd6">Education</div>
        ${education}
      </div>` : ""}

    </div>
  </div>

</div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BUILD FUNCTION — routes to the correct template
// ─────────────────────────────────────────────────────────────────────────────
function buildCVHtml(form: any, templateId: string): string {
  switch (templateId) {
    case "architect": return buildArchitect(form)
    case "meridian":  return buildMeridian(form)
    case "prestige":
    default:          return buildPrestige(form)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTE
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { candidateId, form, templateId, boost } = await req.json()
    if (!candidateId || !form) return NextResponse.json({ error: "Missing data" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Build HTML of the CV
    const html = renderCvHtml(form, templateId || "prestige", boost || 1)

    // Send to Doppio for PDF generation
    const doppioRes = await fetch("https://api.doppio.sh/v1/render/pdf/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${process.env.DOPPIO_API_KEY}`,
      },
      body: JSON.stringify({
        page: {
          setContent: { html, waitUntil: "networkidle0" },
          pdf: {
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
          }
        }
      })
    })

    if (!doppioRes.ok) {
      const err = await doppioRes.text()
      return NextResponse.json({ error: `Doppio error: ${err}` }, { status: 500 })
    }

    const doppioData = await doppioRes.json()
    const pdfUrl = doppioData.documentUrl

    if (!pdfUrl) return NextResponse.json({ error: "No PDF URL returned" }, { status: 500 })

    // Download the PDF from Doppio
    const pdfBuffer = await (await fetch(pdfUrl)).arrayBuffer()

    // Upload to Supabase Storage
    const storagePath = `${candidateId}/cv.pdf`
    const { error: uploadError } = await supabase.storage
      .from("cv-pdfs")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "3600",
      })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from("cv-pdfs").getPublicUrl(storagePath)
    const cv_pdf_url = `${urlData.publicUrl}?t=${Date.now()}`

    // Save URL + template + GPS CV badge flag to candidate record
    await supabase.from("candidates").update({
      cv_pdf_url,
      cv_template: templateId || "prestige",
      cv_source: "gps_builder",
      cv_generated_at: new Date().toISOString(),
    }).eq("id", candidateId)

    return NextResponse.json({ cv_pdf_url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
