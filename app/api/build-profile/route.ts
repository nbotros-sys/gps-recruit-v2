import { NextRequest, NextResponse } from "next/server"

function toArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val.trim()) return val.split(",").map((s: string) => s.trim()).filter(Boolean)
  return []
}

export async function POST(req: NextRequest) {
  try {
    const { cv_text, filename } = await req.json()
    if (!cv_text?.trim()) {
      return NextResponse.json({ error: "No CV text" }, { status: 400 })
    }

    const prompt = `You are a senior executive search consultant with deep expertise in Egyptian and MENA markets. Read this CV carefully and extract rich, specific intelligence about this person.

CV TEXT:
${cv_text.slice(0, 4000)}

Your tags must be SPECIFIC and MEANINGFUL — not generic labels. Read what they actually did, what systems/tools they used, what industries they worked in, what they are genuinely expert at. Think like a recruiter who needs to find this person again in 6 months for a very specific role.

BAD tags: "Finance", "Senior", "Manager", "Experienced"
GOOD tags: "Egyptian Labour Law", "Multi-entity Payroll", "SAP SuccessFactors", "FMCG Finance", "Central Bank Reporting", "Arabic Native", "IPO Experience", "Series B CFO", "Organisational Restructuring"

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "name": "<full name>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "current_title": "<actual current or most recent job title — be precise>",
  "current_company": "<current or most recent employer>",
  "location": "<city, country>",
  "years_experience": <integer total years of professional experience>,
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
  "industry": "<primary industry they have worked in>"
}`

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

    return NextResponse.json({
      name: parsed.name || filename?.replace(/\.[^.]+$/, "") || "Unknown",
      email: parsed.email || null,
      phone: parsed.phone || null,
      current_title: parsed.current_title || null,
      current_company: parsed.current_company || null,
      location: parsed.location || null,
      years_experience: parsed.years_experience || null,
      summary: parsed.summary || "",
      tags: toArray(parsed.tags),
      function: parsed.function || null,
      seniority: parsed.seniority || null,
      industry: parsed.industry || null,
    })
  } catch (err) {
    console.error("Build profile error:", err)
    return NextResponse.json({ error: "Failed to build profile" }, { status: 500 })
  }
}
