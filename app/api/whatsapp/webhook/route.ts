import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import {
  waAdmin,
  normalisePhone,
  getOrCreateConversation,
} from "@/lib/wa"

// PUBLIC route (allow-listed in middleware). Twilio calls it unauthenticated,
// so it protects itself with (1) rate limiting and (2) Twilio signature
// verification — no valid signature, no processing.

const OPT_OUT = new Set(["STOP", "UNSUBSCRIBE", "إيقاف", "الغاء", "إلغاء"])

const SESSION_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const ok = await rateLimit(`wa-webhook:${ip}`, { windowSeconds: 60, limit: 120 })
  if (!ok) return new NextResponse("rate limited", { status: 429 })

  // Parse Twilio's x-www-form-urlencoded body into a plain params object.
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { params[k] = typeof v === "string" ? v : "" })

  // Verify the request really came from Twilio.
  const signature = req.headers.get("x-twilio-signature") || ""
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const host = req.headers.get("host") || ""
  const url = `${proto}://${host}/api/whatsapp/webhook`
  const authToken = process.env.TWILIO_AUTH_TOKEN || ""
  const valid = twilio.validateRequest(authToken, signature, url, params)
  if (!valid) {
    return new NextResponse("invalid signature", { status: 403 })
  }

  const admin = waAdmin()

  // --- Status callback (delivery/read receipts + cost) --------------------
  const status = params.MessageStatus || params.SmsStatus
  const sid = params.MessageSid || params.SmsSid
  if (status && !params.Body) {
    const patch: Record<string, any> = { status }
    if (params.Price) {
      patch.cost = Math.abs(parseFloat(params.Price)) || null
      patch.currency = params.PriceUnit || null
    }
    if (params.ErrorMessage) patch.error_text = params.ErrorMessage
    if (sid) await admin.from("wa_messages").update(patch).eq("wa_message_id", sid)
    return new NextResponse("", { status: 200 })
  }

  // --- Inbound message ----------------------------------------------------
  const e164 = normalisePhone(params.From || params.WaId || "")
  if (!e164) return new NextResponse("", { status: 200 })
  const body = params.Body || ""
  const profileName = params.ProfileName || ""

  const convo = await getOrCreateConversation(admin, e164, profileName)
  if (!convo) return new NextResponse("", { status: 200 })

  await admin.from("wa_messages").insert({
    conversation_id: convo.id,
    direction: "in",
    body,
    status: "received",
    wa_message_id: sid || null,
  })

  const nowIso = new Date().toISOString()
  await admin
    .from("wa_conversations")
    .update({
      last_message_at: nowIso,
      last_message_preview: body.slice(0, 140),
      last_direction: "in",
      unread_count: (convo.unread_count || 0) + 1,
      session_expires_at: new Date(Date.now() + SESSION_MS).toISOString(),
      wa_profile_name: profileName || convo.wa_profile_name,
    })
    .eq("id", convo.id)

  // --- Opt-out handling ---------------------------------------------------
  const cmd = body.trim().toUpperCase()
  if (OPT_OUT.has(cmd) && convo.candidate_id) {
    await admin
      .from("candidates")
      .update({ wa_consent: false, wa_opted_out_at: nowIso })
      .eq("id", convo.candidate_id)
  }

  return new NextResponse("", { status: 200 })
}
