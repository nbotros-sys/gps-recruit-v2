import { createNotification } from "@/lib/activity"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const FROM = process.env.FROM_EMAIL || "GPS Talent <onboarding@resend.dev>"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gps-recruit-v2.vercel.app"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const _authClient = createServerSupabaseClient()
  const { data: { user: _authUser } } = await _authClient.auth.getUser()
  if (!_authUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    const { mandate_id, commentary_text, created_by } = await req.json()
    if (!mandate_id || !commentary_text) {
      return NextResponse.json({ error: "mandate_id and commentary_text required" }, { status: 400 })
    }

    const supabase = getAdmin()

    // Get mandate + active clients
    const [{ data: mandate }, { data: clients }] = await Promise.all([
      supabase.from("mandates").select("title, client_name").eq("id", mandate_id).single(),
      supabase.from("client_users").select("email, full_name").eq("mandate_id", mandate_id).eq("is_active", true),
    ])

    // Generate PDF via Doppio
    let pdfUrl: string | null = null
    try {
      const html = buildPdfHtml(commentary_text, mandate?.title, mandate?.client_name)
      const doppioRes = await fetch("https://api.doppio.sh/v1/render/pdf/direct", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.DOPPIO_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          page: { html },
          launch: { defaultViewport: { width: 794, height: 1123 } },
          pdf: { printBackground: true, format: "A4", margin: { top: "0", bottom: "0", left: "0", right: "0" } },
        }),
      })
      if (doppioRes.ok) {
        const buf = await doppioRes.arrayBuffer()
        const fileName = `commentary-${mandate_id}-${Date.now()}.pdf`
        const { error: upErr } = await supabase.storage.from("cv-pdps").upload(fileName, buf, { contentType: "application/pdf", upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("cv-pdps").getPublicUrl(fileName)
          pdfUrl = publicUrl
        }
      }
    } catch (pdfErr) { console.error("PDF error:", pdfErr) }

    // Save commentary record
    const { data: commentary, error: commErr } = await supabase
      .from("mandate_commentary")
      .insert([{ mandate_id, created_by: created_by || null, commentary_text, pdf_url: pdfUrl, email_sent: false }])
      .select().single()

    if (commErr) return NextResponse.json({ error: commErr.message }, { status: 500 })

    // Send emails
    let emailsSent = 0
    if (clients && clients.length > 0 && process.env.RESEND_API_KEY) {
      const portalUrl = `${BASE_URL}/client/${mandate_id}`
      for (const client of clients) {
        try {
          await getResend().emails.send({
            from: FROM,
            to: client.email,
            subject: `GPS Update — ${mandate?.title || "Your Mandate"}`,
            html: buildEmailHtml(client.full_name, commentary_text, mandate?.title, portalUrl, pdfUrl),
          })
          emailsSent++
        } catch (e) { console.error(`Email failed for ${client.email}:`, e) }
      }
      if (emailsSent > 0) {
        await supabase.from("mandate_commentary").update({ email_sent: true, sent_at: new Date().toISOString() }).eq("id", commentary.id)
      }
    }

    // Fire notification
    try {
      await createNotification({
        type: "commentary_sent",
        title: "Market commentary sent",
        message: `Commentary sent for ${mandate?.title || "mandate"} — ${emailsSent} client(s) notified`,
        link: `/internal/clients`,
      })
    } catch {}

    return NextResponse.json({ success: true, commentary_id: commentary.id, pdf_url: pdfUrl, emails_sent: emailsSent })
  } catch (err: any) {
    console.error("send-commentary error:", err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

function buildPdfHtml(text: string, title?: string, client?: string) {
  const esc = (s: string) => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  const lines = text.split("\n").map(l => `<p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.7;">${esc(l)||"&nbsp;"}</p>`).join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:white;}</style></head>
<body><div style="width:210mm;min-height:297mm;display:flex;flex-direction:column;">
  <div style="background:#0a1f24;padding:36px 48px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="background:#028090;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:11px;font-weight:700;">GPS</span></div>
      <div><div style="color:white;font-size:15px;font-weight:700;">GPS Recruitment</div><div style="color:rgba(168,213,209,0.7);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">Market Commentary</div></div>
    </div>
    <h1 style="color:white;font-size:20px;font-weight:700;margin-bottom:4px;">${esc(title||"Mandate Update")}</h1>
    ${client ? `<div style="color:rgba(255,255,255,0.5);font-size:13px;">${esc(client)}</div>` : ""}
    <div style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:8px;">${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
  </div>
  <div style="padding:40px 48px;flex:1;">${lines}</div>
  <div style="padding:20px 48px;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="font-size:11px;color:#9ca3af;">GPS — Your Trusted HR Partner · Egypt · Strictly Confidential</p>
  </div>
</div></body></html>`
}

function buildEmailHtml(name: string, text: string, title?: string, portalUrl?: string, pdfUrl?: string|null) {
  const firstName = name.split(" ")[0] || name
  const preview = text.substring(0, 200).replace(/\n/g, " ") + (text.length > 200 ? "…" : "")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:14px;overflow:hidden;border:1px solid #e0e0e0;">
      <tr><td style="background:#0a1f24;padding:28px 36px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#028090;border-radius:8px;width:34px;height:34px;text-align:center;vertical-align:middle;"><span style="color:white;font-size:10px;font-weight:700;">GPS</span></td>
          <td style="padding-left:10px;"><div style="color:white;font-size:14px;font-weight:700;">GPS Recruitment</div><div style="color:rgba(168,213,209,0.6);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">Market Commentary</div></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <h1 style="font-size:20px;font-weight:700;color:#0a1f24;margin:0 0 8px;">Hi ${firstName},</h1>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 20px;">We have a new update for your search${title ? ` for <strong>${title}</strong>` : ""}.</p>
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#374151;line-height:1.7;margin:0;">${preview}</p>
        </div>
        ${portalUrl ? `<a href="${portalUrl}" style="display:block;background:#028090;color:white;text-align:center;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:12px;">View full update in your portal →</a>` : ""}
        ${pdfUrl ? `<a href="${pdfUrl}" style="display:block;text-align:center;padding:11px 28px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid #e5e7eb;color:#374151;">Download PDF</a>` : ""}
      </td></tr>
      <tr><td style="padding:16px 36px 24px;text-align:center;border-top:1px solid #f0f0f0;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">GPS — Your Trusted HR Partner · Egypt</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
