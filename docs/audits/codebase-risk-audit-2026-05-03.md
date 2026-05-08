# Argos Codebase Risk Audit - 2026-05-03

Repository audited: `/Users/thevibecodebro/Projects/argos-v2`

Scope: security/access control, unfinished features, production/deployment risk, data and multi-tenant safety, AI/cost/reliability, and test/quality gaps.

Audit stance: no app code changes were made. This report audits the current checkout, which was already dirty before the audit.

## Executive Summary

Argos is in materially better shape than the 2026-04-28 audit described. The earlier "missing CI", "no rate limits", "plaintext token writes", "unsafe forwarded host trust", "upload completion trusts metadata", and "no AI timeouts" findings are now mostly addressed in code. `npm run verify` passes locally, including web typecheck, web tests, Next build, worker typecheck, and worker tests.

The largest risks now are operational and product-completion risks rather than obvious single-file vulnerabilities. The highest risk is that the security hardening depends on live environment variables and hosted platform settings that were not verifiably present in the local pulled Vercel production env file. The second highest risk is billing: public pricing and checkout are wired, but I found no Stripe webhook, subscription ledger, customer mapping, or voice-pack entitlement persistence.

Invite-only access is also only partially enforced by repo code. The app defaults to invite-only at the organization-assignment layer, but hosted Supabase Auth signup and redirect settings still need live verification, and the onboarding UI still exposes create/join flows that invite-only mode blocks unless the user is a configured bootstrap admin.

I did not find evidence in the inspected core paths of an unauthenticated direct cross-org read. The current architecture still relies heavily on server/service clients and app-layer scoping, so hosted RLS, migrations, and branch protection should be treated as required live verification, not assumed.

## Current Checkout State

- Branch: `codex/operational-layout-calls`.
- `HEAD` matched `origin/main` / `main` at `fd3a03d Merge pull request #13 from feature/argos-ui-polish-system` when checked.
- The repo was dirty before this audit:
  - Modified app/test files: `apps/web/app/(authenticated)/calls/calls-filters.tsx`, `apps/web/app/(authenticated)/calls/page.tsx`, `apps/web/components/app-shell.tsx`, `apps/web/lib/app-shell.test.ts`, `apps/web/lib/calls-filters-forge.test.tsx`, `apps/web/lib/primary-route-hero-removal.test.ts`.
  - Untracked app/test files: `apps/web/components/operational-workspace.tsx`, `apps/web/lib/operational-workspace.test.tsx`.
  - Untracked docs/plans: `docs/audits/`, `docs/design/authenticated-forge-ux-audit.local-before-pr9.md`, `docs/superpowers/plans/2026-04-27-highlevel-inspired-authenticated-argos-implementation.md`.
- This audit therefore reflects the current dirty checkout, not a clean release commit.

## Prior Audit Reconciliation

Previous report checked: `docs/audits/codebase-risk-audit-2026-04-28.md`.

| Prior issue | Current status | Evidence |
| --- | --- | --- |
| No GitHub Actions CI | Fixed in repo, live enforcement still needs verification | `.github/workflows/verify.yml:1-81` now runs install, `npm run verify`, and DB-backed worker/RLS tests on PRs/main. |
| Unsafe forwarded host/proto redirect origin trust | Fixed in code | `apps/web/lib/security/trusted-origins.ts:146-177`; auth and OAuth routes use safe origin helpers. |
| No rate limits on sensitive endpoints | Improved, not complete | `apps/web/lib/rate-limit/service.ts:32-58`; upload, invites, Zoom webhook, training AI, roleplay TTS/realtime are covered. Org create/join, checkout, invite accept/lookup, and profile updates are still not obviously covered. |
| Zoom/GHL tokens written plaintext | Improved for new writes, live rotation unknown | `apps/web/lib/integrations/token-encryption.ts:1-85`; repositories encrypt on upsert/update. Legacy plaintext rows remain readable until rotated. |
| Upload completion trusted client metadata | Fixed in code | `apps/web/app/api/calls/upload/complete/route.ts:164-247` checks Supabase object info, size, content type, org/member, and queues processing only after verification. |
| Storage bucket privacy unproven | Improved in migrations, live hosted DB still unknown | `supabase/migrations/202604280002_private_call_recordings.sql:1-17`; signed URL access in `apps/web/lib/calls/service.ts:683-746`. |
| RLS gaps for rubrics/scores/invites/jobs | Improved in migrations/tests | `supabase/migrations/202604280003_rls_policy_hardening.sql:1-76`; `apps/worker/src/security/rls-policies.test.ts:117-227`. |
| AI calls had missing timeouts and prompt injection risk | Mostly improved | `packages/call-processing/src/openai.ts:12-20`, `packages/call-processing/src/openai.ts:68-132`, `apps/web/lib/training/service.ts:40-55`, `apps/web/lib/openai/client.ts:1-69`. Remaining gaps are budget/entitlement enforcement and some roleplay transcript handling. |
| No hosted Supabase Auth verification | Still open | `supabase/config.toml:30-48` is local config; hosted signup/redirect settings need live verification. |
| No token rotation proof | Still open | `apps/web/scripts/rotate-integration-tokens.mjs:1-248` exists, but live DB rotation state was not checked. |

## Top 10 Risks

| Rank | Risk | Severity | Likelihood | Evidence | Recommended owner action |
| --- | --- | --- | --- | --- | --- |
| 1 | Production env drift could disable or break hardening | High | High | `.vercel/.env.production.local` key inventory did not list `ARGOS_TOKEN_ENCRYPTION_KEY`, `ARGOS_RATE_LIMIT_HASH_SECRET`, `ARGOS_INVITE_ONLY`, `ARGOS_ALLOWED_ORIGINS`, GHL vars, or the Stripe secret/price env names used by code. `.env.example` requires these keys. | Verify live Vercel envs, add missing security keys, and redeploy only after confirming `/login`, OAuth callbacks, uploads, and integrations still work. |
| 2 | Billing checkout exists without subscription/entitlement fulfillment | High | High | Pricing links call checkout in `apps/web/components/public/landing-page.tsx:244-258`; checkout route exists at `apps/web/app/billing/checkout/route.ts:1-83`; no Stripe webhook route was found. | Do not launch paid checkout until Stripe webhook handling, customer mapping, subscription state, and voice-pack entitlements are persisted and tested. |
| 3 | Hosted Supabase signup/redirect policy may not match invite-only assumptions | High | Medium | Local Supabase config has `enable_signup = true` and broad `https://**.vercel.app/**` redirects in `supabase/config.toml:30-48`; app login exposes Google and magic link in `apps/web/components/auth/login-form.tsx:51-90`. | Verify hosted Supabase Auth settings, disable public signup if required, remove broad preview wildcards or scope them intentionally, and test invite-only flows live. |
| 4 | Integration token encryption rollout depends on env and rotation | High | Medium | `token-encryption.ts` throws when `ARGOS_TOKEN_ENCRYPTION_KEY` is missing (`apps/web/lib/integrations/token-encryption.ts:74-85`); repositories decrypt legacy plaintext, and rotation script exists. | Add key in every runtime, run dry-run/apply rotation against live DB, verify OAuth callbacks, then monitor for legacy plaintext rows. |
| 5 | Hosted database TLS certificate verification is disabled | Medium | High | `packages/db/src/client.ts:22-42` uses `ssl: { rejectUnauthorized: false }` for non-local DB URLs. | Move to verified TLS with CA material or a managed client setting that validates certificates. |
| 6 | Rate limiting is incomplete and secret fallback is weak operationally | Medium | Medium | Policies exist in `apps/web/lib/rate-limit/service.ts:32-58`, but org create/join and billing checkout routes do not call them; hash secret falls back to service-role/DB URL/local string in `apps/web/lib/rate-limit/service.ts:71-76`. | Add rate limits to remaining sensitive routes, require a dedicated production hash secret, and add cleanup for old buckets. |
| 7 | Billing and AI usage are not tied to durable quotas | High | Medium | Billing plan definitions mention extra voice packs in `apps/web/lib/billing/plans.ts:27-125`; roleplay/training routes have per-route rate limits but no billing entitlement ledger was found. | Build a usage ledger that connects subscription/pack purchases to roleplay, TTS, realtime, and training generation limits. |
| 8 | Worker health and backlog visibility are shallow | Medium | Medium | Worker health only returns ok/timestamp in `apps/worker/src/index.ts:45-64`; poll loop claims one job per process in `apps/worker/src/jobs/poll-call-processing-jobs.ts:27-39`. | Add dependency-aware health or readiness, queue/backlog metrics, stuck-job visibility, and an operator retry/requeue path. |
| 9 | Public webhook/body handling and some provider calls lack hard limits/timeouts | Medium | Medium | Zoom webhook reads `request.text()` before a body cap in `apps/web/app/api/webhooks/zoom/route.ts:35-47`; GHL token/location fetches in `apps/web/lib/integrations/oauth.ts:205-235` and Stripe fetches in `apps/web/lib/billing/stripe-checkout.ts:181-190` use raw `fetch`. | Add body-size caps and shared timeout wrappers for all public/provider requests. |
| 10 | Dependency and workspace metadata are stale/noisy | Low | High | `npm ls --workspaces --depth=0` exits 0 but reports many extraneous packages; root lockfile still includes stale packages/workspaces. `npm audit` could not run due network DNS failure. | Refresh install state with a clean `npm ci`, prune stale lockfile entries, and rerun audit from a networked environment. |

## Findings Table

| Severity | Area | File/route | Evidence | Why it matters | Recommended fix | Verification needed |
| --- | --- | --- | --- | --- | --- | --- |
| High | Production config | `.vercel/.env.production.local`, `apps/web/.env.example`, `.vercel/project.json` | Local pulled production env key inventory did not list several required hardening keys. `.env.example:1-31` now documents `ARGOS_ALLOWED_ORIGINS`, `ARGOS_TOKEN_ENCRYPTION_KEY`, `ARGOS_RATE_LIMIT_HASH_SECRET`, and `ARGOS_INVITE_ONLY`. | The repo can look secure while production is missing the keys that make encryption, origin allowlists, and explicit invite-only behavior deterministic. | Compare live Vercel envs against `.env.example`; add missing keys; redeploy and smoke test. | Needs live Vercel verification. |
| High | Billing | `/billing/checkout`, public pricing, Stripe helpers | `apps/web/components/public/landing-page.tsx:244-258`; `apps/web/app/billing/checkout/route.ts:1-83`; `apps/web/lib/billing/stripe-checkout.ts:1-210`; no Stripe webhook route found by file search. | Users can reach checkout, but the app has no visible fulfillment path for org plan, seats, subscription status, or voice packs. | Implement Stripe webhook validation, customer/org mapping, subscription/line-item persistence, and entitlement checks before launch. | Needs live Stripe product/price/webhook verification. |
| High | Auth/access control | Supabase Auth plus app invite-only | `supabase/config.toml:30-48`; `apps/web/components/auth/login-form.tsx:51-90`; `apps/web/lib/provisioning/service.ts:68-84`; `apps/web/lib/onboarding/service.ts:83-85`. | Hosted signup may be open even if app org assignment is invite-only. Open signups create orgless app users that must be safely contained. | Verify hosted Auth signup/redirect policy; keep orgless users blocked from authenticated app shell; add tests for invite-only hosted assumptions where possible. | Needs live Supabase Auth verification. |
| High | Integration secrets | Zoom/GHL token storage | `apps/web/lib/integrations/token-encryption.ts:1-85`; `apps/web/lib/integrations/repository.ts:47-84`; `apps/web/lib/integrations/supabase-repository.ts:55-115`; `apps/web/scripts/rotate-integration-tokens.mjs:1-248`. | New OAuth token writes fail without encryption key; legacy plaintext rows remain readable until rotation. | Add key, run rotation dry-run/apply, add an operational check for remaining unprefixed tokens. | Needs live DB verification. |
| Medium | Database transport | DB client | `packages/db/src/client.ts:22-42` sets `rejectUnauthorized: false` for non-local SSL. | This prevents certificate validation for hosted DB connections and weakens protection against network interception/misrouting. | Configure verified TLS with a CA bundle or platform-supported validation setting. | Needs hosted DB connection verification after change. |
| Medium | Rate limiting | Sensitive routes and limiter service | `apps/web/lib/rate-limit/service.ts:32-58`; `apps/web/app/api/organizations/route.ts:1-41`; `apps/web/app/api/organizations/join/route.ts:1-41`; `apps/web/app/billing/checkout/route.ts:1-83`. | Remaining endpoints can still be spammed or abused, especially org creation/join attempts and checkout session creation. | Add policies for organization onboarding, invite accept/lookup, checkout, and profile mutation; require `ARGOS_RATE_LIMIT_HASH_SECRET` in production. | Needs route-level tests and live bucket inspection. |
| Medium | Worker operations | Fly worker and queue loop | `fly.worker.toml:1-33`; `apps/worker/src/index.ts:32-65`; `apps/worker/src/jobs/poll-call-processing-jobs.ts:27-39`; `apps/worker/src/jobs/process-call-job.ts:140-157`. | A green health endpoint can hide DB/OpenAI/storage failures or a growing queue. Single-job polling per process may lag under upload bursts. | Add backlog metrics, dependency readiness, stuck-job reporting, and controlled concurrency/retry tuning. | Needs Fly logs/metrics/live queue verification. |
| Medium | Public endpoints/provider calls | Zoom webhook, GHL OAuth, Stripe API | `apps/web/app/api/webhooks/zoom/route.ts:35-47`; `apps/web/lib/integrations/oauth.ts:205-235`; `apps/web/lib/billing/stripe-checkout.ts:181-190`. | Public/provider paths can tie up functions with large bodies or slow upstreams. | Apply body caps and shared timeout/retry wrappers before parsing or waiting on provider APIs. | Can be covered by unit tests plus live provider smoke tests. |
| Medium | Invite correctness | Invite send/accept | `apps/web/lib/invites/service.ts:56-104`; `apps/web/app/invite/[token]/page.tsx:77-88`; `apps/web/app/api/invites/[token]/accept/route.ts:55-57`; `apps/web/app/api/invites/route.ts:66-69`. | Email comparisons are case-sensitive and invite API returns raw caught errors. This can cause false rejection and leak implementation detail. | Normalize invite emails to lowercase at send and compare time; return generic 500 errors. | Unit tests should cover mixed-case invites and error responses. |
| Medium | Onboarding UX/access | `/onboarding` | `apps/web/app/onboarding/page.tsx:6-16`; `apps/web/components/onboarding-panel.tsx:121-154`; `apps/web/lib/onboarding/service.ts:173-183`, `apps/web/lib/onboarding/service.ts:266-271`. | The UI advertises create/join while invite-only mode blocks those actions for most users. This increases support load and creates confusion around signup policy. | Gate create/join UI by invite-only/bootstrap state and make invite acceptance the primary flow. | Needs product decision and UI test update. |
| Medium | Multi-tenant safety | Service/client architecture and RLS | `packages/db/src/client.ts:45-74`; `supabase/migrations/202604280003_rls_policy_hardening.sql:1-76`; `apps/worker/src/security/rls-policies.test.ts:117-227`. | Server DB access bypasses Supabase RLS by design, so repository/service scoping is the real boundary for most app reads/writes. | Continue service-level org scoping review and run DB-backed RLS smoke tests in CI and pre-prod. | Local DB-backed worker tests skipped without DB; CI/live verification needed. |
| Medium | Storage/data governance | Call recordings | `supabase/migrations/202604280002_private_call_recordings.sql:1-17`; `apps/web/lib/calls/ingestion-service.ts:84-141`; `apps/web/lib/calls/service.ts:683-746`. | Private signed URLs are implemented, but legacy external `recording_url` values can still be returned after auth, and retention/export/deletion behavior is not defined. | Define recording retention, deletion, export, and legacy URL migration policy. | Needs hosted storage bucket and legacy row verification. |
| Medium | AI/cost/reliability | Roleplay/training/call processing | `packages/call-processing/src/openai.ts:68-132`; `apps/web/lib/training/service.ts:320-383`; `apps/web/lib/roleplay/openai-voice.ts:52-127`; roleplay routes use rate limits. | Timeouts and caps exist, but usage is not tied to billing/quotas, and roleplay instructions include recent transcript text without an explicit untrusted-transcript boundary. | Add durable usage limits by org/plan and harden roleplay prompt boundaries around user transcript content. | Needs usage/cost load testing and prompt safety review. |
| Low | Auth/session error handling | `/api/me` and invite route | `apps/web/app/api/me/route.ts:18-26`, `apps/web/app/api/me/route.ts:43-51`; `apps/web/app/api/invites/route.ts:66-69`. | Returning raw exception messages can expose internals during failures. | Log internally and return generic messages for unexpected 500s. | Unit tests can verify sanitized 500 payloads. |
| Low | Build/runtime drift | Vercel/CI Node versions | `.vercel/project.json:1-11`; `.github/workflows/verify.yml:11-17`. | Vercel local project config says Node `24.x`; CI uses Node 22. Differences can appear in native packages, OpenSSL, fetch behavior, and Next runtime. | Align runtime to supported LTS across Vercel and CI or add a deliberate compatibility matrix. | Needs Vercel project settings verification. |
| Low | Dependency hygiene | npm lock/install state | `package.json`, `package-lock.json`; `npm ls --workspaces --depth=0` result. | Extraneous packages and stale generated workspace references can hide unused dependency risk and make security audits noisy. | Rebuild from clean install, prune stale lockfile entries, and rerun `npm audit` with network access. | Needs networked dependency audit. |
| Low | Quality gates | Package scripts and CI | `package.json:1-20`; `.github/workflows/verify.yml:1-81`. | Typecheck/tests/build are present, but no lint/static security script is defined. | Add lint or targeted static checks for server-only imports, raw error responses, and unsafe fetch/body parsing. | CI branch protection needs live GitHub verification. |

## Unfinished Or Half-Wired Features

1. Billing/subscriptions are incomplete.
   - Evidence: checkout exists at `apps/web/app/billing/checkout/route.ts`; plans/pricing exist in `apps/web/lib/billing/plans.ts`; no Stripe webhook route or subscription/entitlement persistence was found.
   - Impact: paid users may be charged without the app updating plan/seats/voice packs.

2. Extra voice packs are advertised in plan data but not fulfilled.
   - Evidence: `apps/web/lib/billing/plans.ts:83-125` defines `voice_pack_small`, `voice_pack_medium`, and `voice_pack_large`; no entitlement ledger was found.
   - Impact: billing copy can get ahead of product behavior.

3. Invite-only onboarding UX is not finished.
   - Evidence: `/onboarding` says "Create a new team or join your existing one" and exposes create/join options, but service logic blocks create/join unless invite-only is disabled or the caller is bootstrap admin.
   - Impact: legitimate invited users may be confused, and uninvited signups reach a dead-end UI.

4. GHL integration is gated and likely not production-ready.
   - Evidence: `.env.example` documents `ARGOS_GHL_ENABLED=false` and GHL env vars; local pulled production env key inventory did not include GHL keys; OAuth code exists in `apps/web/lib/integrations/oauth.ts`.
   - Impact: the feature is partially present but should remain disabled until marketplace/callback/live API configuration is verified.

5. Data lifecycle controls are not obvious.
   - Evidence: call recording storage and signed URLs exist, but I did not find a product-level retention/export/delete/audit policy or implementation for recordings/transcripts/scores.
   - Impact: customer trust, compliance, and incident response are harder as real call data accumulates.

6. Worker operations need an operator surface.
   - Evidence: jobs retry and fail deterministically, but the health endpoint is shallow and no admin retry/requeue view was found.
   - Impact: failed call processing may require direct database work instead of a safe support workflow.

## Unknowns That Need Live Verification

- Vercel:
  - Whether live production/staging env vars include `ARGOS_TOKEN_ENCRYPTION_KEY`, `ARGOS_RATE_LIMIT_HASH_SECRET`, `ARGOS_INVITE_ONLY`, `ARGOS_ALLOWED_ORIGINS`, `STRIPE_SECRET_KEY`, the expected Stripe price envs, Zoom vars, and any intended GHL vars.
  - Whether root directory/build/install settings match `.vercel/project.json` and the workspace monorepo.
  - Whether Node runtime is really `24.x`, and whether that is intentional.
  - Whether production deployment currently corresponds to the audited commit.

- Supabase:
  - Hosted Auth signup enabled/disabled state.
  - Hosted redirect allowlist and whether broad `https://**.vercel.app/**` is present.
  - Whether all migrations, especially private storage/RLS/rate-limit migrations, are applied in production.
  - Whether `call-recordings` is private in hosted storage.
  - Whether legacy Zoom/GHL tokens have been encrypted.
  - Whether RLS policies behave as expected with real hosted roles.

- Fly worker:
  - Live worker env flags, especially `CALL_PROCESSING_ENABLED`.
  - Current queue depth, failed jobs, retry age, and processing latency.
  - Whether health checks catch degraded DB/OpenAI/storage access.

- GitHub:
  - Whether `.github/workflows/verify.yml` is required by branch protection before merge.
  - Whether DB-backed worker/RLS test job is passing on the default branch and PRs.

- Providers:
  - Zoom callback URL, webhook secret, event subscriptions, and account mapping in the Zoom dashboard.
  - GHL marketplace/callback configuration if the feature is meant to be enabled.
  - Stripe product/price lookup keys and webhook endpoint/signing secret.

## Quick Wins Under 1 Hour

1. Compare live Vercel env vars against `apps/web/.env.example` and add the missing hardening keys.
2. If billing is not ready, hide or disable checkout links until Stripe webhook fulfillment exists.
3. Add a rate limit to `/api/organizations`, `/api/organizations/join`, and `/billing/checkout`.
4. Normalize invite emails to lowercase at invite creation and acceptance.
5. Replace raw 500 error messages in `/api/me` and invite APIs with generic client responses.
6. Add a max body-size guard before `request.text()` in the Zoom webhook route.
7. Wrap GHL and Stripe raw `fetch` calls with the existing timeout helper.
8. Update onboarding copy/options so invite-only users are not told to create or join by slug.
9. Require `ARGOS_RATE_LIMIT_HASH_SECRET` in production instead of falling back to service secrets.
10. Align CI and Vercel Node versions or document why they intentionally differ.

## Larger Remediation Projects

1. Billing fulfillment and entitlements.
   - Add Stripe webhook verification.
   - Persist customer IDs, subscription status, seat quantity, price/lookup key, and extra voice-pack purchases.
   - Enforce plan/pack limits in roleplay, TTS/realtime, training generation, uploads, and seats.
   - Add billing admin UI and tests.

2. Live security configuration runbook.
   - Script env/config checks for Vercel, Supabase, Fly, Zoom, GHL, and Stripe.
   - Add a pre-release checklist for migrations, hosted Auth settings, storage privacy, and provider callbacks.

3. Tenant boundary hardening pass.
   - Inventory all repositories/API routes that use service-role or direct DB access.
   - Add missing org/user scoping tests for representative reads/writes.
   - Keep RLS tests as defense-in-depth, but do not rely on RLS alone where server DB clients bypass it.

4. Worker observability and recovery.
   - Add queue dashboards or admin views for pending/processing/failed jobs.
   - Add requeue/retry/cancel controls.
   - Improve worker health to verify DB, Supabase storage, and OpenAI readiness.

5. Data lifecycle and auditability.
   - Define retention for recordings, transcripts, scores, roleplay sessions, and training outputs.
   - Add deletion/export workflows.
   - Add audit events for admin actions, invites, integrations, billing changes, and sensitive exports.

6. Dependency and static quality cleanup.
   - Clean stale lockfile/workspace artifacts.
   - Add lint/static checks for raw fetch without timeout, raw error response leakage, and server-only secret imports.
   - Rerun dependency audit from a networked environment.

## Suggested Order Of Fixes For The Next 1-2 Weeks

### Day 1: Prove Production Configuration

- Verify live Vercel envs, Supabase hosted Auth settings, redirect allowlist, and applied migrations.
- Add missing hardening keys and redeploy.
- Confirm production login, OAuth callback origin handling, upload, invite send/accept, and integration callback behavior.

### Days 2-3: Prevent Revenue/Product Mismatch

- Either disable checkout links or complete Stripe webhook fulfillment.
- Decide the source of truth for seats, subscription plan, and extra voice packs.
- Add tests for checkout/webhook/entitlement state transitions.

### Days 3-4: Tighten Auth And Invite-Only UX

- Align hosted Supabase signup behavior with invite-only policy.
- Fix onboarding UI so invite-only users see the correct path.
- Normalize invite emails and add rate limits to org create/join and invite accept/lookup.

### Days 4-5: Finish Secret/Data Hardening

- Run token encryption rotation and verify no plaintext integration tokens remain.
- Verify hosted storage privacy and RLS behavior.
- Add generic 500 responses where raw messages leak.
- Add body limits/timeouts for public/provider calls.

### Week 2: Operational Reliability

- Add worker backlog/failure visibility and requeue controls.
- Add usage/cost ledger tied to billing.
- Define data retention/export/delete policy.
- Clean dependency state and add static quality gates.

## Commands Run And Results

| Command | Result |
| --- | --- |
| `git status --short --branch` | Showed dirty current checkout on `codex/operational-layout-calls`; listed modified/untracked files noted above. |
| `git log --oneline --decorate -n 20` | Confirmed `HEAD` at `fd3a03d`, aligned with `origin/main` and `main` at the time checked. |
| `find .. -name AGENTS.md -print` and local file reads | Confirmed repo-level `AGENTS.md` routing instructions. |
| `rg --files` / targeted `nl -ba` reads | Inspected package scripts, CI, Vercel/Fly/Supabase config, auth routes, onboarding, invite routes, upload routes, webhooks, integrations, billing, worker jobs, migrations, and tests. |
| `rg -n "TODO|FIXME|HACK|stub|mock|placeholder|coming soon|not implemented|fake data|hardcoded"` | Found no broad production TODO/FIXME cluster. Most hits were docs, test fixtures, form placeholders, CSS placeholders, or legacy naming. |
| `git ls-files \| rg '(^\|/)\\.env\|\\.env\\.'` | Only tracked env template found was `apps/web/.env.example`. |
| `git check-ignore -v apps/web/.env.local .vercel/.env.production.local .next node_modules` | Confirmed local env files/build output/dependencies are ignored. |
| `awk -F= ... apps/web/.env.local` | Listed local env key names without values. Included OpenAI, Supabase, Zoom, Stripe webhook/seat price, worker, and model keys. |
| `awk -F= ... .vercel/.env.production.local` | Listed locally pulled production env key names without values. Did not list several expected hardening/Stripe/GHL keys. Needs live verification because local pulled files can be stale. |
| `npm run verify` | Passed. Web typecheck passed; web tests passed (90 files, 505 tests); Next build passed; worker typecheck passed; worker tests passed with DB-backed tests skipped locally where no DB was available. |
| `npm ls --workspaces --depth=0` | Exit 0, but reported many extraneous packages in local `node_modules`, suggesting stale install/lockfile noise. |
| `npm audit --omit=dev --audit-level=moderate` | Failed due network DNS error `ENOTFOUND registry.npmjs.org`; no dependency vulnerability result was available. |

## Things Intentionally Not Checked

- I did not access live Vercel, Supabase, Fly, GitHub, Zoom, GHL, Stripe, or OpenAI provider dashboards.
- I did not read or expose secret values from env files; only key names were inventoried.
- I did not modify application code, migrations, configs, tests, package files, or provider settings.
- I did not run destructive database commands, migrations against production, token rotation, or provider webhook tests.
- I did not perform a full dependency vulnerability audit because network access to the npm registry failed.
- I did not do manual browser QA of authenticated flows; this audit focused on code/config/test evidence.
