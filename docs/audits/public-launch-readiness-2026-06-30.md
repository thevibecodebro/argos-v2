# Public Launch Readiness Evidence - 2026-06-30

## Release Identity

- Release branch: `codex/public-launch-readiness`
- Launch worktree: `/Users/thevibecodebro/Projects/argos-v2/.worktrees/public-launch-readiness`
- Remediation branch HEAD before final commit: `e50f8132d5cd0427ea1ce6a5b07dec3e6bde453a`
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
| Release hygiene | PASS | Isolated launch worktree is on `codex/public-launch-readiness`; `npm ci` exited 0 after remediation. |
| Local verification | PASS | `npm run verify` and `npm audit --omit=dev --audit-level=high` exited 0 after remediation. |
| CI verification | PASS | Latest `main` Verify run `28272464443` succeeded on `d5fa9b3`; `Install`, `Verify`, and `Worker DB tests` jobs passed. |
| Supabase and database | DONE_WITH_CONCERNS | Production schema reconciliation applied and verified; direct migration-history rows now exist for reconciled local versions. Hosted Auth dashboard settings still need owner verification, and `migration list` still displays known remote-only May history artifacts. |
| Vercel web runtime | DONE_WITH_CONCERNS | Vercel project/deployment are correct and live SHA matches `origin/main`; `ARGOS_GHL_ENABLED=false` is now set for Production. Sensitive env values cannot be read by this shell. |
| Auth, invite-only, tenant boundary | DONE_WITH_CONCERNS | Auth/invite/platform tests passed via root verification; controlled production invite, non-invited account, and platform staff journeys were not executed. |
| Billing and Stripe | PASS | Live Stripe webhook endpoint `we_1TWeTUHQQsl005RT6Jtqmqz9` now points to `https://argosrevenuecommand.com/api/webhooks/stripe`; required events unchanged. |
| Zoom and GoHighLevel | DONE_WITH_CONCERNS | GHL is disabled in Vercel Production and the remediation branch now gates public GHL webhooks when GHL is not configured; provider dashboard checks and token-rotation dry-run against hosted rows remain incomplete because sensitive values/dashboard access are unavailable here. |
| Worker, OpenAI, and media processing | DONE_WITH_CONCERNS | Worker tests and Fly health checks passed; direct local DNS resolution for the Fly hostname failed, and hosted call-processing/AI smokes still require controlled production accounts. |
| Security, privacy, and legal | PASS | Security/legal tests passed via root verification; live public pages returned 200 and public HTML had no HIPAA/SOC 2/certified/compliant claims. |
| Observability and support | DONE_WITH_CONCERNS | Vercel production error logs returned no recent errors; Fly health checks pass, but `flyctl logs --no-tail` hung and was stopped. |
| Live smoke tests | DONE_WITH_CONCERNS | Safe unauthenticated smoke checks passed; authenticated journeys, invite acceptance, checkout completion, call processing, and AI smokes still require controlled production accounts. |

## Remediation Update

Applied on 2026-06-30 after the initial evidence pass:

- Renamed duplicate local migration `202606180001_workspace_theme.sql` to `202606300001_workspace_theme.sql`.
- Added `202606300002_launch_schema_reconciliation.sql` for verified launch schema gaps.
- Applied the reconciliation SQL explicitly to linked production Supabase project `mlluqkmmcfqjmjqoparf`; did not run blind `supabase db push`.
- Repaired migration history only for verified/reconciled local versions:
  - `20260508012329`, `202605110001`, `202605110002`, `202605110003`
  - `202606110001`, `202606230001`, `202606230002`, `202606230004`, `202606230005`
  - `202606240001`, `202606240002`, `202606240003`
  - `20260626041647`, `20260626070500`, `202606300001`, `202606300002`
- Updated live Stripe webhook endpoint `we_1TWeTUHQQsl005RT6Jtqmqz9` to `https://argosrevenuecommand.com/api/webhooks/stripe`.
- Updated Vercel Production `ARGOS_GHL_ENABLED` to `false`.
- Verified Fly worker has no `GHL_IMPORT_ENABLED` secret, so the worker default remains false.
- Added a GHL webhook route guard so both `/api/webhooks/ghl` and `/api/webhooks/leadconnector/[token]` reject before processing when `ARGOS_GHL_ENABLED` is not enabled with credentials.
- Added focused tests for disabled GHL webhook ingress.

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
  - Web test suite passed after remediation: 164 test files, 979 tests.
  - Web production build passed and emitted `/`, `/login`, `/api/health`, legal pages, SEO routes, billing routes, platform routes, and authenticated app routes.
  - Build emitted a non-fatal warning that `@supabase/supabase-js` uses `process.version` in the Edge Runtime import trace through `lib/supabase/middleware.ts`.
- `npm run verify:worker` exited 0.
  - Worker typecheck passed.
  - Worker tests passed: 12 test files passed, 1 skipped; 44 tests passed, 13 skipped.
  - DB-backed worker tests were skipped where no local DB was provided.
- `npm run verify` exited 0 after the review fix.
  - Root gate reran DB typecheck, web typecheck/test/build, and worker typecheck/test successfully.
- After the review fix, `npm run test -w @argos-v2/web -- lib/ghl-webhook-route.test.ts` exited 0: 1 file, 7 tests.
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

- `find supabase/migrations -maxdepth 1 -name '*.sql'` found 38 SQL migration files after remediation.
- `npm run verify:db` exited 0.
- The launch worktree was given ignored Supabase `.temp` link metadata copied from the root checkout for project `mlluqkmmcfqjmjqoparf`.
- `npx supabase migration list --linked` connected to production and exposed local/remote history drift before repair.
- Production preflight before applying reconciliation:
  - invalid GHL user mappings: `0`
  - duplicate `ghl_integrations.location_id`: `0`
  - duplicate `zoom_integrations.zoom_account_id`: `0`
  - unexpected `ghl_call_imports.skipped_reason`: `0`
- `npx supabase db query --linked --file supabase/migrations/202606300002_launch_schema_reconciliation.sql` exited 0.
- Post-apply verification returned `ok=true` for:
  - `organizations.workspace_theme`
  - platform tables: `platform_staff`, `platform_access_sessions`, `platform_audit_events`
  - `training_progress`
  - functions: `current_user_can_assign_training_progress`, `current_user_can_update_training_progress`, `current_user_can_read_training_progress`
  - composite FK: `ghl_user_mappings_argos_user_org_id_users_id_org_id_fkey`
  - uniqueness constraints: `ghl_integrations_location_id_unique`, `zoom_integrations_account_id_unique`
  - skipped-reason check containing `billing_inactive`, `invalid_recording_filename`, and `unauthorized_after_refresh`
  - policies: `training_progress_can_read_team_scope`, `training_progress_can_write_team_scope`, `training_progress_can_update_team_scope`, `calls_can_read_team_scope`, `roleplay_sessions_can_write_team_scope`, `roleplay_sessions_can_update_team_scope`
- Older local-only schema represented in production was also verified:
  - `org-assets` bucket exists, public, `2097152` byte limit, allowed mime types `{image/png,image/jpeg,image/webp}`
  - billing tables exist: `billing_customers`, `billing_subscriptions`, `stripe_webhook_events`
  - voice entitlement tables/columns exist
  - `audit_events` exists
  - organization archive columns exist
  - `call_processing_jobs_manual_source_storage_path_uq` unique partial index exists
- `npx supabase migration repair --linked --status applied ...` exited 0 for the verified/reconciled local migration versions listed in the remediation update.
- Direct `supabase_migrations.schema_migrations` query now shows expected history rows for all verified/reconciled local versions through `202606300002_launch_schema_reconciliation`.
- `pg_class.relrowsecurity` returned `true` for every table whose policies were reconciled: `call_annotations`, `call_moments`, `calls`, `roleplay_sessions`, and `training_progress`.
- `npx supabase migration list --linked` still renders June local rows split from matching remote rows because remote-only May 12 history artifacts remain. Direct history rows and object-level schema checks show no unreconciled local-only schema remains.
- The remaining remote-only historical artifacts are:
  - `20260512154003_restore_org_assets_bucket`
  - `20260512154233_billing_entitlements`
  - `20260512155053_roleplay_voice_settlement`
  - `20260512155141_audit_events_and_call_export`
- Hosted Auth dashboard settings still require owner verification:
  - public signup disabled
  - enabled providers intentional
  - redirect allow-list exact

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
- `vercel list argos-v2 --environment production --status READY --meta githubCommitSha=d5fa9b3fb83befc022821ae74b38fd5b42f7d633` confirmed the production deployment matched `origin/main` before remediation changes.
- The remediation branch is not deployed yet; the current production deployment Git SHA remains `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`.
- `vercel env ls` from the launch worktree failed because the worktree is not Vercel-linked. The same command from the root checkout succeeded by name only.
- `vercel env ls production` after remediation confirms `ARGOS_GHL_ENABLED` exists in Production and was recreated 4 minutes before that check.
- `vercel env pull /tmp/argos-vercel-production.env --environment=production --yes` after remediation confirms `ARGOS_GHL_ENABLED="false"` without committing the env file.
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
- These missing names are not public-launch blockers under the remediation plan:
  - web code uses `NEXT_PUBLIC_SUPABASE_URL`; worker has `SUPABASE_URL`
  - onboarding email falls back to `https://argosrevenuecommand.com`
  - GHL import names belong to the worker/import path, and GHL is disabled
  - call scoring model belongs primarily to worker call-processing config
- Vercel env values are encrypted or sensitive, so this audit verifies names/scopes and non-sensitive pulled values only, not secret literals.

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
- `stripe post /v1/webhook_endpoints/we_1TWeTUHQQsl005RT6Jtqmqz9 --live -d url=https://argosrevenuecommand.com/api/webhooks/stripe` exited 0.
- Fresh `stripe get /v1/webhook_endpoints/we_1TWeTUHQQsl005RT6Jtqmqz9 --live` confirmed:
  - URL: `https://argosrevenuecommand.com/api/webhooks/stripe`
  - status: `enabled`
  - livemode: `true`
  - API version: `2026-02-25.clover`
  - enabled events unchanged
- `stripe webhook_endpoints list --live --limit 20` returned the corrected endpoint as the only live webhook endpoint.
- Unsigned POST to `https://argosrevenuecommand.com/api/webhooks/stripe` returned HTTP 400.
- No live purchase or checkout completion was attempted.

### Zoom, GoHighLevel, And Token Encryption

- Focused web integration tests passed: 9 files, 38 tests.
- Focused worker GHL tests passed: 3 files, 8 passed, 3 skipped.
- Invalid production webhook probes returned safe failures:
  - Stripe invalid webhook request: `400`
  - Zoom invalid webhook request: `400`
  - GHL invalid webhook request: `401`
- `/settings/integrations` production probe redirected unauthenticated users to `/login?next=%2Fsettings%2Fintegrations`, then login returned 200.
- `vercel env pull /tmp/argos-vercel-production.env --environment=production --yes` exited 0 and wrote outside the repo.
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ARGOS_TOKEN_ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`, and `ARGOS_GHL_ENABLED` names are present in Vercel Production.
  - Pulled sensitive values for `SUPABASE_SERVICE_ROLE_KEY` and `ARGOS_TOKEN_ENCRYPTION_KEY` are empty in this CLI context, so the temp file cannot run the rotation script.
- `vercel env run -e production -- npm run rotate:integration-tokens -w @argos-v2/web` also exited 1 with missing Supabase/key env, confirming sensitive values are not injected locally by this Vercel CLI session.
- Hosted token encryption row state remains unverified. No `--apply` rotation was run.
- `vercel env rm ARGOS_GHL_ENABLED production --yes` and `vercel env add ARGOS_GHL_ENABLED production --value false --yes` exited 0.
- Repulled Vercel Production env confirms `ARGOS_GHL_ENABLED="false"`.
- `flyctl secrets list --app argos-v2-worker-jared` does not include `GHL_IMPORT_ENABLED`; worker code defaults absent import flag to false.
- Remediation branch code now rejects GHL webhook ingress before rate limiting, body parsing, repository creation, or webhook processing when `isGhlIntegrationConfigured()` is false.
- Focused route tests prove disabled GHL blocks both header-token and path-token webhook entrypoints.
- Non-secret provider URL values from pulled Vercel Production env:
  - `NEXT_PUBLIC_SITE_URL="https://argosrevenuecommand.com"`
  - `GHL_REDIRECT_URI="https://argosrevenuecommand.com/api/integrations/leadconnector/callback"`
  - `ZOOM_REDIRECT_URI="https://argos-v2-nine.vercel.app/api/integrations/zoom/callback"`
  - `ARGOS_WEBHOOK_URL="https://argos-v2-nine.vercel.app/api/webhooks/zoom"`
- Provider dashboard checks still required:
  - Zoom OAuth redirect equals production `ZOOM_REDIRECT_URI`.
  - Zoom recording webhook endpoint equals production `ARGOS_WEBHOOK_URL`.
  - Zoom webhook secret matches hosted env.
  - GHL Marketplace OAuth/webhook end-to-end checks remain deferred because GHL is explicitly disabled for public launch.

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

- `vercel logs --environment production --since 30m --level error --limit 50 --no-branch --json` exited 0 and returned no error entries before remediation.
- The same command exited 0 and returned no error entries after remediation.
- `flyctl logs --app argos-v2-worker-jared --no-tail` did not return promptly and was stopped. Fly provider health checks remain passing from the worker gate.
- Support-route env names verified present by name in Vercel Production:
  - `ARGOS_FEEDBACK_TO`
  - `ARGOS_FEEDBACK_FROM`
  - `ARGOS_ONBOARDING_FROM`
  - `RESEND_API_KEY`
- Actual inbox monitoring, Resend domain verification, and launch-week alert ownership require owner/provider confirmation.

### Live Smoke Tests

- `curl -sSI https://argosrevenuecommand.com/api/health` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/login` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/privacy-policy` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/terms-of-service` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/security-policy` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/robots.txt` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/sitemap.xml` returned HTTP 200.
- `curl -sSI https://argosrevenuecommand.com/llms.txt` returned HTTP 200.
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

- Hosted Supabase Auth signup/provider/redirect settings still require dashboard verification.
- Token encryption dry-run against hosted rows could not run from this shell because Vercel CLI pull/run does not expose the sensitive `SUPABASE_SERVICE_ROLE_KEY` and `ARGOS_TOKEN_ENCRYPTION_KEY` values locally.
- Zoom and GoHighLevel provider-dashboard checks require manual/provider access and controlled live events.
- Authenticated production user journeys, invite acceptance, live checkout completion, call processing, roleplay, and training AI smoke tests have not been executed with controlled production accounts.
- The remediation branch code is not deployed yet; production still serves Git SHA `d5fa9b3fb83befc022821ae74b38fd5b42f7d633`.

## Final Decision

NO-GO for public launch on 2026-06-30.

Reasons:

1. Hosted Supabase Auth dashboard settings are not verified.
2. Token encryption hosted-row dry-run did not complete because required sensitive env values are unavailable to this shell.
3. Provider dashboard checks and controlled authenticated production smoke tests remain incomplete.
4. The remediation branch must still be merged/deployed before the code-level GHL webhook disablement is live.
