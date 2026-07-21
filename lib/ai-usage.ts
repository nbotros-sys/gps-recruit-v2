import { createClient as createAdminClient } from "@supabase/supabase-js"

// AI model pricing in USD per 1,000,000 tokens.
// Update here if Anthropic / OpenAI change their rates. Historical rows keep the
// cost that was computed at insert time, so changing this only affects future calls.
export const AI_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
}

export function computeCost(model: string, inTok: number, outTok: number): number {
  const p = AI_PRICING[model] || { input: 0, output: 0 }
  return (inTok / 1_000_000) * p.input + (outTok / 1_000_000) * p.output
}

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

type Usage =
  | { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; total_tokens?: number }
  | null
  | undefined

// Fire-and-forget usage logger. NEVER throws — if anything fails, the calling
// AI route continues untouched. Do not await the result in a way that blocks.
export async function recordUsage(
  provider: string,
  model: string,
  operation: string,
  usage: Usage,
  opts: { candidateId?: string | null; mandateId?: string | null; meta?: any } = {}
): Promise<void> {
  try {
    if (!usage) return
    const inTok = Number((usage as any).input_tokens ?? (usage as any).prompt_tokens ?? 0) || 0
    const outTok = Number((usage as any).output_tokens ?? 0) || 0
    if (inTok === 0 && outTok === 0) return
    const cost = computeCost(model, inTok, outTok)
    const admin = getAdmin()
    await admin.from("ai_usage").insert([
      {
        provider,
        model,
        operation,
        input_tokens: inTok,
        output_tokens: outTok,
        total_tokens: inTok + outTok,
        cost_usd: cost,
        candidate_id: opts.candidateId || null,
        mandate_id: opts.mandateId || null,
        meta: opts.meta || null,
      },
    ])
  } catch {
    // swallow — usage logging must never break an AI request
  }
}
