import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gps-recruit-v2.vercel.app"
const FROM = "GPS Talent <onboarding@resend.dev>"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { mandate_id, commentary_text, created_by } = await req.json()
    if (!mandate_id || !commentary_text) {
      return NextResponse.json({ error: "mandate_id and commentary_text required" }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Get mandate details
    const { data: mandate } = await supabase
      .from("mandates")
      .select("title, client_name")
      .eq("id", mandate_id)
      .single()

    // 2. Get client users for this mandate
    const { data: clients } = await supabase
      .from("client_users")
      .select("email, full_name")
      .eq("mandate_id", mandate_id)
      .eq("is_active", true)

    // 3. Generate PDF via Doppio
    let pdfUrl: string | null = null
    try {
      const html = buildCommentaryHtml(commentary_text, mandate?.title, mandate?.client_name)
      const doppioRes = await fetch("https://api.doppio.sh/v1/render/pdf/direct", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DOPPIO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: { html },
          launch: { defaultViewport: { width: 794, height: 1123 } },
          pdf: { printBackground: true, format: "A4", margin: { top: "0", bottom: "0", left: "0", right: "0" } },
        }),
      })

      if (doppioRes.ok) {
        const pdfBuffer = await doppioRes.arrayBuffer()
        const fileName = `commentary-${mandate_id}-${Date.now()}.pdf`
        const { data: upload, error: uploadErr } = await supabase.storage
          .from("cv-pdps")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true })

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("cv-pdps").getPublicUrl(fileName)
          pdfUrl = publicUrl
        }
      }
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr)
      // Non-blocking — continue without PDF
    }

    // 4. Save to mandate_commentary
    const { data: commentary, error: commErr } = await supabase
      .from("mandate_commentary")
      .insert([{
        mandate_id,
        created_by: created_by || null,
        commentary_text,
        pdf_url: pdfUrl,
        email_sent: false,
      }])
      .select()
      .single()

    if (commErr) return NextResponse.json({ error: commErr.message }, { status: 500 })

    // 5. Send email to all active client users
    let emailsSent = 0
    if (clients && clients.length > 0 && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const portalUrl = `${BASE_URL}/client/${mandate_id}`

      for (const client of clients) {
        try {
          await resend.emails.send({
            from: FROM,
            to: client.email,
            subject: `GPS Update — ${mandate?.title || "Your Mandate"}`,
            html: buildEmailHtml(commentary_text, client.full_name, mandate?.title, portalUrl, pdfUrl),
          })
          emailsSent++
        } catch (emailErr) {
          console.error(`Email failed for ${client.email}:`, emailErr)
        }
      }

      // Mark email as sent
      await supabase.from("mandate_commentary").update({ email_sent: true, sent_at: new Date().toISOString() }).eq("id", commentary.id)
    }

    return NextResponse.json({ success: true, commentary_id: commentary.id, pdf_url: pdfUrl, emails_sent: emailsSent })
  } catch (err: any) {
    console.error("send-commentary error:", err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

function buildCommentaryHtml(text: string, mandateTitle?: string, clientName?: string) {
  const esc = (s: string) => (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  const lines = text.split("\n").map(l => `<p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.7;">${esc(l) || "&nbsp;"}</p>`).join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:white; }
    @page { size:A4; margin:0; }
    .page { width:210mm; min-height:297mm; display:flex; flex-direction:column; }
  </style></head><body><div class="page">
    <div style="background:#0a1f24;padding:36px 48px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="background:#028090;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:11px;font-weight:700;">GPS</span>
        </div>
        <div>
          <div style="color:white;font-size:15px;font-weight:700;">GPS Recruitment</div>
          <div style="color:rgba(168,213,209,0.7);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">Market Commentary</div>
        </div>
      </div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin-bottom:4px;">${esc(mandateTitle || "Mandate Update")}</h1>
      ${clientName ? `<div style="color:rgba(255,255,255,0.5);font-size:13px;">${esc(clientName)}</div>` : ""}
      <div style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:8px;">${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</div>
    </div>
    <div style="padding:40px 48px;flex:1;">${lines}</div>
    <div style="padding:24px 48px;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="font-size:11px;color:#9ca3af;">GPS — Your Trusted HR Partner · Egypt · Strictly Confidential</p>
    </div>
  </div></body></html>`
}

function buildEmailHtml(text: string, clientName: string, mandateTitle?: string, portalUrl?: string, pdfUrl?: string | null) {
  const firstName = clientName.split(" ")[0] || clientName
  const preview = text.substring(0, 180).replace(/\n/g, " ") + (text.length > 180 ? "…" : "")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">
          <tr><td style="background:#0a1f24;padding:28px 36px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="background:#028090;border-radius:8px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:10px;font-weight:700;">GPS</span>
              </div>
              <div style="display:inline-block;vertical-align:middle;margin-left:10px;">
                <div style="color:white;font-size:14px;font-weight:700;">GPS Recruitment</div>
                <div style="color:rgba(168,213,209,0.7);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">Market Commentary</div>
              </div>
            </div>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <div style="display:inline-block;background:rgba(2,128,144,0.1);color:#028090;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:99px;margin-bottom:16px;">GPS Update</div>
            <h1 style="font-size:20px;font-weight:700;color:#071f24;margin:0 0 8px;">Hi ${firstName},</h1>
            <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 20px;">We have a new update for your search for <strong>${mandateTitle || "your mandate"}</strong>.</p>
            <div style="background:#f5faf9;border:1px solid #d0e8e4;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
              <p style="font-size:13px;color:#374151;line-height:1.7;margin:0;">${preview}</p>
            </div>
            ${portalUrl ? `<a href="${portalUrl}" style="display:block;background:#028090;color:white;text-align:center;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:16px;">View full update in your portal →</a>` : ""}
            ${pdfUrl ? `<a href="${pdfUrl}" style="display:block;text-align:center;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid #e5e7eb;color:#374151;">Download PDF version</a>` : ""}
          </td></tr>
          <tr><td style="padding:16px 36px 28px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="font-size:11px;color:#aaa;line-height:1.7;margin:0;">GPS — Your Trusted HR Partner · Egypt<br>You received this because you are a registered client for this mandate.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}
