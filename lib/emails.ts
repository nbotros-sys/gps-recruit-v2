import { emailLayout, brandFrom, infoPanel, infoRow, para } from "./email-layout"
import { signClaimToken } from "./claim-token"
import { Resend } from "resend"

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }
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

  return getResend().emails.send({
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

  return getResend().emails.send({
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

  return getResend().emails.send({
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
  return getResend().emails.send({
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
  return getResend().emails.send({
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
  return getResend().emails.send({
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
  return getResend().emails.send({
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
