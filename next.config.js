/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } },
}

const { withSentryConfig } = require("@sentry/nextjs")

module.exports = withSentryConfig(nextConfig, {
  // ── Source maps ──────────────────────────────────────────────────────────
  // Upload source maps to Sentry on every Vercel build so errors show
  // readable code instead of minified output.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silences the Sentry CLI output during builds (set to false when debugging)
  silent: true,

  // Hides Sentry source maps from the client bundle (uploaded, not served)
  hideSourceMaps: true,

  // Only upload .next/static files — keeps upload times fast
  widenClientFileUpload: false,

  // Route Sentry traffic through your own domain to avoid ad blockers.
  // Creates a /monitoring proxy route on your Next.js app automatically.
  tunnelRoute: "/monitoring",

  // Auto-instrument API routes for performance spans
  autoInstrumentServerFunctions: true,

  // Disable Vercel Cron monitoring (not used in this project)
  automaticVercelMonitors: false,
})
// cache bust: 1781698584
