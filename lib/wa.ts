import { createClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS. The webhook is called by Twilio (no user
// session), so it must use the master key to read candidates + write messages.
export function waAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Normalise a raw WhatsApp/phone string to best-effort E.164 (+20... for Egypt).
// Handles: "whatsapp:+201...", "+20 01...", "01113845024", "201113845024".
export function normalisePhone(raw: string): string {
  if (!raw) return ""
  let s = raw.replace(/^whatsapp:/i, "").trim()
  let digits = s.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("20")) {
    let rest = digits.slice(2)
    if (rest.startsWith("0")) rest = rest.slice(1) // malformed "+20 01..."
    return "+20" + rest
  }
  if (digits.startsWith("0")) return "+20" + digits.slice(1) // local "01..."
  if (digits.length === 10 && digits.startsWith("1")) return "+20" + digits
  return "+" + digits
}

// Twilio needs the "whatsapp:+E164" form on the From/To fields.
export function toWhatsApp(e164: string): string {
  return e164.startsWith("whatsapp:") ? e164 : "whatsapp:" + e164
}

// Fuzzy-match an incoming number to a candidate by the last 9 significant digits.
// Returns the candidate id only when exactly one candidate matches (never guess
// on an ambiguous match — leave it "unknown" for a human to link).
export async function matchCandidate(
  admin: ReturnType<typeof waAdmin>,
  e164: string
): Promise<string | null> {
  const tail = e164.replace(/\D/g, "").slice(-9)
  if (tail.length < 8) return null
  const { data, error } = await admin
    .from("candidates")
    .select("id")
    .not("phone", "is", null)
    .ilike("phone", `%${tail}%`)
    .limit(2)
  if (error || !data || data.length !== 1) return null
  return data[0].id
}

// Find-or-create the conversation row for a phone number, matching a candidate
// on first sight. Returns the conversation row.
export async function getOrCreateConversation(
  admin: ReturnType<typeof waAdmin>,
  e164: string,
  profileName?: string
) {
  const existing = await admin
    .from("wa_conversations")
    .select("*")
    .eq("phone", e164)
    .maybeSingle()
  if (existing.data) return existing.data

  const candidateId = await matchCandidate(admin, e164)
  const insert = await admin
    .from("wa_conversations")
    .insert({
      phone: e164,
      candidate_id: candidateId,
      wa_profile_name: profileName || null,
    })
    .select("*")
    .single()
  return insert.data
}
