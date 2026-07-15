import { NextRequest, NextResponse } from "next/server"
import { sendApplicationConfirmation, sendNetworkWelcome, sendInternalAlert } from "@/lib/emails"
import { rateLimit, clientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    // Public endpoint (called from the unauthenticated apply/join flows), so
    // throttle by IP to stop anyone scripting it to blast our branded emails.
    const ip = clientIp(req)
    const allowed = await rateLimit(`send-email:${ip}`, { windowSeconds: 3600, limit: 30 })
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const body = await req.json()
    const { type, ...data } = body

    if (type === "application_confirmation") {
      await sendApplicationConfirmation(data)
    } else if (type === "network_welcome") {
      await sendNetworkWelcome(data)
    } else if (type === "internal_alert") {
      await sendInternalAlert(data)
    } else {
      return NextResponse.json({ error: "Unknown email type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Email send error:", err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
