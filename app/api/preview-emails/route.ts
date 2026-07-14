import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/require-staff"
import * as E from "@/lib/emails"

// Staff-only. GET /api/preview-emails?email=someone@example.com
// Sends one of every email type (sample data, subject prefixed [PREVIEW]) to the
// given address so a reviewer can see all templates. Recipients are overridden
// via setPreviewRecipient, so no real candidate/client is emailed.
export async function GET(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const email = req.nextUrl.searchParams.get("email")
  if (!email) return NextResponse.json({ error: "email query param required" }, { status: 400 })

  const BASE = "https://recruit.gps4hr.com"
  const cand = { candidateName: "Sample Candidate", candidateEmail: email, roleTitle: "Sales Director" }
  const client = { clientName: "Sample Client", clientEmail: email, roleTitle: "Sales Director", portalUrl: `${BASE}/client/portal` }
  const iv = { dateStr: "Monday, 21 July 2026", time: "14:00", format: "Video call", location: "https://meet.google.com/sample-link", interviewer: "Mona Barsoum" }

  const results: string[] = []
  const run = async (name: string, fn: () => Promise<any>) => {
    try { await fn(); results.push(`ok: ${name}`) }
    catch (e: any) { results.push(`FAIL ${name}: ${e?.message || e}`) }
  }

  E.setPreviewRecipient(email)
  try {
    await run("Application received (has account)", () => E.sendApplicationConfirmation({ ...cand, hasAccount: true }))
    await run("Application received (claim / no account)", () => E.sendApplicationConfirmation({ ...cand, candidateId: "00000000-0000-0000-0000-000000000000", hasAccount: false }))
    await run("Welcome to network", () => E.sendNetworkWelcome(cand))
    await run("Candidate shortlisted", () => E.sendCandidateShortlisted(cand))
    await run("Candidate not selected", () => E.sendCandidateNotSelected(cand))
    await run("Candidate placed", () => E.sendCandidatePlaced(cand))
    await run("Candidate interview invite", () => E.sendCandidateInterviewInvite({ ...cand, ...iv }))
    await run("Candidate interview reminder", () => E.sendCandidateInterviewReminder({ ...cand, ...iv }))
    await run("Client — new candidate ready", () => E.sendClientNewCandidate(client))
    await run("Client — interview confirmed", () => E.sendClientInterviewConfirmed({ ...client, candidateName: "Sample Candidate", ...iv }))
    await run("Client — role filled", () => E.sendClientRoleFilled(client))
    await run("Internal — new application alert", () => E.sendInternalAlert({ candidateName: "Sample Candidate", candidateEmail: email, roleTitle: "Sales Director", aiScore: 87, candidateTitle: "Sales Manager", candidateCompany: "Acme Corp", candidateLocation: "Cairo, Egypt", candidatePhone: "+20 100 000 0000" }))
    await run("Internal — client feedback alert", () => E.sendStaffFeedbackAlert({ candidateName: "Sample Candidate", mandateTitle: "Sales Director", sentiment: "positive", feedbackText: "Strong candidate — would like to interview.", link: "/internal/clients" }))
    await run("Internal — interview requested", () => E.sendStaffInterviewRequest({ candidateName: "Sample Candidate", mandateTitle: "Sales Director", preferredDates: "Mon–Wed next week", notes: "Prefers afternoons.", link: "/internal/clients" }))
    await run("Internal — interview follow-up", () => E.sendStaffInterviewFollowup({ candidateName: "Sample Candidate", mandateTitle: "Sales Director", dateStr: "20 Jul", link: `${BASE}/internal/clients` }))
    await run("Internal — system error alert", () => E.sendSystemErrorAlert({ context: "Talent pool scan", message: "This is a sample system-error alert.", detail: "HTTP 500: example detail line" }))
    await run("Internal — daily health check", () => E.sendSelfTestReport({ passed: 79, failed: 0, failures: [], totalPages: 33, totalEndpoints: 49, dynamicCount: 3 }))
  } finally {
    E.setPreviewRecipient(null)
  }

  const ok = results.filter(r => r.startsWith("ok")).length
  return NextResponse.json({ sent_to: email, sent: ok, total: results.length, results })
}
