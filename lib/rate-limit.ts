import { createClient } from "@supabase/supabase-js"

// Serverless-safe rate limiter backed by Postgres (Supabase). No external
// service needed. Uses the atomic rate_limit_hit() SQL function so concurrent
// invocations on different serverless instances still share one counter.

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Returns true if the request is allowed, false if the caller is over the limit.
// Fails OPEN: if the limiter infra errors, we allow the request rather than
// break legitimate users.
export async function rateLimit(
  bucket: string,
  opts?: { windowSeconds?: number; limit?: number }
): Promise<boolean> {
  const windowSeconds = opts?.windowSeconds ?? 3600
  const limit = opts?.limit ?? 30
  try {
    const { data, error } = await admin().rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    })
    if (error) {
      console.error("rate_limit_hit error:", error.message)
      return true // fail open
    }
    return data === true
  } catch (e: any) {
    console.error("rate_limit exception:", e?.message || e)
    return true // fail open
  }
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: Request): string {
  const h = req.headers
  const xff = h.get("x-forwarded-for") || h.get("x-real-ip") || ""
  return (xff.split(",")[0] || "unknown").trim() || "unknown"
}
