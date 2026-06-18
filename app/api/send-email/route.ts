import { NextRequest, NextResponse } from "next/server"
import { sendApplicationConfirmation, sendNetworkWelcome, sendInternalAlert } from "@/lib/emails"

export async function POST(req: NextRequest) {
  try {
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
