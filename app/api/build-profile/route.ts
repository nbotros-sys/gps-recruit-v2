import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/require-staff"
import { buildProfileFromCV } from "@/lib/build-profile-core"

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const { cv_text, filename } = await req.json().catch(() => ({} as any))
  if (!cv_text?.trim()) {
    return NextResponse.json({ error: "No CV text" }, { status: 400 })
  }

  const profile = await buildProfileFromCV(cv_text, filename)
  return NextResponse.json(profile)
}
