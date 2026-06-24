// instrumentation.ts — Next.js 14 instrumentation hook
// Loaded automatically by Next.js before any API route runs.
// This is where we init Sentry for the Node.js and Edge runtimes.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}
