import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendCandidateInterviewReminder, sendStaffInterviewFollowup } from "@/lib/emails"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"
const ymd = (d: Date) => d.toISOString().split("T")[0]

// Daily cron (see vercel.json). Sends interview reminders for tomorrow and
// creates a follow-up task + admin email for interviews that were yesterday and
// aren't marked done. Exact-date matching means each fires exactly once.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }
  }

  const admin = getAdmin()
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)

  const resolve = async (ir: any) => {
    let candidateName = "Candidate", candidateEmail = ""
    if (ir.application_id) {
      const { data: app } = await admin.from("applications").select("candidate_id").eq("id", ir.application_id).maybeSingle()
      if (app?.candidate_id) {
        const { data: c } = await admin.from("candidates").select("name, email").eq("id", app.candidate_id).maybeSingle()
        if (c) { candidateName = c.name || candidateName; candidateEmail = c.email || "" }
      }
    }
    const { data: m } = await admin.from("mandates").select("title").eq("id", ir.mandate_id).maybeSingle()
    return { candidateName, candidateEmail, roleTitle: m?.title || "the role" }
  }

  // Reminders — interviews scheduled for tomorrow, not yet done
  const { data: dueTomorrow } = await admin.from("client_interview_requests")
    .select("id, confirmed_date, confirmed_time, format, interviewer, location, application_id, mandate_id, status")
    .eq("confirmed_date", ymd(tomorrow)).neq("status", "done")
  let reminders = 0
  for (const ir of dueTomorrow || []) {
    const { candidateName, candidateEmail, roleTitle } = await resolve(ir)
    if (!candidateEmail) continue
    const dateStr = new Date(ir.confirmed_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    try {
      await sendCandidateInterviewReminder({ candidateName, candidateEmail, roleTitle, dateStr, time: ir.confirmed_time, format: ir.format, location: ir.location, interviewer: ir.interviewer })
      reminders++
    } catch (e) { console.error("interview reminder failed:", e) }
  }

  // Follow-ups — interviews that were yesterday and aren't done
  const { data: pastYesterday } = await admin.from("client_interview_requests")
    .select("id, confirmed_date, application_id, mandate_id, client_user_id, status")
    .eq("confirmed_date", ymd(yesterday)).neq("status", "done")
  let followups = 0
  for (const ir of pastYesterday || []) {
    const { candidateName, roleTitle } = await resolve(ir)
    const link = `/internal/clients?client=${ir.client_user_id}&tab=interviews`
    const dateStr = new Date(ir.confirmed_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    try {
      await admin.from("tasks").insert([{
        title: `Follow up on interview — ${candidateName}`,
        description: `The interview for ${roleTitle} was on ${dateStr}. Confirm the outcome and update its status.`,
        link, link_label: roleTitle, auto_generated: true,
      }])
    } catch (e) { console.error("follow-up task insert failed:", e) }
    try {
      await sendStaffInterviewFollowup({ candidateName, mandateTitle: roleTitle, dateStr, link: `${BASE_URL}${link}` })
      followups++
    } catch (e) { console.error("follow-up email failed:", e) }
  }

  return NextResponse.json({ success: true, reminders, followups })
}
