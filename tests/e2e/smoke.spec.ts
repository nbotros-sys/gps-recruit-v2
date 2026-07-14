import { test, expect } from "@playwright/test"

// Public journeys — no login, no data changes, no emails. Safe against production.
// The logged-in and email journeys (which need a test account + test inbox) come next.

test("public jobs board loads", async ({ page }) => {
  const res = await page.goto("/jobs")
  expect(res, "no response from /jobs").toBeTruthy()
  expect(res!.status()).toBeLessThan(400)
})

test("staff login shows a password field", async ({ page }) => {
  await page.goto("/internal/login")
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test("client login shows a password field", async ({ page }) => {
  await page.goto("/client/login")
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test("candidate login shows a password field", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test("claim page rejects an invalid token", async ({ page }) => {
  await page.goto("/claim?token=invalid-token")
  await expect(page.getByText(/invalid|expired/i).first()).toBeVisible()
})

test("internal area redirects anonymous users to login", async ({ page }) => {
  await page.goto("/internal/dashboard")
  await expect(page).toHaveURL(/\/internal\/login/)
})
