# Argos V2 Codebase Risk Audit

Date: 2026-04-28  
Repo audited: `/Users/thevibecodebro/Projects/argos-v2`  
Branch: `main`  
Auditor note: no application code was changed. This report was added under `docs/audits/`.

## Executive Summary

Argos V2 is in better shape than a typical half-migrated product: the main web and worker typechecks pass, the web test suite passes, the worker unit suite passes, and the Next production build passes on rerun. The app has real service-layer authorization checks across many core product surfaces, Zoom webhooks have HMAC validation, and the worker has a lease/retry model for call-processing jobs.

The biggest practical risk is that the product looks invite-oriented, but the current auth/onboarding code still allows any authenticated Supabase user to be provisioned and then create a new trial org or join an existing org by slug. If this product is supposed to be invite-only or sales-led, that is the highest-priority access-control issue.

The second major risk is that production appears to rely heavily on trusted server-side repositories using `DATABASE_URL` and Supabase service-role clients. That is a workable architecture, but it means app code is the primary tenant boundary. Several migrations either enable RLS without policies or create backend tables without RLS, so the database is not yet a complete second line of defense.

The third major risk is operational: provider tokens are stored as plaintext app data despite the migration plan saying not to do that, app-layer rate limits are mostly absent, uploads and AI endpoints can be expensive, and several provider/network calls do not have explicit timeouts.

This audit did not verify live Vercel, Supabase, Fly, GitHub, Zoom, GHL, or production database state. Those are listed separately as live-verification unknowns.

## Repo State

- `git status --short` before writing this report showed two pre-existing untracked items:
  - `docs/design/`
  - `docs/superpowers/plans/2026-04-27-highlevel-inspired-authenticated-argos-implementation.md`
- Only this audit report was added during this run.
- `apps/web/.env.local` and `.vercel/.env.production.local` are ignored by `.gitignore`. They contain live-looking local/pulled secret material. Values are intentionally not repeated in this report.
- Tracked env surface found by `git ls-files`: only `apps/web/.env.example` is tracked.

## Prior Docs And Plan Reconciliation

- No prior automation memory existed for `argos-code-review`.
- I did not find an existing `docs/audits/` report in the current checkout.
- `docs/migration_plan.md:116` says to keep encryption for stored third-party tokens and not store provider tokens as plaintext app data. Current Zoom and GHL token schemas still use `text` columns.
- `docs/superpowers/specs/2026-04-06-invite-flow-design.md:276-281` explicitly left invite rate limiting and expired-invite cleanup as future work. Current code has invite revoke support, but rate limiting and cleanup are still open.
- `supabase/README.md:24-31` says the `https://**.vercel.app/**` auth redirect wildcard is temporary. `supabase/config.toml:34-37` still has that wildcard in the repo-side config.

## Top 10 Risks

| Rank | Risk | Severity | Likelihood | Why it is ranked here |
|---:|---|---|---|---|
| 1 | Signup/onboarding is not actually invite-only | Critical | High | Any authenticated Supabase user can be provisioned, create a trial org, or join by slug. |
| 2 | Tenant isolation relies on service code more than database policy | High | Medium | `DATABASE_URL` repositories and service-role clients bypass Supabase client RLS; some tables lack complete policy coverage. |
| 3 | OAuth/auth redirects trust forwarded host/proto headers | High | Medium | Auth callback and integration callbacks can build redirect origins from forwarded headers without an allowlist. |
| 4 | Zoom/GHL tokens are stored plaintext | High | Medium | Schema stores provider access/refresh/webhook tokens as text, contradicting the migration plan. |
| 5 | Rate limiting is missing on sensitive/costly endpoints | High | High | Invite, upload, webhook, auth-adjacent, roleplay, and AI generation routes have no shared limiter. |
| 6 | Recording storage privacy is not proven in code | High | Medium | Code stores recording URLs with `getPublicUrl`; bucket creation/policies were not found in migrations. |
| 7 | Direct upload completion trusts client-supplied object metadata | High | Medium | Completion checks path shape but does not verify object existence, size, content type, or ownership via storage metadata. |
| 8 | AI/provider calls lack explicit timeouts and usage budgets | Medium | High | OpenAI, Zoom, training, roleplay, and TTS fetches can hang or become costly without quotas. |
| 9 | Zoom/GHL integrations are partially wired | Medium | High | Zoom webhook registration is intentionally not attempted; GHL env keys are absent from the local production pull and no downstream sync was found. |
| 10 | CI/build quality gates are incomplete | Medium | Medium | No GitHub Actions workflow found, no root lint/build script, DB-backed worker tests skip locally without DB. |

## Findings Table

| Severity | Area | File/route | Evidence | Why it matters | Recommended fix | Verification needed |
|---|---|---|---|---|---|---|
| Critical | Auth and onboarding | `apps/web/components/auth/login-form.tsx:49-54`, `apps/web/components/auth/login-form.tsx:83-88`, `apps/web/lib/provisioning/service.ts:42-84`, `apps/web/lib/onboarding/service.ts:85-187`, `supabase/config.toml:40-48` | Magic link and Google login are open; callback provisions new users; onboarding can create trial orgs or join by slug; Supabase signup is enabled in repo config. | Invite-only or controlled onboarding assumptions are not enforced. A new user can enter the app path without an invite. | Decide the intended acquisition model. If invite-only, disable hosted signup, block magic-link/Google sign-in unless an invite exists, remove slug-only join, and require invite token acceptance for org assignment. | Confirm hosted Supabase `enable_signup`, Google provider settings, and production onboarding behavior. |
| High | Redirect safety | `apps/web/app/auth/callback/route.ts:66-74`, `apps/web/lib/integrations/oauth.ts:94-104`, `apps/web/app/api/integrations/zoom/callback/route.ts:16-19` | Redirect origins are built from `x-forwarded-host` and `x-forwarded-proto`; integration redirects use `getRequestOrigin`. | If an edge/proxy path allows spoofed forwarded headers, auth or OAuth redirects can be steered to an unexpected host. | Add a canonical origin allowlist from env, prefer `NEXT_PUBLIC_SITE_URL`/provider redirect envs in production, and reject unknown forwarded hosts. | Verify Vercel forwarded-header behavior and hosted domain aliases. |
| High | Tenant isolation and RLS | `apps/web/lib/calls/create-repository.ts:4-9`, `packages/db/src/client.ts:22-27`, `apps/web/lib/supabase/admin.ts:5-13`, `supabase/migrations/20260415210107_202604130001_add_rubrics.sql:63-65`, `supabase/migrations/202604180001_call_processing_jobs.sql:1-25` | When `DATABASE_URL` is set, app repositories use Drizzle directly. Admin Supabase client uses the service-role key. Rubrics enable RLS with no policies found. Job table has no RLS enable/policies. | App services become the main tenant boundary. A missed `orgId` check or future direct client read would be high-impact. | Add live RLS smoke tests, complete policies for rubrics/call scores/jobs/invites where applicable, and document which tables are service-only. | Verify production DB policies with live Supabase SQL, not just migrations. |
| High | Third-party token storage | `packages/db/src/schema/zoomIntegrations.ts:10-14`, `packages/db/src/schema/ghlIntegrations.ts:12-14`, `docs/migration_plan.md:116` | Provider access/refresh/webhook tokens are plain `text` columns, while the migration plan says tokens should not be plaintext app data. | DB read exposure or logs/backups can expose provider accounts. | Encrypt tokens before persistence using KMS/Supabase Vault/pgsodium-equivalent, add rotation, and migrate existing rows. | Live DB inspection needed to confirm any out-of-band encryption or token rotation already exists. |
| High | Rate limiting and abuse controls | `apps/web/app/api/invites/route.ts:10-35`, `apps/web/app/api/calls/upload/route.ts:85-95`, `apps/web/app/api/webhooks/zoom/route.ts:7-18`, `apps/web/app/api/roleplay/tts/route.ts:20-35`, `apps/web/lib/training/service.ts:1302-1329` | Route scan found no app-wide limiter. `rg` only found rate-limit language in docs and worker retry classification. | Invites, uploads, webhooks, and AI calls can be abused for email spend, storage spend, OpenAI spend, or service degradation. | Add per-IP and per-user/org limits for invites, uploads, webhooks, roleplay, training AI, and auth-adjacent routes. | Verify Vercel firewall/WAF or upstream provider limits if they are meant to cover this. |
| High | Storage privacy and recordings | `apps/web/lib/calls/ingestion-service.ts:36-49`, `apps/web/lib/calls/ingestion-service.ts:63-79`, `apps/web/app/api/calls/upload/complete/route.ts:78-87` | Recordings are uploaded to `call-recordings` and URLs are persisted via `getPublicUrl`. No bucket creation or storage policies were found in migrations. | If the bucket is public, call recordings may be accessible to anyone with the URL. If private, persisted public URLs may not work. | Make the bucket private, persist storage paths rather than public URLs, serve short-lived signed read URLs after app authorization, and add storage migration docs. | Live Supabase Storage bucket privacy, CORS, and policy settings. |
| High | Direct upload completion | `apps/web/app/api/calls/upload/complete/route.ts:70-87`, `apps/web/lib/calls/ingestion-service.ts:63-79` | Completion checks the storage path prefix/suffix, then queues the call using client-supplied `fileSizeBytes` and `contentType`. It does not `HEAD`/stat the object. | A client can queue nonexistent, oversized, or mismatched objects inside its allowed prefix. | On completion, fetch storage metadata with service role, verify existence, size, content type, and ownership path before creating the call/job. | Live storage metadata behavior for signed uploads. |
| Medium | Local secrets hygiene | `apps/web/.env.local`, `.vercel/.env.production.local`, `.gitignore:6-8`, `.gitignore:17` | Ignored local env files contain live-looking secret values; `git check-ignore` confirms they are ignored. | Local secret sprawl increases accidental leak risk through logs, screenshots, backups, or copied worktrees. | Rotate any secrets that were exposed in tool output/screenshots, use a password manager or Vercel/Supabase CLIs for pulls, and keep `.env.local` out of reports/commits. | Confirm whether any of these local secrets have been shared or committed elsewhere. |
| Medium | Zoom integration lifecycle | `apps/web/app/api/integrations/zoom/callback/route.ts:86-99`, `apps/web/lib/integrations/oauth.ts:284-310`, `apps/web/lib/zoom-callback-route.test.ts:44-94` | `registerZoomWebhook` exists but callback persists `webhookId: null` and tests assert legacy webhook registration is not attempted. | Zoom cloud-recording ingestion depends on manual/global webhook setup or other provider configuration not proven by code. | Document the chosen model. If per-account webhooks are required, wire registration and secret persistence. If global webhook is intended, remove dead registration code and add setup verification. | Verify Zoom app webhook dashboard and production `ARGOS_WEBHOOK_URL`/secret. |
| Medium | GHL integration completeness | `apps/web/app/api/integrations/ghl/connect/route.ts:34-55`, `apps/web/app/api/integrations/ghl/callback/route.ts:86-99`, `.vercel/.env.production.local` key scan | UI/routes store GHL OAuth tokens, but local production env pull did not include `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, or `GHL_REDIRECT_URI`; no downstream sync behavior was found. | The product can show an integration card that is not usable in production or does not do anything after connecting. | Either complete the GHL workflow and env configuration or hide/label it as unavailable. | Live Vercel env and GHL marketplace app verification. |
| Medium | AI reliability and cost | `packages/call-processing/src/openai.ts:183-232`, `apps/web/lib/training/service.ts:1302-1329`, `apps/web/lib/roleplay/openai-voice.ts:93-130`, `apps/web/app/api/roleplay/tts/route.ts:20-35` | OpenAI fetches have no explicit timeout, request budget, per-org quota, or retry policy at the HTTP layer. TTS accepts arbitrary text/instructions after auth. | Long or repeated requests can hang workers/functions and create unexpected OpenAI spend. | Add `AbortController` timeouts, retry/backoff around transient provider errors, max text/SDP sizes, and per-org usage counters. | Verify Vercel/Fly function timeouts and OpenAI project spend caps. |
| Medium | Prompt injection and untrusted transcript handling | `packages/call-processing/src/openai.ts:221-229`, `apps/web/lib/training/service.ts:1311-1326` | Call transcripts and training generation inputs are passed into model prompts as user content. Output is JSON-validated, but prompts do not visibly isolate untrusted transcript instructions. | A transcript can include instructions that try to alter scoring output or leak prompt/system behavior. | Treat transcripts as quoted untrusted evidence, strengthen system prompt boundaries, and add adversarial transcript tests. | Run red-team scoring tests with injected transcript instructions. |
| Medium | Worker throughput and health | `apps/worker/src/jobs/poll-call-processing-jobs.ts:27-39`, `apps/worker/src/index.ts:32-65`, `fly.worker.toml:15-23` | Poll loop claims one job, awaits completion, sleeps, and repeats. `/health` reports process uptime, not DB/OpenAI/storage connectivity or processing-enabled state. | Backlogs can build quickly, and Fly health can stay green while processing is disabled or downstream dependencies are failing. | Add configurable worker concurrency, queue depth/oldest job metrics, dependency health, and alerts for failed/retrying jobs. | Live Fly logs, queue depth, and worker env verification. |
| Medium | Invite acceptance race | `apps/web/app/api/invites/[token]/accept/route.ts:24-63`, `apps/web/lib/invites/supabase-repository.ts:95-99`, `packages/db/src/schema/invites.ts:4-16` | Pre-checks happen outside the transaction and `markInviteAccepted` updates by id only, not `accepted_at IS NULL`. | Double-submit or concurrent acceptance can race. Current guards reduce impact, but consumption is not atomic. | Re-read/lock invite inside the transaction or update with `where id = ? and accepted_at is null`, then require one affected row. | Add a DB-backed concurrency test. |
| Medium | Supabase auth config drift | `supabase/config.toml:30-48`, `supabase/README.md:24-31` | Repo config has localhost `site_url`, Vercel wildcard redirects, signup enabled, email signup enabled, and Google enabled. README says wildcard is temporary. | Hosted Supabase settings may diverge from repo config, and permissive auth settings can remain unnoticed. | Store intended hosted auth settings in docs/scripts and run a release checklist against Supabase. | Live Supabase auth settings. |
| Medium | CI and quality gates | `.github` search, `package.json:8-18`, `apps/web/package.json:4-10` | No GitHub Actions workflow found. Root scripts do not include a single `build` or `lint` gate. Web has build/test/typecheck scripts; no lint script. | Regressions can land without a consistent server-side check. | Add CI for install, typecheck, test, build, migration/schema checks, and worker DB tests with a local Postgres service. | GitHub repository Actions settings. |
| Medium | Test coverage gap | `apps/worker/src/calls/repository.test.ts:17`, `README.md:46-48` | Worker repository DB tests skip when `WORKER_TEST_DATABASE_URL` or local DB is unavailable. Current run skipped 5 DB-backed worker tests. | Lease/retry/persist behavior is core production logic and should be continuously verified against Postgres. | Add CI Postgres service and require worker repository tests. | CI run with real DB. |
| Low | Dependency hygiene | `package.json:8-20`, `package-lock.json:13-14`, `package-lock.json:70-80`, `package-lock.json:6540-6548` | `npm ls --workspaces --depth=0` reports many extraneous packages. Lockfile references missing `packages/api-client`, `packages/api-spec`, `packages/api-zod`, plus root dev deps not present in `package.json`. | Stale lock/node_modules state makes installs, audits, and supply-chain review noisier. | Reconcile `package.json` and `package-lock.json`, remove dead generated packages or restore them intentionally, then run clean `npm ci`. | Clean clone/install verification. |
| Low | Error disclosure | `apps/web/app/api/invites/route.ts:31-34` | Invite API returns the raw caught error message to the client on email-send failure. | Provider or internal details can leak into the UI/API response. | Log internal error server-side and return a generic invite-send failure. | None beyond focused route test. |
| Low | Broken legal/security footer links | `apps/web/components/auth/login-form.tsx:211-217` | Login footer links use `href="#"` even though `/privacy-policy`, `/security-policy`, and `/terms-of-service` routes exist. | Trust/legal links do not work on a sensitive auth screen. | Point to real legal/security routes. | Browser click smoke test. |

## Unfinished Or Half-Wired Features

- **Invite-only onboarding is incomplete if invite-only is the intent.** Invites exist, but open signup/provisioning plus create/join-org onboarding bypasses the invite path.
- **Zoom webhook lifecycle is half-wired by design.** `registerZoomWebhook` exists, but tests assert the callback does not call it. The current code likely depends on global/manual Zoom webhook setup.
- **GHL appears mostly OAuth-only.** Connect/callback/status/disconnect exist, but no downstream sync or production env keys were found in the local Vercel production env pull.
- **Text roleplay is deterministic.** `apps/web/lib/roleplay/service.ts:237-267` returns canned persona replies; OpenAI is only used for realtime voice/TTS paths.
- **Training AI status hides the reason.** `apps/web/app/api/training/ai-status/route.ts:15-16` returns only `{ available }`, even though the service has a `reason`.
- **Invite cleanup/rate limiting remains future work.** This is explicitly called out in the approved invite design.
- **Stale generated API packages remain in the lockfile.** `package-lock.json` references API client/spec/zod packages that are not present under `packages/`.

## Unknowns That Need Live Verification

- Hosted Supabase auth settings: signup enabled/disabled, provider settings, redirect allowlist, and email confirmation policy.
- Production database migration state and actual RLS policies, especially rubrics, call scores, invites, and call-processing jobs.
- Supabase Storage bucket privacy, CORS, object access policy, and whether recording URLs are public in production.
- Vercel production env values and project settings. The local production env pull showed key presence, but not reliable live configuration.
- Fly worker env, logs, queue depth, failed-job count, and whether `/health` is the only production health signal.
- Zoom app webhook configuration, callback URLs, secret token, and whether global webhook delivery is active.
- GHL marketplace app configuration and whether GHL is intentionally disabled in production.
- GitHub branch protection, required checks, and Actions settings.
- OpenAI account-level usage caps and model availability.
- Whether the live local secrets inspected during this audit have been exposed outside this machine.

## Quick Wins Under 1 Hour

1. Replace the login footer `href="#"` links with real `/security-policy` and `/terms-of-service` or `/privacy-policy` routes.
2. Return a generic invite-send error from `POST /api/invites` instead of the raw caught error message.
3. Add explicit max body/text checks for roleplay TTS and realtime SDP endpoints.
4. Add a canonical allowed-origin helper for auth/OAuth redirects and stop constructing production redirects from raw forwarded headers.
5. Update `apps/web/.env.example` to include Zoom/GHL/provider envs that are real product requirements, or explicitly mark GHL as disabled.
6. Add `build:web` and a root `verify` script that runs typechecks, tests, and web build.
7. Add a short runbook note for the Zoom webhook model: global/manual webhook vs per-account registration.

## Larger Remediation Projects

1. **Access-control hardening:** decide invite-only vs open signup, enforce it in Supabase and app code, and add tests for blocked uninvited users.
2. **RLS and service-role hardening:** complete policies, add live RLS smoke tests, and document which tables are service-only.
3. **Token encryption migration:** encrypt Zoom/GHL access and refresh tokens, rotate existing tokens, and add key-management runbooks.
4. **Storage privacy migration:** move from persisted public recording URLs to private storage paths plus short-lived signed read URLs.
5. **Rate-limiting and usage controls:** add shared per-IP/user/org limiting and usage counters for email, upload, webhook, training AI, roleplay, and call processing.
6. **Worker observability:** add concurrency, queue metrics, retry/failure dashboards, and dependency-aware health checks.
7. **CI and dependency cleanup:** reconcile the lockfile, add GitHub Actions, add DB-backed worker tests, and make `npm audit` part of CI once network is available.

## Suggested Order For The Next 1-2 Weeks

1. Confirm business intent for signup. If invite-only, close the auth/onboarding bypass first.
2. Add redirect origin allowlisting and tighten hosted Supabase redirect URLs.
3. Add rate limits to invites, uploads, AI routes, and Zoom webhook.
4. Verify live Supabase Storage bucket privacy; if public, start the private-bucket signed-URL migration.
5. Encrypt provider tokens and rotate Zoom/GHL credentials.
6. Complete RLS policies/tests for rubrics, call scores, invites, and call-processing jobs.
7. Decide and document Zoom/GHL integration scope; hide or complete half-wired pieces.
8. Add CI with typecheck, tests, Next build, and Postgres-backed worker repository tests.
9. Add provider timeouts, usage limits, and worker dependency health.
10. Clean lockfile/dependency drift and run a successful security audit from a network-enabled environment.

## Commands Run And Results

- `git status --short` - showed two pre-existing untracked doc paths before this report.
- `git branch --show-current` - `main`.
- `git rev-parse --show-toplevel` - `/Users/thevibecodebro/Projects/argos-v2`.
- `rg --files` over repo configs/docs/migrations/scripts - inspected package scripts, Supabase, Vercel, Fly, env templates, docs, tests, and routes.
- `find docs -type f` - no existing `docs/audits` report found; prior plans/specs inspected.
- `rg "TODO|FIXME|HACK|stub|mock|placeholder|coming soon|not implemented|fake"` with tests/plans/design excluded - mostly UI input placeholders; no broad route-level stub pattern found.
- `rg "rate.?limit|throttle|csrf|origin|SameSite|sameSite"` - no shared app-layer rate limiter found; mostly docs, origin handling, SameSite cookies, and worker retry classification.
- `rg` over migrations for RLS/policies - found policy coverage for many existing tables, but no visible policies for rubrics/call scores and no RLS enable for call-processing jobs/invites.
- `find .github -maxdepth 3 -type f` - no GitHub Actions workflow files found.
- `git ls-files | rg '(^|/)\\.env|\\.env\\.'` - only `apps/web/.env.example` is tracked.
- `git check-ignore -v apps/web/.env.local .vercel/.env.production.local` - both ignored.
- `npm run typecheck:web` - passed.
- `npm run test:web` - passed: 64 test files, 335 tests. Some expected test stderr was emitted by error-path tests.
- `npm run typecheck:worker` - passed.
- `npm run test:worker` - passed with caveat: 6 files passed, 1 file skipped; 18 tests passed, 5 DB-backed tests skipped.
- `npm run typecheck:db` - passed.
- `npm run build -w @argos-v2/web` - first run failed at trace collection with missing `_not-found/page.js.nft.json`; rerun passed and produced the route manifest. Treat as a transient local build/cache issue unless it recurs in CI.
- `npm ls --workspaces --depth=0` - exited 0 but reported many extraneous packages, including stale generated API package links.
- `npm audit --omit=dev --audit-level=moderate` - could not complete because network/DNS access to `registry.npmjs.org` was unavailable in this environment.

## Things Intentionally Not Checked

- I did not make code changes or run migrations.
- I did not connect to live Supabase, Vercel, Fly, GitHub, Zoom, GHL, Resend, Stripe, or OpenAI.
- I did not print or preserve secret values in this report.
- I did not run browser UI flows, because this audit focused on repository evidence and safe command-line verification.
- I did not run destructive cleanup commands against `.next`, `node_modules`, database state, storage buckets, or local env files.
- I did not assume production configuration from local files where live verification is required.
