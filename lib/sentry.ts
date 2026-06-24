import * as Sentry from "@sentry/nextjs"

/**
 * Call this at the top of any API route to attach the Supabase user email
 * to every Sentry event captured within that request lifecycle.
 *
 * Usage:
 *   import { setSentryUser } from "@/lib/sentry"
 *   setSentryUser(session?.user ?? null)
 */
export function setSentryUser(user: { id?: string; email?: string } | null) {
  if (user?.email) {
    Sentry.setUser({ id: user.id, email: user.email })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Wraps an async function in a Sentry performance span so you can see
 * exactly how long each sub-operation takes in the trace waterfall.
 *
 * Usage (e.g. inside /api/mandate-insight):
 *   const result = await withSpan("parseJD", () => parseJD(title, jd))
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan({ name, attributes }, fn)
}

/**
 * Captures an error with additional structured context.
 * Useful for non-fatal errors you want logged but not re-thrown.
 *
 * Usage:
 *   captureError(err, "enrich-from-linkedin", { candidateId: "abc123" })
 */
export function captureError(
  err: unknown,
  route: string,
  extra?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    scope.setTag("api_route", route)
    if (extra) scope.setExtras(extra)
    Sentry.captureException(err)
  })
}
