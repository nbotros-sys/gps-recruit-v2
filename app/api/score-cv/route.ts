import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/require-staff"
import { scoreCV } from "@/lib/score-cv-core"

export async function POST(req: NextRequest) {
  // Auth guard — belt-and-braces (middleware is primary)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const { cv_text, job_description, mandate_title } = await req.json().catch(() => ({} as any))
  if (!cv_text || !job_description) {
    return NextResponse.json({ error: "Missing CV text or job description" }, { status: 400 })
  }

  const result = await scoreCV(cv_text, job_description, mandate_title)
  return NextResponse.json(result)
}
