import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

export async function POST(req: NextRequest) {
  // Staff-only (defense in depth alongside middleware)
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: candidates, error: candError } = await supabase
    .from("candidates")
    .select("id, name, current_title, cv_text, notes")
    .limit(5)

  let claudeWorking = false
  let claudeError = ""
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 50,
        messages: [{ role: "user", content: "Say OK" }],
      }),
    })
    const data = await res.json()
    claudeWorking = !!data.content?.[0]?.text
    if (!claudeWorking) claudeError = JSON.stringify(data).slice(0, 200)
  } catch (e: any) { claudeError = e.message }

  let openaiWorking = false
  let openaiError = ""
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: "test" }),
    })
    const data = await res.json()
    openaiWorking = !!data.data?.[0]?.embedding
    if (!openaiWorking) openaiError = JSON.stringify(data).slice(0, 200)
  } catch (e: any) { openaiError = e.message }

  return NextResponse.json({
    candidates_found: candidates?.length || 0,
    candidate_error: candError?.message || null,
    first_candidate: candidates?.[0] ? { name: candidates[0].name, has_cv: !!candidates[0].cv_text, has_notes: !!candidates[0].notes } : null,
    claude_working: claudeWorking,
    claude_error: claudeError,
    openai_working: openaiWorking,
    openai_error: openaiError,
  })
}
