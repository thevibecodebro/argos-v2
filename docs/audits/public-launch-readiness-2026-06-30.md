# Public Launch Readiness Evidence - 2026-06-30

## Release Identity

- Release branch: `codex/public-launch-readiness`
- Launch worktree: `/Users/thevibecodebro/Projects/argos-v2/.worktrees/public-launch-readiness`
- Local HEAD SHA: `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`
- Origin main SHA: `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`
- Vercel production deployment URL: `https://argos-v2-kxt1dguvu-thevibecodebro.vercel.app`
- Vercel production deployment id: `dpl_FQebVEpGYW3pamqVG97kFkVghLmr`
- Vercel deployed Git SHA: `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`
- Production domain: `https://argosrevenuecommand.com`
- Worker app: `argos-v2-worker-jared`
- Final decision: `NO-GO`

## Gate Status

| Gate | Status | Evidence |
| --- | --- | --- |
| Release hygiene | PASS | Clean isolated worktree created from `origin/main`; `npm ci` exited 0. |
| Local verification | PASS | `verify:db`, `verify:web`, `verify:worker`, root `verify`, and high-severity production audit exited 0. |
| CI verification | PASS | Latest `main` Verify run `28272464443` succeeded on `d5fa9b3`; `Install`, `Verify`, and `Worker DB tests` jobs passed. |
| Supabase and database | FAIL | Local migration/typecheck passed, but hosted migration comparison is blocked because this worktree is not Supabase-linked; RLS, storage, and hosted Auth settings require manual/dashboard verification. |
| Vercel web runtime | DONE_WITH_CONCERNS | Vercel project/deployment are correct and live SHA matches `origin/main`; env names were verified by name only and some README-listed names are missing from Production. |
| Auth, invite-only, tenant boundary | DONE_WITH_CONCERNS | Auth/invite/platform tests passed via root verification; controlled production invite, non-invited account, and platform staff journeys were not executed. |
| Billing and Stripe | FAIL | Billing tests and live Stripe products/prices passed, but live Stripe webhook endpoint points to the Vercel app URL instead of `https://argosrevenuecommand.com/api/webhooks/stripe`. |
| Zoom and GoHighLevel | DONE_WITH_CONCERNS | Focused tests passed and invalid production webhooks reject bad requests; provider dashboard checks and token-rotation dry-run against hosted rows remain incomplete. |
| Worker, OpenAI, and media processing | DONE_WITH_CONCERNS | Worker tests and Fly health checks passed; direct local DNS resolution for the Fly hostname failed, and hosted call-processing/AI smokes still require controlled production accounts. |
| Security, privacy, and legal | PASS | Security/legal tests passed via root verification; live public pages returned 200 and public HTML had no HIPAA/SOC 2/certified/compliant claims. |
| Observability and support | DONE_WITH_CONCERNS | Vercel production error logs returned no recent errors; Fly health checks pass, but `flyctl logs --no-tail` hung and was stopped. |
| Live smoke tests | DONE_WITH_CONCERNS | Safe unauthenticated smoke checks passed; authenticated journeys, invite acceptance, checkout completion, call processing, and AI smokes still require controlled production accounts. |

## Evidence Log

### Release Hygiene

- `git fetch origin` exited 0.
- `git worktree add .worktrees/public-launch-readiness origin/main -b codex/public-launch-readiness` exited 0.
- `git status --short --branch` in the launch worktree returned `## codex/public-launch-readiness...origin/main` with no file changes.
- `git rev-parse HEAD` returned `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`.
- `git rev-parse origin/main` returned `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`.
- `npm ci` exited 0 and did not modify `package-lock.json`.
- `npm ci` reported 6 moderate advisories. The launch dependency gate will use `npm audit --omit=dev --audit-level=high`.

### Local Verification

- `npm run verify:db` exited 0.
- `npm run verify:web` exited 0.
  - Web typecheck passed.
  - Web test suite passed: 164 test files, 977 tests.
  - Web production build passed and emitted `/`, `/login`, `/api/health`, legal pages, SEO routes, billing routes, platform routes, and authenticated app routes.
  - Build emitted a non-fatal warning that `@supabase/supabase-js` uses `process.version` in the Edge Runtime import trace through `lib/supabase/middleware.ts`.
- `npm run verify:worker` exited 0.
  - Worker typecheck passed.
  - Worker tests passed: 12 test files passed, 1 skipped; 44 tests passed, 13 skipped.
  - DB-backed worker tests were skipped where no local DB was provided.
- `npm run verify` exited 0.
  - Root gate reran DB typecheck, web typecheck/test/build, and worker typecheck/test successfully.
- `npm audit --omit=dev --audit-level=high` exited 0.
  - Audit still reports a moderate `postcss <8.5.10` advisory through Next's nested dependency.
  - npm suggests `npm audit fix --force`, but that would install `next@9.3.3`, a breaking downgrade from Next 15. This is not a high/critical blocker under the configured gate.

### CI Verification

- `gh run list --workflow Verify --branch main --limit 5` found latest `main` Verify run `28272464443`.
- `gh run view 28272464443 --json status,conclusion,headSha,workflowName,jobs,event,createdAt,updatedAt` showed:
  - status: `completed`
  - conclusion: `success`
  - head SHA: `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`
  - successful jobs: `Install`, `Verify`, and `Worker DB tests`
- `gh pr list --state open --head codex/public-launch-readiness` returned no open PR. If launch proceeds directly from `main`, owner approval must be recorded outside GitHub PR review.

### Supabase And Database

- `rg --files supabase/migrations` found 37 SQL migration files.
- `npm run verify:db` exited 0.
- `npx supabase migration list --linked` failed with `Cannot find project ref. Have you run supabase link?`
- The launch worktree is not linked to a hosted Supabase project, so hosted migration comparison is incomplete.
- RLS checks, storage bucket exposure checks, and hosted Auth rollout settings still require Supabase dashboard or a properly linked/authenticated CLI connection.

### Auth, Invite-Only, Tenant Boundary, And Platform Staff

- Root `npm run verify` covered and passed the relevant auth, invite, tenant-boundary, platform staff, MFA, session, effective-request, audit coverage, and schema smoke tests.
- Live unauthenticated billing checkout preserved the `next` parameter when redirecting to login.
- Login page copy scan found no public signup or create-organization invitation text while invite-only launch posture is expected.
- Not executed in this pass:
  - Controlled production invite acceptance.
  - Non-invited production account organization-creation block through all enabled providers.
  - Platform staff authenticated flow and MFA-gated surfaces.
  - Cross-tenant access checks with real production accounts.

### Vercel Web Runtime

- `vercel project inspect argos-v2` confirmed:
  - project: `argos-v2`
  - root directory: `apps/web`
  - framework preset: `Next.js`
  - Node.js version: `24.x`
- `vercel inspect https://argosrevenuecommand.com` confirmed:
  - production deployment id: `dpl_FQebVEpGYW3pamqVG97kFkVghLmr`
  - status: `Ready`
  - deployment URL: `https://argos-v2-kxt1dguvu-thevibecodebro.vercel.app`
  - aliases include `https://argosrevenuecommand.com` and `https://www.argosrevenuecommand.com`
- `vercel list argos-v2 --environment production --status READY --meta githubCommitSha=d5fa9b3fb83befc022821ae74b38fd5b42f7d633` confirmed the production deployment matches `origin/main` and launch worktree `HEAD`.
- `vercel env ls` from the launch worktree failed because the worktree is not Vercel-linked. The same command from the root checkout succeeded by name only.
- Production env names verified present by name:
  - `APP_ENV`, `SUPABASE_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, `OPENAI_ENVIRONMENT`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`
  - `ARGOS_ALLOWED_ORIGINS`, `ARGOS_INVITE_ONLY`, `ARGOS_BOOTSTRAP_ADMIN_EMAILS`, `ARGOS_TOKEN_ENCRYPTION_KEY`, `ARGOS_RATE_LIMIT_HASH_SECRET`
  - `RESEND_API_KEY`, `ARGOS_FEEDBACK_TO`, `ARGOS_FEEDBACK_FROM`, `ARGOS_ONBOARDING_FROM`
  - `ARGOS_GHL_ENABLED`
  - `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI`, `ARGOS_WEBHOOK_URL`, `ZOOM_WEBHOOK_SECRET_TOKEN`
  - `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_REDIRECT_URI`, `GHL_WEBHOOK_TOKEN`
  - `OPENAI_API_KEY`, `OPENAI_TRAINING_MODEL`
- README-listed Production env names not found by name in Vercel Production:
  - `SUPABASE_URL`
  - `ARGOS_ONBOARDING_URL`
  - `GHL_IMPORT_ENABLED`
  - `GHL_IMPORT_POLL_INTERVAL_MS`
  - `GHL_SYNC_INTERVAL_MS`
  - `GHL_SYNC_POLL_INTERVAL_MS`
  - `OPENAI_CALL_SCORING_MODEL`
- Vercel env values are encrypted, so this audit verifies names/scopes only, not secret values or literal runtime identity values.

### Billing And Stripe

- Focused billing tests passed: 7 files, 42 tests.
- Live Stripe products exist:
  - `Argos Solo`
  - `Argos Team`
  - `Argos Extra Voice Minutes`
- Live Stripe prices exist and are active:
  - `argos_solo_monthly`: `$79/mo`
  - `argos_solo_annual`: `$853.20/yr`
  - `argos_paid_seat_monthly`: `$50/seat/mo`
  - `argos_paid_seat_annual`: `$540/seat/yr`
  - `argos_extra_minutes_250`: `$125`
  - `argos_extra_minutes_500`: `$175`
  - `argos_extra_minutes_2000`: `$600`
- Live Stripe webhook endpoint exists with required events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Blocker: live Stripe webhook endpoint URL is `https://argos-v2-thevibecodebro.vercel.app/api/webhooks/stripe`, not `https://argosrevenuecommand.com/api/webhooks/stripe`.
- No live purchase or checkout completion was attempted.

### Zoom, GoHighLevel, And Token Encryption

- Focused web integration tests passed: 9 files, 38 tests.
- Focused worker GHL tests passed: 3 files, 8 passed, 3 skipped.
- Invalid production webhook probes returned safe failures:
  - Stripe invalid webhook request: `400`
  - Zoom invalid webhook request: `401`
  - LeadConnector invalid webhook request: `401`
- `/settings/integrations` production probe redirected unauthenticated users to `/login?next=%2Fsettings%2Fintegrations`, then login returned 200.
- `npm run rotate:integration-tokens -w @argos-v2/web` was inspected and attempted without `--apply`.
  - Dry-run exited 1 because this shell lacked `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - Hosted token encryption row state remains unverified.
- Provider dashboard checks still required:
  - Zoom OAuth redirect equals production `ZOOM_REDIRECT_URI`.
  - Zoom recording webhook endpoint equals production `ARGOS_WEBHOOK_URL`.
  - Zoom webhook secret matches hosted env.
  - GHL launch posture is decided and verified as either disabled or fully connected through Marketplace OAuth, webhook queueing, and worker handoff.

### Worker, OpenAI, And Media Processing

- `flyctl status --app argos-v2-worker-jared` confirmed the app is deployed with one started machine.
- `flyctl checks list --app argos-v2-worker-jared` reported the worker `health` check passing.
- `flyctl machine status 2872e44c0e0058 --app argos-v2-worker-jared` confirmed the machine health state.
- `flyctl secrets list --app argos-v2-worker-jared` verified required worker secret names are present, including:
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `OPENAI_CALL_PROCESSING_API_KEY`
  - `OPENAI_CALL_SCORING_MODEL`
  - `OPENAI_CALL_TRANSCRIPTION_MODEL`
  - `CALL_PROCESSING_ENABLED`
  - `CALL_PROCESSING_MAX_SOURCE_BYTES`
  - `CALL_PROCESSING_POLL_INTERVAL_MS`
  - `CALL_PROCESSING_TRANSCRIBE_CONCURRENCY`
  - runtime identity/env names
  - GHL client secrets
- `curl -sS https://argos-v2-worker-jared.fly.dev/health` failed locally with DNS resolution error. The checklist allows Fly status/check evidence when local DNS cannot resolve.
- Hosted call-processing, roleplay, and training AI smoke tests still require controlled production accounts and were not executed in this pass.

### Security, Privacy, And Legal

- Root `npm run verify` covered and passed the relevant security/legal tests, including security headers, legal pages, request body limits, trusted origins, rate limiting, and platform audit coverage.
- Live public pages returned HTTP 200:
  - `https://argosrevenuecommand.com/`
  - `https://argosrevenuecommand.com/login`
  - `https://argosrevenuecommand.com/privacy-policy`
  - `https://argosrevenuecommand.com/terms-of-service`
  - `https://argosrevenuecommand.com/security-policy`
- Headers observed on public/legal pages included:
  - `strict-transport-security`
  - `x-content-type-options: nosniff`
  - `x-frame-options: DENY`
  - `referrer-policy: strict-origin-when-cross-origin`
  - `permissions-policy`
- Live public HTML snapshots for homepage, privacy policy, terms, and security policy were scanned for `HIPAA`, `SOC 2`, `SOC2`, `certified`, and `compliant`; no matches were found.
- Secret values were not printed or saved in this evidence packet.

### Observability And Support

- `vercel logs --environment production --since 30m --level error --limit 50 --no-branch --json` exited 0 and returned no error entries.
- `flyctl logs --app argos-v2-worker-jared --no-tail` did not return promptly and was stopped. Fly provider health checks remain passing from the worker gate.
- Support-route env names verified present by name in Vercel Production:
  - `ARGOS_FEEDBACK_TO`
  - `ARGOS_FEEDBACK_FROM`
  - `ARGOS_ONBOARDING_FROM`
  - `RESEND_API_KEY`
- Actual inbox monitoring, Resend domain verification, and launch-week alert ownership require owner/provider confirmation.

### Live Smoke Tests

- `curl -sS https://argosrevenuecommand.com/api/health` returned:
  - `{"ok":true,"service":"@argos-v2/web","timestamp":"2026-06-30T15:02:42.652Z"}`
- `curl -sSI https://argosrevenuecommand.com/` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/login` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/privacy-policy` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/terms-of-service` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/security-policy` returned HTTP 200.
- `curl -sSI "https://argosrevenuecommand.com/billing/checkout?plan=team&seats=3"` returned HTTP 307 with `location: https://argosrevenuecommand.com/login?next=%2Fbilling%2Fcheckout%3Fplan%3Dteam%26seats%3D3`.
- Login page copy scan:
  - `rg -i "sign up|signup|create account|create an account|join as|create organization" /tmp/argos-login.html` returned no matches.
- SEO/crawler routes:
  - `robots.txt` returned 200 and disallows authenticated application paths including `/calls`, `/dashboard`, `/invite`, `/onboarding`, `/roleplay`, `/settings`, `/team`, `/training`, and `/upload`.
  - `sitemap.xml` returned 200 and includes only `/`, `/privacy-policy`, `/terms-of-service`, and `/security-policy`.
  - `llms.txt` returned 200 and lists only public canonical URLs and public policy pages.
- Not executed in this pass:
  - Invite acceptance with a controlled production user.
  - Non-invited account organization-creation block through all enabled providers.
  - Platform staff authenticated flow.
  - Live checkout completion and entitlement update.
  - Zoom connect/signed webhook.
  - GHL connect/webhook/import queue/worker handoff.
  - Hosted call-processing smoke.
  - Roleplay/training AI smoke.

## Accepted Risks

- None recorded.

## Blockers

- Hosted Supabase migration comparison, RLS checks, storage bucket checks, and Auth signup/provider settings are not verified.
- Live Stripe webhook endpoint points at `https://argos-v2-thevibecodebro.vercel.app/api/webhooks/stripe` instead of `https://argosrevenuecommand.com/api/webhooks/stripe`.
- Token encryption dry-run against hosted rows could not run from this shell because required Supabase env values were unavailable.
- Zoom and GoHighLevel provider-dashboard checks require manual/provider access and controlled live events.
- Authenticated production user journeys, invite acceptance, live checkout completion, call processing, roleplay, and training AI smoke tests have not been executed with controlled production accounts.

## Final Decision

NO-GO for public launch on 2026-06-30.

Reasons:

1. Hosted Supabase production state is not fully verified.
2. Live Stripe webhook endpoint is pointed at the old Vercel app URL instead of the public production domain.
3. Token encryption hosted-row dry-run did not complete.
4. Provider dashboard checks and controlled authenticated production smoke tests remain incomplete.
