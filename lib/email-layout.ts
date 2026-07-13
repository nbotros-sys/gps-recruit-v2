// Shared, Outlook-safe branded email layout for all GPS RecruitAI emails.
// One base template, themed by `brand`. Callers pass content into slots so
// every email across the three portals looks identical.
//
// Outlook-safe rules followed here: XHTML transitional doctype, flat nested
// tables, Arial, inline styles, no border-radius, no flexbox, no web fonts.

export type Brand = "gps" | "talnt"

const TEAL = "#028090"
const INK = "#0a1f24"
const LOGO = "https://recruit.gps4hr.com/gps-logo-full.png"

const BRANDS: Record<Brand, { label: string; region: string; from: string; defaultFooter: string }> = {
  gps: {
    label: "GPS Recruitment",
    region: "Egypt &middot; MENA",
    from: "GPS Recruitment <no-reply@gps4hr.com>",
    defaultFooter: "GPS Recruitment &middot; Your Trusted HR Partner",
  },
  talnt: {
    label: "GPS Talent Network",
    region: "Egypt &middot; MENA",
    from: "GPS Talent Network <no-reply@gps4hr.com>",
    defaultFooter: "GPS Talent Network &middot; Powered by GPS Recruitment",
  },
}

// Use this for the Resend `from` field so sender name matches the brand.
export function brandFrom(brand: Brand): string {
  return BRANDS[brand].from
}

export interface EmailLayoutOptions {
  brand: Brand
  preheader?: string   // hidden inbox-preview line
  badge?: string       // small uppercase label above the heading
  heading: string
  bodyHtml: string     // main content (already-escaped HTML)
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string  // overrides the default brand footer line
}

export function emailLayout(o: EmailLayoutOptions): string {
  const b = BRANDS[o.brand]
  const footer = o.footerNote || b.defaultFooter

  const preheader = o.preheader
    ? `<div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;mso-hide:all;">${o.preheader}</div>`
    : ""

  const badge = o.badge
    ? `<div style="display:inline-block;background-color:#e6f2f2;color:${TEAL};font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;">${o.badge}</div>`
    : ""

  const cta = o.ctaLabel && o.ctaUrl
    ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 4px;"><tr><td align="center">
    <a href="${o.ctaUrl}" style="display:inline-block;background-color:${TEAL};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:15px 40px;border:0;">${o.ctaLabel} &#8594;</a>
  </td></tr></table>`
    : ""

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${b.label}</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f3;">
${preheader}
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f4f3;">
<tr><td align="center" style="padding:44px 20px;">

<table border="0" cellpadding="0" cellspacing="0" width="560">
<tr><td align="center" style="padding-bottom:22px;"><img src="${LOGO}" alt="${b.label}" width="150" style="display:block;border:0;" /></td></tr>
</table>

<table border="0" cellpadding="0" cellspacing="0" width="560" style="background-color:#ffffff;border:1px solid #e0e0e0;">
<tr><td height="4" style="background-color:${TEAL};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:38px 44px 34px;font-family:Arial,Helvetica,sans-serif;">
  ${badge}
  <h1 style="font-size:22px;font-weight:bold;color:${INK};margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;">${o.heading}</h1>
  ${o.bodyHtml}
  ${cta}
</td></tr>
<tr><td style="background-color:#f8fafa;border-top:1px solid #f0f0f0;padding:18px 44px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">${footer}</td>
<td align="right" style="font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">${b.region}</td>
</tr></table>
</td></tr>
</table>

</td></tr>
</table>
</body></html>`
}

// Reusable content helpers so bodies stay consistent across emails.

// A boxed fact panel (e.g. role details, candidate details, credentials).
export function infoPanel(rowsHtml: string, titleHtml?: string): string {
  const title = titleHtml
    ? `<div style="font-size:14px;font-weight:bold;color:#0a1f24;margin:0 0 10px 0;font-family:Arial,sans-serif;">${titleHtml}</div>`
    : ""
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5faf9;border:1px solid #d0e8e4;margin:0 0 24px 0;"><tr><td style="padding:16px 20px;">${title}${rowsHtml}</td></tr></table>`
}

// A single "label : value" row for use inside infoPanel.
export function infoRow(label: string, value: string): string {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="font-size:13px;color:#888;padding:3px 0;font-family:Arial,sans-serif;">${label}</td><td align="right" style="font-size:13px;color:#111;font-weight:bold;padding:3px 0;font-family:Arial,sans-serif;">${value}</td></tr></table>`
}

// A standard body paragraph.
export function para(text: string): string {
  return `<p style="font-size:14px;color:#5b6b6a;line-height:1.7;margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;">${text}</p>`
}
