/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "gps-recruit-v2.vercel.app",
        "localhost:3000",
      ],
    },
  },
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
  // Sentry's release/sourcemap upload step talks to Sentry's own API during build.
  // If Sentry's API is briefly down (e.g. a 502), that should never be allowed to
  // block a real deploy — error monitoring is not load-bearing for the platform.
  errorHandler: (error) => {
    console.warn("[Sentry build step failed — continuing deploy anyway]:", error)
  },
})
