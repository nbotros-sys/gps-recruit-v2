import { defineConfig, devices } from "@playwright/test"

// Layer 2 end-to-end tests. Runs in CI (GitHub Actions) against the live site
// for now (pragmatic); will point at a dedicated test environment post-launch.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://recruit.gps4hr.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
