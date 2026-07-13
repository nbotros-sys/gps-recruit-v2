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
