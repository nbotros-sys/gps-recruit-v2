import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "GPS Talent <onboarding@resend.dev>"
const GPS_INTERNAL = process.env.GPS_INTERNAL_EMAIL || "nbotros@hotmail.com"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gps-recruit-v2.vercel.app"

function emailWrapper(badgeText: string, bodyHtml: string, footerNote: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">
        
        <!-- Header -->
        <tr><td style="background:#071f24;padding:28px 36px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="background:#028090;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:11px;font-weight:700;">GPS</span>
              </td>
              <td style="padding-left:10px;text-align:left;">
                <div style="color:white;font-size:15px;font-weight:700;letter-spacing:0.04em;">GPS Talent</div>
                <div style="color:rgba(168,213,209,0.7);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Your Trusted HR Partner</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px;">
          <div style="display:inline-block;background:rgba(2,128,144,0.1);color:#028090;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:99px;margin-bottom:16px;">${badgeText}</div>
          ${bodyHtml}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 36px 28px;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="font-size:12px;color:#aaa;line-height:1.7;margin:0;">${footerNote}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Email 1: Candidate applied to a specific role
export async function sendApplicationConfirmation({
  candidateName, candidateEmail, roleTitle, clientName, location, mandateId
}: {
  candidateName: string, candidateEmail: string, roleTitle: string,
  clientName?: string, location?: string, mandateId?: string
}) {
  const firstName = candidateName.split(" ")[0] || candidateName
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#071f24;margin:0 0 8px;">You're in the running, ${firstName}</h1>
    <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 24px;">We've received your application and a GPS consultant will review it as soon as possible.</p>
    
    <div style="background:#f5faf9;border:1px solid #d0e8e4;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:15px;font-weight:700;color:#071f24;margin-bottom:4px;">${roleTitle}</div>
      ${clientName ? `<div style="font-size:13px;color:#666;">${clientName}${location ? ` &nbsp;·&nbsp; ${location}` : ""}</div>` : ""}
    </div>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:#028090;margin-top:5px;margin-right:12px;float:left;"></div><p style="font-size:13px;color:#555;line-height:1.6;margin:0;">Your CV is now with a GPS consultant</p></td></tr>
      <tr><td style="padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:#028090;margin-top:5px;margin-right:12px;float:left;"></div><p style="font-size:13px;color:#555;line-height:1.6;margin:0;">If shortlisted, a consultant will be in touch directly</p></td></tr>
      <tr><td style="padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:#028090;margin-top:5px;margin-right:12px;float:left;"></div><p style="font-size:13px;color:#555;line-height:1.6;margin:0;">All applications are treated with complete confidentiality</p></td></tr>
    </table>

    <a href="${BASE_URL}/account" style="display:block;background:#028090;color:white;text-align:center;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:24px;">Track my application →</a>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;">
    <p style="font-size:13px;color:#888;margin:0;">Browse other open roles at <a href="${BASE_URL}/jobs" style="color:#028090;text-decoration:none;">${BASE_URL}/jobs</a></p>
  `

  return resend.emails.send({
    from: FROM,
    to: candidateEmail,
    subject: `Application received — ${roleTitle}`,
    html: emailWrapper("Application received", body, "GPS — Your Trusted HR Partner · Egypt<br>You received this because you applied via GPS Talent Network."),
  })
}

// Email 2: Candidate joined network (send-cv or internal import)
export async function sendNetworkWelcome({
  candidateName, candidateEmail
}: {
  candidateName: string, candidateEmail: string
}) {
  const firstName = candidateName.split(" ")[0] || candidateName
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#071f24;margin:0 0 8px;">Welcome to the GPS network, ${firstName}</h1>
    <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 24px;">Your CV has been added to the GPS Talent Network. Our consultants review profiles personally and will reach out when a suitable opportunity arises.</p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:#028090;margin-top:5px;margin-right:12px;float:left;"></div><p style="font-size:13px;color:#555;line-height:1.6;margin:0;">Your profile is now visible to GPS consultants</p></td></tr>
      <tr><td style="padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:#028090;margin-top:5px;margin-right:12px;float:left;"></div><p style="font-size:13px;color:#555;line-height:1.6;margin:0;">We'll match you to roles that fit your background and seniority</p></td></tr>
      <tr><td style="padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:#028090;margin-top:5px;margin-right:12px;float:left;"></div><p style="font-size:13px;color:#555;line-height:1.6;margin:0;">You can also browse and apply to open roles directly</p></td></tr>
    </table>

    <a href="${BASE_URL}/jobs" style="display:block;background:#028090;color:white;text-align:center;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:24px;">Browse open roles →</a>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;">
    <p style="font-size:13px;color:#888;margin:0;">Keep your profile current — <a href="${BASE_URL}/account/cv" style="color:#028090;text-decoration:none;">update your CV anytime</a></p>
  `

  return resend.emails.send({
    from: FROM,
    to: candidateEmail,
    subject: "Welcome to GPS Talent Network",
    html: emailWrapper("CV received", body, "GPS — Your Trusted HR Partner · Egypt<br>You received this because you submitted your CV via GPS Talent Network."),
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
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#071f24;margin:0 0 8px;">${candidateName} applied</h1>
    <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 24px;">A new application has been received via the public portal${aiScore ? ". AI scoring complete." : "."}</p>

    <div style="background:#f5faf9;border:1px solid #d0e8e4;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:14px;font-weight:700;color:#071f24;margin-bottom:12px;">Candidate details</div>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${candidateTitle || candidateCompany ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">Current role</td><td style="font-size:13px;color:#111;font-weight:500;text-align:right;padding:3px 0;">${candidateTitle || ""}${candidateCompany ? ` @ ${candidateCompany}` : ""}</td></tr>` : ""}
        <tr><td style="font-size:13px;color:#888;padding:3px 0;">Email</td><td style="font-size:13px;color:#028090;font-weight:500;text-align:right;padding:3px 0;">${candidateEmail}</td></tr>
        ${candidatePhone ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">Phone</td><td style="font-size:13px;color:#111;font-weight:500;text-align:right;padding:3px 0;">${candidatePhone}</td></tr>` : ""}
        ${candidateLocation ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">Location</td><td style="font-size:13px;color:#111;font-weight:500;text-align:right;padding:3px 0;">${candidateLocation}</td></tr>` : ""}
        ${aiScore ? `<tr><td style="font-size:13px;color:#888;padding:8px 0 3px;border-top:1px solid #e5e5e5;">AI match score</td><td style="text-align:right;padding:8px 0 3px;border-top:1px solid #e5e5e5;"><span style="background:#e6f5f3;color:#028090;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;">${aiScore} / 100</span></td></tr>` : ""}
        <tr><td style="font-size:13px;color:#888;padding:3px 0;">Applied for</td><td style="font-size:13px;color:#111;font-weight:500;text-align:right;padding:3px 0;">${roleTitle}${clientName ? ` · ${clientName}` : ""}</td></tr>
      </table>
    </div>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;">
    <p style="font-size:13px;color:#888;margin:0;">GPS RecruitAI · Do not reply to this email.</p>
  `

  return resend.emails.send({
    from: FROM,
    to: GPS_INTERNAL,
    subject: `New application: ${candidateName} → ${roleTitle}`,
    html: emailWrapper("New application", body, "GPS RecruitAI · Internal notification only."),
  })
}
