/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } },
}

const { withSentryConfig } = require("@sentry/nextjs")

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: false,
  autoInstrumentServerFunctions: true,
  automaticVercelMonitors: false,
})
// cache bust: 1781698584
