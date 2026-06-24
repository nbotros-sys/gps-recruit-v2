import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture all server-side transactions — API routes are the real value here
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  debug: false,

  // Add Node.js-specific integrations for deeper context
  integrations: [
    // Automatically instruments http/https calls so you can trace
    // outbound fetch calls (e.g. Anthropic API, Enrich Layer) as child spans
    Sentry.httpIntegration({ breadcrumbs: true }),
  ],
})
