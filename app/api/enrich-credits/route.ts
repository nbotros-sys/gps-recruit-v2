import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/require-staff"

// Returns the remaining Enrich Layer (Proxycurl) credit balance. Staff-only.
// The balance check itself costs 0 credits.
export async function GET() {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const apiKey = process.env.PROXYCURL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "PROXYCURL_API_KEY not configured" }, { status: 500 })
  }

  try {
    const res = await fetch("https://enrichlayer.com/api/v2/credit-balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Balance check failed (${res.status})` }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ credit_balance: data?.credit_balance ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
