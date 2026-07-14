import { emailLayout, brandFrom, infoPanel, infoRow, para } from "./email-layout"
import { signClaimToken } from "./claim-token"
import { Resend } from "resend"

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

// Wraps Resend send so an API-level rejection (invalid address, unverified
// domain, rate limit) throws instead of being silently swallowed.
async function send(opts: any) {
  const { data, error } = await getResend().emails.send(opts)
  if (error) throw new Error((error as any)?.message || JSON.stringify(error))
  return data
}
const GPS_INTERNAL = process.env.GPS_INTERNAL_EMAIL || "nbotros@hotmail.com"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

// Email 1: Candidate applied to a specific role
export async function sendApplicationConfirmation({
  candidateName, candidateEmail, roleTitle, clientName, location, mandateId, candidateId, hasAccount
}: {
  candidateName: string, candidateEmail: string, roleTitle: string,
  clientName?: string, location?: string, mandateId?: string,
  candidateId?: string, hasAccount?: boolean
}) {
  const firstName = candidateName.split(" ")[0] || candidateName
  const rows = infoRow("Role", roleTitle)
    + (clientName ? infoRow("Employer", clientName) : "")
    + (location ? infoRow("Location", location) : "")

  const canClaim = !hasAccount && !!candidateId
  const claimUrl = canClaim
    ? `${BASE_URL}/claim?token=${encodeURIComponent(signClaimToken(candidateId as string, candidateEmail))}`
    : ""

  const body =
    para(`We've received your application and a GPS consultant will review it as soon as possible.`)
    + infoPanel(rows, "Your application")
    + para(canClaim
        ? `Set a password to create your account, then you can track this application anytime.`
        : `You can track its progress anytime from your account.`)

  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: `Application received — ${roleTitle}`,
    html: emailLayout({
      brand: "talnt",
      preheader: `We received your application for ${roleTitle}`,
      badge: "Application received",
      heading: `You're in the running, ${firstName}`,
      bodyHtml: body,
      ctaLabel: canClaim ? "Set a password to track" : "Log in to track",
      ctaUrl: canClaim ? claimUrl : `${BASE_URL}/account`,
      footerNote: "You received this because you applied via GPS Talent Network.",
    }),
  })
}

// Email 2: Candidate joined the network (send-cv or internal import)
export async function sendNetworkWelcome({
  candidateName, candidateEmail
}: {
  candidateName: string, candidateEmail: string
}) {
  const firstName = candidateName.split(" ")[0] || candidateName
  const body =
    para(`Your CV has been added to the GPS Talent Network. Our consultants review profiles personally and will reach out when a suitable opportunity arises. A copy is kept in our database and matched against future roles.`)
    + para(`You can also browse and apply to open roles directly.`)

  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: "Welcome to GPS Talent Network",
    html: emailLayout({
      brand: "talnt",
      preheader: "Your CV has been added to the GPS Talent Network",
      badge: "CV received",
      heading: `Welcome to the GPS network, ${firstName}`,
      bodyHtml: body,
      ctaLabel: "Browse open roles",
      ctaUrl: `${BASE_URL}/jobs`,
      footerNote: "You received this because you submitted your CV via GPS Talent Network.",
    }),
  })
}

// Email 3: Internal GPS alert — new public portal application
export async function sendInternalAlert({
  candidateName, candidateEmail, candidatePhone, candidateTitle, candidateCompany,
  candidateLocation, aiScore, roleTitle, clientName
}: {
  candidateName: string, candidateEmail: string, candidatePhone?: string,
  candidateTitle?: string, candidateCompany?: string, candidateLocation?: string,
  aiScore?: number, roleTitle: string, clientName?: string
}) {
  const rows =
    ((candidateTitle || candidateCompany)
      ? infoRow("Current role", `${candidateTitle || ""}${candidateCompany ? ` @ ${candidateCompany}` : ""}`) : "")
    + infoRow("Email", candidateEmail)
    + (candidatePhone ? infoRow("Phone", candidatePhone) : "")
    + (candidateLocation ? infoRow("Location", candidateLocation) : "")
    + (aiScore ? infoRow("AI match score", `${aiScore} / 100`) : "")
    + infoRow("Applied for", `${roleTitle}${clientName ? ` · ${clientName}` : ""}`)
  const body =
    para(`A new application has been received via the public portal${aiScore ? ". AI scoring is complete." : "."}`)
    + infoPanel(rows, "Candidate details")

  return send({
    from: brandFrom("gps"),
    to: GPS_INTERNAL,
    subject: `New application: ${candidateName} → ${roleTitle}`,
    html: emailLayout({
      brand: "gps",
      preheader: `${candidateName} applied for ${roleTitle}`,
      badge: "New application",
      heading: `${candidateName} applied`,
      bodyHtml: body,
      ctaLabel: "Open in GPS RecruitAI",
      ctaUrl: `${BASE_URL}/internal/dashboard`,
      footerNote: "GPS RecruitAI · Internal notification only.",
    }),
  })
}

// Email 4: Internal — client left feedback on a candidate
export async function sendStaffFeedbackAlert({
  candidateName, mandateTitle, sentiment, feedbackText, link
}: {
  candidateName: string, mandateTitle: string, sentiment?: string, feedbackText?: string, link?: string
}) {
  const rows = infoRow("Candidate", candidateName) + infoRow("Mandate", mandateTitle)
    + (sentiment ? infoRow("Sentiment", sentiment) : "")
  const quote = feedbackText
    ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-left:3px solid #028090;margin:0 0 22px 0;"><tr><td style="padding:2px 0 2px 16px;font-size:13px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">${feedbackText}</td></tr></table>`
    : ""
  return send({
    from: brandFrom("gps"),
    to: GPS_INTERNAL,
    subject: `Client feedback: ${candidateName} — ${mandateTitle}`,
    html: emailLayout({
      brand: "gps",
      preheader: `New client feedback on ${candidateName}`,
      badge: "Client feedback",
      heading: "New feedback from your client",
      bodyHtml: para("A client has left feedback on a candidate in their portal.") + infoPanel(rows, "Details") + quote,
      ctaLabel: link ? "View feedback" : undefined,
      ctaUrl: link ? `${BASE_URL}${link}` : undefined,
      footerNote: "GPS RecruitAI · Internal notification only.",
    }),
  })
}

// Email 5: Internal — client requested an interview
export async function sendStaffInterviewRequest({
  candidateName, mandateTitle, preferredDates, notes, link
}: {
  candidateName: string, mandateTitle: string, preferredDates?: string, notes?: string, link?: string
}) {
  const rows = infoRow("Candidate", candidateName) + infoRow("Mandate", mandateTitle)
    + (preferredDates ? infoRow("Preferred dates", preferredDates) : "")
  const noteBlock = notes
    ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-left:3px solid #028090;margin:0 0 22px 0;"><tr><td style="padding:2px 0 2px 16px;font-size:13px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">${notes}</td></tr></table>`
    : ""
  return send({
    from: brandFrom("gps"),
    to: GPS_INTERNAL,
    subject: `Interview requested: ${candidateName} — ${mandateTitle}`,
    html: emailLayout({
      brand: "gps",
      preheader: `${candidateName} — interview requested`,
      badge: "Interview requested",
      heading: "A client requested an interview",
      bodyHtml: para("A client has requested an interview with a candidate. A scheduling task has been created automatically.") + infoPanel(rows, "Details") + noteBlock,
      ctaLabel: link ? "Open request" : undefined,
      ctaUrl: link ? `${BASE_URL}${link}` : undefined,
      footerNote: "GPS RecruitAI · Internal notification only.",
    }),
  })
}

// Email 6: Internal — system error alert (admin only)
export async function sendSystemErrorAlert({
  context, message, detail
}: {
  context: string, message: string, detail?: string
}) {
  const detailBlock = detail
    ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fef2f2;border:1px solid #fecaca;margin:0 0 22px 0;"><tr><td style="padding:14px 18px;font-size:12px;color:#991b1b;line-height:1.6;font-family:'Courier New',monospace;">${detail}</td></tr></table>`
    : ""
  return send({
    from: brandFrom("gps"),
    to: GPS_INTERNAL,
    subject: `System error: ${context}`,
    html: emailLayout({
      brand: "gps",
      preheader: `System error in ${context}`,
      badge: "System error",
      heading: "Something failed in the app",
      bodyHtml: para(message) + infoPanel(infoRow("Where", context), "Context") + detailBlock,
      footerNote: "GPS RecruitAI · Automated system alert.",
    }),
  })
}

// Email 7: Client — a new candidate has been shortlisted for their role
export async function sendClientNewCandidate({
  clientName, clientEmail, roleTitle, portalUrl
}: {
  clientName?: string, clientEmail: string, roleTitle: string, portalUrl: string
}) {
  const first = (clientName || "").split(" ")[0] || "there"
  return send({
    from: brandFrom("gps"),
    to: clientEmail,
    subject: `New candidate ready to review — ${roleTitle}`,
    html: emailLayout({
      brand: "gps",
      preheader: `A new candidate is ready to review for ${roleTitle}`,
      badge: "New candidate",
      heading: `Hi ${first},`,
      bodyHtml: para("A new candidate has been shortlisted for your role and is ready to review in your portal. You can view their profile, leave feedback, or request an interview.")
        + infoPanel(infoRow("Role", roleTitle), "For your review"),
      ctaLabel: "Review candidate",
      ctaUrl: portalUrl,
    }),
  })
}

// Email 8: Candidate — interview scheduled (invitation)
export async function sendCandidateInterviewInvite({
  candidateName, candidateEmail, roleTitle, dateStr, time, format, location, interviewer
}: {
  candidateName: string, candidateEmail: string, roleTitle: string,
  dateStr?: string, time?: string, format?: string, location?: string, interviewer?: string
}) {
  const firstName = candidateName.split(" ")[0] || candidateName
  const locVal = location
    ? (/^https?:\/\//i.test(location) ? `<a href="${location}" style="color:#028090;text-decoration:none;">${location}</a>` : location)
    : ""
  const rows = (dateStr ? infoRow("Date", dateStr) : "")
    + (time ? infoRow("Time", time) : "")
    + (format ? infoRow("Format", format) : "")
    + (locVal ? infoRow("Location / link", locVal) : "")
    + (interviewer ? infoRow("Interviewer", interviewer) : "")
  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: `Interview scheduled — ${roleTitle}`,
    html: emailLayout({
      brand: "talnt",
      preheader: `Your interview for ${roleTitle} has been scheduled`,
      badge: "Interview scheduled",
      heading: `Good news, ${firstName} — you have an interview`,
      bodyHtml: para(`An interview has been scheduled for your application to <strong>${roleTitle}</strong>. Here are the details:`)
        + infoPanel(rows, "Interview details")
        + para("If you need to reschedule, just reply to your GPS consultant."),
      footerNote: "You received this because you applied via GPS Talent Network.",
    }),
  })
}

// Email 9: Client — interview confirmed
export async function sendClientInterviewConfirmed({
  clientName, clientEmail, candidateName, roleTitle, dateStr, time, format, location, interviewer, portalUrl
}: {
  clientName?: string, clientEmail: string, candidateName: string, roleTitle: string,
  dateStr?: string, time?: string, format?: string, location?: string, interviewer?: string, portalUrl?: string
}) {
  const first = (clientName || "").split(" ")[0] || "there"
  const locVal = location
    ? (/^https?:\/\//i.test(location) ? `<a href="${location}" style="color:#028090;text-decoration:none;">${location}</a>` : location)
    : ""
  const rows = infoRow("Candidate", candidateName)
    + infoRow("Role", roleTitle)
    + (dateStr ? infoRow("Date", dateStr) : "")
    + (time ? infoRow("Time", time) : "")
    + (format ? infoRow("Format", format) : "")
    + (locVal ? infoRow("Location / link", locVal) : "")
    + (interviewer ? infoRow("Interviewer", interviewer) : "")
  return send({
    from: brandFrom("gps"),
    to: clientEmail,
    subject: `Interview confirmed — ${candidateName} (${roleTitle})`,
    html: emailLayout({
      brand: "gps",
      preheader: `Interview confirmed with ${candidateName}`,
      badge: "Interview confirmed",
      heading: `Hi ${first}, the interview is confirmed`,
      bodyHtml: para(`The interview with <strong>${candidateName}</strong> for <strong>${roleTitle}</strong> is now confirmed.`)
        + infoPanel(rows, "Interview details"),
      ctaLabel: portalUrl ? "View in your portal" : undefined,
      ctaUrl: portalUrl,
    }),
  })
}

// Email 10: Candidate — shortlisted / progressing
export async function sendCandidateShortlisted({
  candidateName, candidateEmail, roleTitle
}: { candidateName: string, candidateEmail: string, roleTitle: string }) {
  const firstName = candidateName.split(" ")[0] || candidateName
  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: `Your application is progressing — ${roleTitle}`,
    html: emailLayout({
      brand: "talnt",
      preheader: `Good news about your application for ${roleTitle}`,
      badge: "Application update",
      heading: `Good news, ${firstName}`,
      bodyHtml: para(`Your application for <strong>${roleTitle}</strong> is progressing — you've been shortlisted for the role. A GPS consultant may be in touch with next steps.`)
        + para(`There's nothing you need to do right now — we'll keep you posted.`),
      footerNote: "You received this because you applied via GPS Talent Network.",
    }),
  })
}

// Email 11: Candidate — not selected
export async function sendCandidateNotSelected({
  candidateName, candidateEmail, roleTitle
}: { candidateName: string, candidateEmail: string, roleTitle: string }) {
  const firstName = candidateName.split(" ")[0] || candidateName
  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: `Update on your application — ${roleTitle}`,
    html: emailLayout({
      brand: "talnt",
      preheader: `An update on your application for ${roleTitle}`,
      badge: "Application update",
      heading: `Thank you, ${firstName}`,
      bodyHtml: para(`Thank you for your interest in <strong>${roleTitle}</strong>. After careful consideration, we won't be moving forward with your application for this particular role.`)
        + para(`This isn't a reflection of your abilities — the fit for this specific role just wasn't right. We'll keep your profile on file and match it against future opportunities, and we'd genuinely encourage you to keep an eye on our open roles.`),
      ctaLabel: "Browse open roles",
      ctaUrl: `${BASE_URL}/jobs`,
      footerNote: "You received this because you applied via GPS Talent Network.",
    }),
  })
}

// Email 12: Candidate — placed
export async function sendCandidatePlaced({
  candidateName, candidateEmail, roleTitle
}: { candidateName: string, candidateEmail: string, roleTitle: string }) {
  const firstName = candidateName.split(" ")[0] || candidateName
  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: `Congratulations — ${roleTitle}`,
    html: emailLayout({
      brand: "talnt",
      preheader: `Congratulations on your placement`,
      badge: "Congratulations",
      heading: `Congratulations, ${firstName}!`,
      bodyHtml: para(`We're delighted to let you know you've been placed in the <strong>${roleTitle}</strong> role. Your GPS consultant will be in touch with the next steps and details.`)
        + para(`Congratulations again — it's been a pleasure working with you.`),
      footerNote: "You received this because you applied via GPS Talent Network.",
    }),
  })
}

// Email 13: Client — role filled
export async function sendClientRoleFilled({
  clientName, clientEmail, roleTitle, portalUrl
}: { clientName?: string, clientEmail: string, roleTitle: string, portalUrl?: string }) {
  const first = (clientName || "").split(" ")[0] || "there"
  return send({
    from: brandFrom("gps"),
    to: clientEmail,
    subject: `Role filled — ${roleTitle}`,
    html: emailLayout({
      brand: "gps",
      preheader: `${roleTitle} has been filled`,
      badge: "Role filled",
      heading: `Hi ${first}, your role has been filled`,
      bodyHtml: para(`Great news — the <strong>${roleTitle}</strong> role has now been filled. Thank you for partnering with GPS Recruitment on this search.`)
        + para(`Your consultant will follow up with the final details.`),
      ctaLabel: portalUrl ? "View in your portal" : undefined,
      ctaUrl: portalUrl,
    }),
  })
}

// Email 14: Candidate — interview reminder (day before)
export async function sendCandidateInterviewReminder({
  candidateName, candidateEmail, roleTitle, dateStr, time, format, location, interviewer
}: {
  candidateName: string, candidateEmail: string, roleTitle: string,
  dateStr?: string, time?: string, format?: string, location?: string, interviewer?: string
}) {
  const firstName = candidateName.split(" ")[0] || candidateName
  const locVal = location
    ? (/^https?:\/\//i.test(location) ? `<a href="${location}" style="color:#028090;text-decoration:none;">${location}</a>` : location)
    : ""
  const rows = (dateStr ? infoRow("Date", dateStr) : "")
    + (time ? infoRow("Time", time) : "")
    + (format ? infoRow("Format", format) : "")
    + (locVal ? infoRow("Location / link", locVal) : "")
    + (interviewer ? infoRow("Interviewer", interviewer) : "")
  return send({
    from: brandFrom("talnt"),
    to: candidateEmail,
    subject: `Reminder: your interview is tomorrow — ${roleTitle}`,
    html: emailLayout({
      brand: "talnt",
      preheader: `Your interview for ${roleTitle} is tomorrow`,
      badge: "Interview reminder",
      heading: `Reminder, ${firstName} — your interview is tomorrow`,
      bodyHtml: para(`A quick reminder about your interview for <strong>${roleTitle}</strong>:`)
        + infoPanel(rows, "Interview details")
        + para(`Good luck! If you need to reschedule, contact your GPS consultant.`),
      footerNote: "You received this because you applied via GPS Talent Network.",
    }),
  })
}

// Email 15: Internal — interview follow-up needed (day after, not marked done)
export async function sendStaffInterviewFollowup({
  candidateName, mandateTitle, dateStr, link
}: { candidateName: string, mandateTitle: string, dateStr?: string, link?: string }) {
  return send({
    from: brandFrom("gps"),
    to: GPS_INTERNAL,
    subject: `Interview follow-up needed — ${candidateName}`,
    html: emailLayout({
      brand: "gps",
      preheader: `Follow up on the interview with ${candidateName}`,
      badge: "Interview follow-up",
      heading: "An interview needs a follow-up",
      bodyHtml: para(`The interview with <strong>${candidateName}</strong> for <strong>${mandateTitle}</strong>${dateStr ? ` on ${dateStr}` : ""} has passed and hasn't been marked done. Please confirm the outcome and update its status — a task has been created for you.`),
      ctaLabel: link ? "Open interview" : undefined,
      ctaUrl: link,
      footerNote: "GPS RecruitAI · Internal notification only.",
    }),
  })
}

// Email 16: Internal — daily self-test / health report
export async function sendSelfTestReport({
  passed, failed, failures, totalPages, totalEndpoints, dynamicCount
}: {
  passed: number, failed: number,
  failures: { name: string, detail: string }[],
  totalPages: number, totalEndpoints: number, dynamicCount: number
}) {
  const allGood = failed === 0
  const failBlock = failures.length
    ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fef2f2;border:1px solid #fecaca;margin:0 0 22px 0;"><tr><td style="padding:14px 18px;font-family:Arial,sans-serif;">`
      + failures.map(f => `<div style="font-size:13px;color:#991b1b;line-height:1.6;margin:0 0 6px 0;"><strong>${f.name}</strong> — ${f.detail}</div>`).join("")
      + `</td></tr></table>`
    : ""
  const summary = infoPanel(
    infoRow("Checks passed", String(passed))
    + infoRow("Checks failed", String(failed))
    + infoRow("Pages checked", String(totalPages))
    + infoRow("Endpoints checked", String(totalEndpoints))
    + infoRow("Dynamic routes (not pinged)", String(dynamicCount)),
    "Summary")
  return send({
    from: brandFrom("gps"),
    to: GPS_INTERNAL,
    subject: allGood ? `Health check: all ${passed} checks passed` : `Health check: ${failed} failing`,
    html: emailLayout({
      brand: "gps",
      preheader: allGood ? "All systems healthy" : `${failed} check(s) failing`,
      badge: allGood ? "All clear" : "Attention needed",
      heading: allGood ? "Daily health check — all clear" : "Daily health check — attention needed",
      bodyHtml: (allGood
        ? para("Every page and endpoint responded, and the database and email domain are healthy.")
        : para("The daily check found issues that need a look:") + failBlock)
        + summary,
      footerNote: "GPS RecruitAI · Automated daily health check.",
    }),
  })
}
