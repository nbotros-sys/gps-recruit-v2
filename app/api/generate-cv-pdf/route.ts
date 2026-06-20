import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Renders the CV as a self-contained HTML string matching the selected template
function buildCVHtml(form: any, templateId: string): string {
  const name = form.personal?.name || ""
  const title = form.personal?.title || ""
  const email = form.personal?.email || ""
  const phone = form.personal?.phone || ""
  const location = form.personal?.location || ""
  const linkedin = form.personal?.linkedin || ""
  const summary = form.summary || ""
  const skills = (form.skills || []).join(", ")
  const languages = (form.languages || []).filter((l: any) => l.lang).map((l: any) => `${l.lang} (${l.level})`).join(", ")
  const education = (form.education || []).filter((e: any) => e.institution).map((e: any) =>
    `<p style="margin:0;font-size:13px;font-weight:600">${e.degree}${e.field ? " — " + e.field : ""}</p>
     <p style="margin:2px 0 0;font-size:12px;color:#6b7280">${e.institution}${e.endYear ? " · " + e.endYear : ""}</p>`
  ).join("<div style='margin-bottom:8px'></div>")

  const experience = (form.experience || []).filter((e: any) => e.title || e.company).map((e: any) => {
    const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    const fmtDate = (ym: string) => { if (!ym) return ""; const [y,m] = ym.split("-"); return `${months[parseInt(m)] || ""} ${y}` }
    const bullets = (e.bullets || []).filter((b: string) => b.trim()).map((b: string) =>
      `<li style="margin-bottom:4px;font-size:13px;color:#374151;line-height:1.5">${b}</li>`
    ).join("")
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div>
            <p style="margin:0;font-size:14px;font-weight:700;color:#0a1f24">${e.title}</p>
            <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:#028090">${e.company}</p>
          </div>
          <p style="margin:0;font-size:12px;color:#9ca3af;white-space:nowrap">${fmtDate(e.start)} – ${e.current ? "Present" : fmtDate(e.end)}</p>
        </div>
        <ul style="margin:6px 0 0 16px;padding:0">${bullets}</ul>
      </div>`
  }).join("")

  // Accent colour per template
  const accent = templateId === "bold" ? "#3D5A4E" : "#028090"
  const headerBg = templateId === "minimal" ? "#ffffff" : "#0a1f24"
  const headerNameColor = templateId === "minimal" ? "#0a1f24" : "white"
  const headerSubColor = templateId === "minimal" ? "#028090" : "rgba(168,213,209,0.85)"

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; background: white; color: #0a1f24; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
  <div style="width:210mm;min-height:297mm;background:white">
    <!-- Header -->
    <div style="background:${headerBg};padding:28px 32px;display:flex;align-items:center;gap:20px">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(2,128,144,0.3);border:2px solid rgba(2,128,144,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:rgba(255,255,255,0.7);flex-shrink:0">
        ${name.split(" ").map((p: string) => p[0] || "").join("").toUpperCase().slice(0,2)}
      </div>
      <div style="flex:1">
        <div style="font-size:22px;font-weight:700;color:${headerNameColor};margin-bottom:4px">${name}</div>
        <div style="font-size:10px;color:${headerSubColor};letter-spacing:.08em;text-transform:uppercase;font-family:sans-serif">${title}</div>
        <div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">
          ${email ? `<span style="font-size:11px;color:rgba(255,255,255,0.5);font-family:sans-serif">${email}</span>` : ""}
          ${phone ? `<span style="font-size:11px;color:rgba(255,255,255,0.5);font-family:sans-serif">${phone}</span>` : ""}
          ${location ? `<span style="font-size:11px;color:rgba(255,255,255,0.5);font-family:sans-serif">${location}</span>` : ""}
          ${linkedin ? `<span style="font-size:11px;color:rgba(2,128,144,0.8);font-family:sans-serif">${linkedin.replace("https://","")}</span>` : ""}
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="display:flex;height:calc(297mm - 112px)">
      <!-- Sidebar -->
      <div style="width:175px;flex-shrink:0;background:#f0fdf4;padding:20px 14px">
        ${skills ? `
          <div style="font-size:8px;font-weight:700;color:${accent};letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(2,128,144,0.15)">Skills</div>
          <div style="font-size:12px;color:#374151;line-height:1.8;margin-bottom:16px;font-family:sans-serif">${(form.skills || []).map((s: string) => `• ${s}`).join("<br>")}</div>
        ` : ""}
        ${languages ? `
          <div style="font-size:8px;font-weight:700;color:${accent};letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(2,128,144,0.15)">Languages</div>
          <div style="font-size:12px;color:#374151;line-height:1.8;margin-bottom:16px;font-family:sans-serif">${languages}</div>
        ` : ""}
        ${education ? `
          <div style="font-size:8px;font-weight:700;color:${accent};letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(2,128,144,0.15)">Education</div>
          <div style="font-size:12px;color:#374151;margin-bottom:16px">${education}</div>
        ` : ""}
      </div>

      <!-- Main -->
      <div style="flex:1;padding:22px 24px">
        ${summary ? `
          <div style="font-size:8px;font-weight:700;color:${accent};letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(2,128,144,0.15)">Professional Summary</div>
          <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:20px">${summary}</p>
        ` : ""}
        ${experience ? `
          <div style="font-size:8px;font-weight:700;color:${accent};letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;padding-bottom:4px;border-bottom:1px solid rgba(2,128,144,0.15)">Work Experience</div>
          ${experience}
        ` : ""}
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, form, templateId } = await req.json()
    if (!candidateId || !form) return NextResponse.json({ error: "Missing data" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Build HTML of the CV
    const html = buildCVHtml(form, templateId || "executive")

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
      cv_template: templateId || "executive",
      cv_source: "gps_builder",
      cv_generated_at: new Date().toISOString(),
    }).eq("id", candidateId)

    return NextResponse.json({ cv_pdf_url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
