// Shared CV-reading logic used by both the staff build-profile route and the
// public candidate registration route. Runs server-side only (uses the Anthropic
// API key), so it is never exposed directly to anonymous callers.

const cleanFilename = (filename?: string): string => {
  return (filename || "")
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\b(cv|scv|resume|final|updated|copy|beginner|new|draft|doc|docx|pdf)\b/gi, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const toArray = (val: any): string[] => {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return val.split(",").map((s: string) => s.trim()).filter(Boolean)
  return []
}

export type BuiltProfile = {
  name: string
  email: string | null
  phone: string | null
  current_title: string | null
  current_company: string | null
  location: string | null
  years_experience: number | null
  dob: string | null
  summary: string
  tags: string[]
  function: string | null
  seniority: string | null
  industry: string | null
  is_cv: boolean
}

// Reads a CV and returns structured profile intelligence. Never throws — on any
// failure it returns a minimal profile so callers (e.g. registration) can proceed.
export async function buildProfileFromCV(cv_text: string, filename?: string): Promise<BuiltProfile> {
  const fallback: BuiltProfile = {
    name: cleanFilename(filename) || "Unknown",
    email: null, phone: null, current_title: null, current_company: null,
    location: null, years_experience: null, dob: null, summary: "",
    tags: [], function: null, seniority: null, industry: null, is_cv: true,
  }

  if (!cv_text?.trim()) return fallback

  const prompt = `You are a senior executive search consultant with deep expertise in Egyptian and MENA markets. Read this CV carefully and extract rich, specific intelligence about this person.

CV TEXT:
${cv_text.slice(0, 4000)}

Your tags must be SPECIFIC and MEANINGFUL — not generic labels. Read what they actually did, what systems/tools they used, what industries they worked in, what they are genuinely expert at. Think like a recruiter who needs to find this person again in 6 months for a very specific role.

BAD tags: "Finance", "Senior", "Manager", "Experienced"
GOOD tags: "Egyptian Labour Law", "Multi-entity Payroll", "SAP SuccessFactors", "FMCG Finance", "Central Bank Reporting", "Arabic Native", "IPO Experience", "Series B CFO", "Organisational Restructuring"

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "name": "<the CANDIDATE's own full name exactly as it appears as the subject of this CV. IMPORTANT: this text may contain document metadata recovered from an old file — do NOT use a name that comes from file/author properties, template or 'last saved by' fields, company names, 'Microsoft Office Word', smarttags, or similar. Only return a name you are confident is the candidate's. If the text is garbled or no clear candidate name is present, return null>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "current_title": "<actual current or most recent job title — be precise>",
  "current_company": "<current or most recent employer>",
  "location": "<city, country>",
  "years_experience": <integer total years of professional experience>,
  "dob": "<date of birth as YYYY-MM-DD ONLY if the CV explicitly states a date of birth, otherwise null>",
  "summary": "<3-4 sentences: what this person genuinely specialises in, their most notable achievements with specifics, what type and level of role they are suited for, and anything distinctive about their background>",
  "tags": [
    "<specific technical skill or tool they actually used e.g. SAP HR, Oracle Payroll, Dynamics 365>",
    "<specific domain expertise from their actual experience e.g. Egyptian Social Insurance, Transfer Pricing, Lean Manufacturing>",
    "<industry they worked in with specifics e.g. Egyptian Banking Sector, Gulf FMCG, Cairo Real Estate>",
    "<seniority level with context e.g. C-Suite Executive, Department Head, Individual Contributor>",
    "<notable achievement tag e.g. Led 500-person HR Transformation, Managed EGP 2bn P&L>",
    "<language proficiency e.g. Arabic Native, Business English, French Conversational>",
    "<education distinction if notable e.g. AUC Graduate, CPA Certified, MBA Finance>"
  ],
  "function": "<primary function: Finance | HR | Sales | Marketing | Operations | Technology | Legal | Supply Chain | General Management | Other>",
  "seniority": "<Junior | Mid | Senior | Manager | Director | VP | C-Level>",
  "industry": "<primary industry they have worked in>",
  "is_cv": <true ONLY if this is a usable professional CV from which real EMPLOYMENT or EDUCATION content can actually be read (e.g. work history, job roles/titles, education, or concrete professional skills). Return false if the text is garbled/corrupted, is mostly document metadata (font names, XML, 'Microsoft Office Word', smarttags), OR contains almost no professional/employment information even when a name is present (e.g. only personal details like marital status, nationality, or hobbies such as swimming/karate). When in doubt, prefer false.>
}`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return {
      name: parsed.name || cleanFilename(filename) || "Unknown",
      email: parsed.email || null,
      phone: parsed.phone || null,
      current_title: parsed.current_title || null,
      current_company: parsed.current_company || null,
      location: parsed.location || null,
      years_experience: parsed.years_experience || null,
      dob: parsed.dob || null,
      summary: parsed.summary || "",
      tags: toArray(parsed.tags),
      function: parsed.function || null,
      seniority: parsed.seniority || null,
      industry: parsed.industry || null,
      is_cv: parsed.is_cv !== false,
    }
  } catch (err) {
    console.error("buildProfileFromCV error:", err)
    return fallback
  }
}
