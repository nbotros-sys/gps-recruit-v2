import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

// One-time backfill: re-read existing candidates' stored CV text and fill in
// `dob` when the CV explicitly states a date of birth. Walks forward by id in
// small batches (cursor = after_id) so it never times out or re-scans.
export const maxDuration = 60

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function extractDob(cvText: string): Promise<string | null> {
  const prompt = `From the CV text below, extract the person's DATE OF BIRTH ONLY if it is explicitly stated (e.g. "Date of Birth: 12/05/1988", "DOB:", "Born:"). Do NOT infer it from age, graduation year, or anything else.

CV TEXT:
${(cvText || "").slice(0, 4000)}

Respond ONLY with JSON, no markdown, no backticks: {"dob": "YYYY-MM-DD" or null}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()
  const text = data.content?.[0]?.text || "{}"
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    const dob = parsed?.dob
    if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const d = new Date(dob)
      const yr = d.getFullYear()
      const thisYear = new Date().getFullYear()
      if (!isNaN(d.getTime()) && yr >= 1925 && yr <= thisYear - 14) return dob
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({} as any))
  const afterId: string | null = body?.after_id || null
  const limit: number = Math.min(Math.max(Number(body?.limit) || 12, 1), 25)

  const supabase = getAdmin()

  let q = supabase
    .from("candidates")
    .select("id, cv_text")
    .not("cv_text", "is", null)
    .is("dob", null)
    .order("id", { ascending: true })
    .limit(limit)
  if (afterId) q = q.gt("id", afterId)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows?.length) {
    return NextResponse.json({ done: true, scanned: 0, updated: 0, last_id: afterId })
  }

  let updated = 0
  await Promise.all(
    rows.map(async (r: any) => {
      if (!r.cv_text || r.cv_text.trim().length < 30) return
      try {
        const dob = await extractDob(r.cv_text)
        if (dob) {
          const { error: uErr } = await supabase.from("candidates").update({ dob }).eq("id", r.id)
          if (!uErr) updated++
        }
      } catch {
        // skip this candidate on any error, keep the batch going
      }
    })
  )

  const last_id = rows[rows.length - 1].id
  return NextResponse.json({ done: rows.length < limit, scanned: rows.length, updated, last_id })
}
