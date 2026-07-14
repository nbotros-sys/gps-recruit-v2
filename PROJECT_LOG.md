# GPS RecruitAI — Project Log

Living log of decisions, work done, and what's still open. Maintained by Claude;
updated as we go. Newest session at the top.

---

## Current state (what's LIVE)

**Email system — complete (15 email types, all branded, all delivering).**
- Shared Outlook-safe branded template: `lib/email-layout.ts` (brand tokens: `gps`, `talnt`).
- Sender: `no-reply@gps4hr.com` (verified). Reply channel: none (no-reply) — by design; actions go through in-app buttons/landing pages (see Parked #2).
- Domain `gps4hr.com` verified in Resend. **DNS is managed in VERCEL** (nameservers → Vercel), NOT GoDaddy.

**Automated monitoring / testing.**
- Layer 1 (self-test): daily Vercel Cron `/api/cron/selftest` — pings every page+endpoint, checks DB + email domain, emails a report. Route inventory auto-generated at build (`scripts/gen-routes.mjs` → `lib/route-manifest.json`).
- Layer 2 (CI): GitHub Actions `.github/workflows/ci.yml` — typecheck build-gate + Playwright public journeys. Runs on push + daily; emails on failure. GREEN.

---

## Session — 14 Jul 2026 (email overhaul + testing)

### Shipped
- **Password reset** standardised on 6-digit **code flow** (staff + client; candidate already had it). Supabase "Magic link or OTP" template set to code-only, portal-neutral "GPS Recruitment" branding.
- **Batch 0** — shared branded template; migrated the 7 existing emails onto it. Fixed two real bugs: sandbox sender (`onboarding@resend.dev` → `no-reply@gps4hr.com`) and stale domain (`gps-recruit-v2.vercel.app` → `recruit.gps4hr.com`).
- **Claim-account flow** — anonymous applicants get a "set a password to track" email; signed 30-day token (`lib/claim-token.ts`), `/api/claim-account`, `/claim` page. Application-received email has two variants (log-in vs claim).
- **Batch 1** — staff "client left feedback" + "client requested interview" alerts (deep links); client "new candidate ready" (fires on shortlist); system-error alerts to admin (wired into talent-pool-scan + enrich-from-linkedin); **silent-error fix** (Resend returns `{error}` not a throw — now checked everywhere).
- **Batch 2** — interview emails on confirm (candidate invitation + client confirmation); added **`location`** field (DB column added to `client_interview_requests`).
- **Batch 3** — lifecycle: candidate shortlisted / not-selected / placed; client role-filled.
- **Batch 4** — Vercel Cron: candidate interview **reminder** (day before) + **follow-up** (day after, if not done) with auto-task. `vercel.json` crons.
- **Layer 1** self-test + **Layer 2** CI foundation (above).

### Incidents fixed
- **Emails weren't sending** — root cause: Resend domain `gps4hr.com` de-verified because its DNS records (DKIM `resend._domainkey`, SPF MX/TXT on `send`) were **deleted ~14h earlier when Google Workspace was set up**. Re-added those 3 records + DMARC in **Vercel DNS**; domain re-verified. Google Workspace + Resend coexist fine — do NOT clear the `send` / `resend._domainkey` records again.
- **Nothing was deploying** — every build from Batch 1 onward silently FAILED (TS strict error: `app?.stage` passed into `.includes()`). Local esbuild check catches syntax, not types. Fixed (`app?.stage || ""`); all batches then deployed.

---

## Decisions locked in
- **Reset flow:** 6-digit code (lowest maintenance, immune to Microsoft Safe Links token-burn).
- **Interviews:** stay consultant-mediated — clients/candidates *request* changes; staff make the edit. No direct self-editing.
- **Feedback:** model as **append multiple entries** (not edit-in-place); optional "edit your latest".
- **Portal self-service:** landing-page-from-button pattern (secure no-login link) for "Request a change", "Add feedback", catch-all "Message us" → saves to app + notifies staff. Keep no-reply sender; emails built button-ready. (Parked.)
- **Password-changed email:** use Supabase's built-in toggle, not custom code. (Parked.)
- **Testing:** aim for complete coverage of **every feature/flow** (not a subset), driven off the route inventory with a coverage-gap tracker. **Every code change ships with its test update.** Pragmatic (against live app) now; dedicated test DB after launch.
- **Feedback-reply email:** parked — no reply feature exists yet.

---

## Parked / to-do
1. **Layer 2 full-coverage testing** — test env (post-launch) + coverage tracker + Playwright journeys for every flow; tests kept in lockstep with code.
2. **Portal self-service** — landing-page buttons (request-change / add-feedback / message-us).
3. **Internal session-expiry auto-redirect** — on a 401 / expired session, bounce staff to `/internal/login` instead of a confusing "Unauthorised". (Root cause: internal layout has no `onAuthStateChange` listener; middleware only redirects on fresh requests.)
4. **Feedback add/edit** (+ recruiter reply).
5. **Password-changed** — enable Supabase toggle (Auth → Emails → Security).
6. **CV-ready email** — dormant until CV Builder relaunches (currently offline → Coming Soon).
7. **`CRON_SECRET`** — add in Vercel to lock the two cron endpoints (`/api/cron/*`).
8. **Supabase URL Configuration** — verify Site URL / redirects point at `recruit.gps4hr.com`, not the old vercel.app domain.
9. ~~Rotate Enrich Layer / Proxycurl API key~~ — ✅ DONE 14 Jul: regenerated (new key `dyc…`), old `FPiF…` replaced, LinkedIn sourcing verified working. (Optional: confirm old key gone on enrichlayer.)

---

## Layer 2 — setup needed (waiting on Nader)
Test logins (pragmatic / against live app; delete at launch):
- `test-staff@gps4hr.com` — staff; password set via admin key icon
- `test-client@gps4hr.com` — client
- `test-candidate@gps4hr.com` — candidate

GitHub secrets (repo → Settings → Secrets and variables → Actions):
- `TEST_STAFF_EMAIL`, `TEST_STAFF_PASSWORD`
- `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD`
- `TEST_CANDIDATE_EMAIL`, `TEST_CANDIDATE_PASSWORD`
- `TEST_INBOX_API_KEY` — MailSlurp (free). Note: errored in Safari (`MS_W01`); try Chrome or testmail.app / Mailosaur.

Also: **regenerate GitHub token with `workflow` scope** so Claude can push CI/workflow files directly (removes the manual file-add step).

When ready → Claude writes logged-in journeys (staff → candidate → client), then email-reading journeys once the test inbox works.

---

## Lessons / gotchas
- esbuild local check catches **syntax, not types** — rely on the CI typecheck / watch Vercel deploy status.
- DNS for `gps4hr.com` lives in **Vercel** (nameservers → Vercel), not GoDaddy.
- Resend SDK returns `{ error }` — it does **not** throw; always check it.
- Microsoft **Safe Links** opens email links in a headless browser and burns single-use tokens → never `verifyOtp` on page load; gate behind an explicit click, or use codes.
- **Google Workspace** DNS setup deleted the Resend records — keep `send` MX/TXT + `resend._domainkey` intact.
- Repo has **no committed `package-lock.json`** → use `npm install` (not `npm ci`) in CI.
- A **send-only Resend API key** can't list domains (the self-test domain check accounts for this).
