import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — capture 10 % of transactions in production
  // and 100 % in dev/staging so you can test traces immediately
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay: capture 10 % of sessions, 100 % of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Don't spam logs in development
  debug: false,

  integrations: [
    Sentry.replayIntegration({
      // Block passwords / sensitive fields from being recorded
      maskAllInputs: true,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Ignore noisy browser errors that are unactionable
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Network request failed$/,
    /^Load failed$/,
  ],
})
