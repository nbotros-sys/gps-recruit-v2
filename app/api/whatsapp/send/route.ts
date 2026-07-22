import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { requireStaff } from "@/lib/require-staff"
import { waAdmin, toWhatsApp } from "@/lib/wa"

// Staff-only. Sends a WhatsApp message on behalf of GPS and records it.
// v1: free-form text (in-session). Template sends (contentSid) supported too.
export async function POST(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const bodyIn = await req.json().catch(() => ({} as any))
  const conversationId: string = (bodyIn?.conversationId || "").trim()
  const text: string = (bodyIn?.body || "").trim()
  const contentSid: string = (bodyIn?.contentSid || "").trim()
  if (!conversationId || (!text && !contentSid)) {
    return NextResponse.json({ error: "Missing conversationId or message" }, { status: 400 })
  }

  const admin = waAdmin()
  const convo = await admin
    .from("wa_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle()
  if (!convo.data) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  // Respect opt-out.
  if (convo.data.candidate_id) {
    const cand = await admin
      .from("candidates")
      .select("wa_consent")
      .eq("id", convo.data.candidate_id)
      .maybeSingle()
    if (cand.data && cand.data.wa_consent === false) {
      return NextResponse.json({ error: "Candidate has opted out of WhatsApp" }, { status: 409 })
    }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID || ""
  const token = process.env.TWILIO_AUTH_TOKEN || ""
  const from = process.env.TWILIO_WHATSAPP_FROM || ""
  if (!sid || !token || !from) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 500 })
  }

  const proto = req.headers.get("x-forwarded-proto") || "https"
  const host = req.headers.get("host") || ""
  const statusCallback = `${proto}://${host}/api/whatsapp/webhook`

  const client = twilio(sid, token)
  const createOpts: Record<string, any> = {
    from,
    to: toWhatsApp(convo.data.phone),
    statusCallback,
  }
  if (contentSid) createOpts.contentSid = contentSid
  else createOpts.body = text

  let msg: any
  try {
    msg = await client.messages.create(createOpts as any)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 502 })
  }

  await admin.from("wa_messages").insert({
    conversation_id: conversationId,
    direction: "out",
    body: text || null,
    template_name: contentSid || null,
    status: msg?.status || "queued",
    wa_message_id: msg?.sid || null,
    sent_by: gate.staffId,
  })

  await admin
    .from("wa_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: (text || "Template message").slice(0, 140),
      last_direction: "out",
      unread_count: 0,
    })
    .eq("id", conversationId)

  return NextResponse.json({ ok: true, sid: msg?.sid, status: msg?.status })
}
