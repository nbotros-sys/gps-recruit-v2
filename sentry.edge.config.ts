import * as Sentry from "@sentry/nextjs"

// Edge runtime config is intentionally minimal — the edge runtime does not
// support Node.js APIs so we keep integrations to a bare minimum.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 20 % sample rate for edge middleware transactions
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  debug: false,
})
