# Production Verification - 2026-05-11

Executed on May 12, 2026 from branch `codex/argos-remediation-sweep`.

## Verdict

Production is not ready to mark remediated.

The local remediation branch is ahead of production and Stripe live billing is not configured in Vercel or Stripe. Hosted Supabase migrations were applied in the May 12 follow-up pass.

## Vercel

- Project: `argos-v2`
- Linked project id: `prj_xKrubkV2SZSMffxrhGoDagymbvzs`
- Root directory: `apps/web`
- Current production deployment: `https://argos-v2-3beppxl8u-thevibecodebro.vercel.app`
- Deployment id: `dpl_DmCUmJs9Umzw6a72W5HsZqeMD3cY`
- Deployment status: Ready
- Deployment created: May 11, 2026 13:03:48 CDT
- Production aliases: `argos-v2-nine.vercel.app`, `argos-v2-thevibecodebro.vercel.app`, `argos-v2-neon-titan-thevibecodebro.vercel.app`
- Deployed Git commit: `82df89debe7ef4851bfc0ca21f723e9a8acdd2c8`
- Current local branch commit at first verification time: `f81e92cecbf47bda66bd8f0b8a5044c1dee12c2e`
- Draft PR branch after follow-up: `codex/argos-remediation-sweep`, PR #15.
- Production build metadata reports `gitDirty=1`, source `cli`, actor `codex`.

Production env names present:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_TRAINING_MODEL`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_REALTIME_VOICE`
- `OPENAI_TTS_MODEL`
- `OPENAI_TTS_VOICE`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_REDIRECT_URI`
- `ZOOM_WEBHOOK_SECRET_TOKEN`
- `ARGOS_INVITE_ONLY`
- `ARGOS_ALLOWED_ORIGINS`
- `ARGOS_TOKEN_ENCRYPTION_KEY`
- `ARGOS_RATE_LIMIT_HASH_SECRET`
- `ARGOS_BOOTSTRAP_ADMIN_EMAILS`
- `ARGOS_GHL_ENABLED`

Production env names missing for completed billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET`
- `GHL_REDIRECT_URI`

HTTP smoke:

- `/login` returned `200`.
- `/settings/people` returned `307` with `location: /login?next=%2Fsettings%2Fpeople`.
- `vercel logs --environment production --since 1h --level error --limit 20 --no-branch --json` returned no error log entries.

## Supabase

- Project ref: `mlluqkmmcfqjmjqoparf`
- Project name: `Argos`
- Status: `ACTIVE_HEALTHY`
- Region: `us-west-2`
- Postgres version: `17.6.1.063`

Initial hosted migration history ended at:

- `202604280001_rate_limit_buckets`
- `202604280002_private_call_recordings`
- `202604280003_rls_policy_hardening`

Local migrations applied to hosted Supabase in the May 12 follow-up pass:

- `20260508012329_restore_org_assets_bucket.sql`
- `202605110001_billing_entitlements.sql`
- `202605110002_roleplay_voice_settlement.sql`
- `202605110003_audit_events_and_call_export.sql`

Hosted migration history now includes:

- `20260512154003_restore_org_assets_bucket`
- `20260512154233_billing_entitlements`
- `20260512155053_roleplay_voice_settlement`
- `20260512155141_audit_events_and_call_export`

Hosted table/RLS check:

- `audit_events`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `billing_customers`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `billing_subscriptions`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `call_processing_jobs`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `rate_limit_buckets`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `stripe_webhook_events`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `voice_credit_grants`: exists, RLS enabled, no direct `anon` or `authenticated` grants.
- `voice_usage_events`: exists, RLS enabled, no direct `anon` or `authenticated` grants.

Storage check:

- `call-recordings` bucket exists.
- `call-recordings.public` is `false`.
- `file_size_limit` is `null`.
- `allowed_mime_types` is `null`.
- `org-assets` bucket exists after follow-up migration.
- `org-assets.public` is `true`.
- `org-assets.file_size_limit` is `2097152`.
- `org-assets.allowed_mime_types` is `image/png`, `image/jpeg`, and `image/webp`.

Auth/provider checks not executed:

- Hosted public email signup setting was not directly inspected because the available Supabase MCP/CLI surfaces did not expose Auth provider configuration.
- A direct production signup attempt was not run because it could create a live Auth user or send email.
- Invite-generated auth link and Google OAuth were not smoke-tested because no live test invite/session was available in this pass.

## Stripe

Stripe CLI default test-mode resources:

- Product `prod_UNyjBFgvN80ze9`, `Argos Paid Seat`, active, `livemode=false`.
- Price `price_1TPCmJHQQsl005RTdGGAFyE6`, lookup key `argos_paid_seat_monthly`, active, `livemode=false`, `$50.00/month`, metadata includes `minimum_seats=3` and `included_live_voice_minutes_per_seat=120`.

Stripe live-mode resources:

- `stripe products list --live --limit 10`: no products.
- `stripe prices list --live --limit 20`: no prices.
- `stripe webhook_endpoints list --live --limit 10`: no webhook endpoints.

Stripe live setup attempt:

- Creating live products/prices was attempted with the currently authenticated Stripe CLI key.
- Stripe rejected product creation because the active live key is a restricted `rk_live...` key without permission for the products endpoint.
- Live Stripe setup requires a full-permission live secret key or dashboard access with product, price, and webhook endpoint creation rights.

Production billing blockers:

- Vercel Production is missing `STRIPE_SECRET_KEY`.
- Vercel Production is missing `STRIPE_WEBHOOK_SECRET`.
- Stripe live mode has no product, no price, and no webhook endpoint.
- Hosted Supabase now has billing, voice entitlement, and audit tables.

## OpenAI Voice

- Vercel Production has `OPENAI_API_KEY` and the realtime/TTS model and voice env names.
- Worker secrets include `OPENAI_API_KEY`, `OPENAI_CALL_SCORING_MODEL`, and `OPENAI_CALL_TRANSCRIPTION_MODEL`.
- Live realtime/TTS roleplay was not invoked because authenticated production browser QA was not available in this pass and this branch is not deployed.
- Local route/service tests cover quota checks, realtime session start, completion settlement, and idempotent voice usage debiting.

## Zoom And GHL

Zoom:

- Vercel Production has `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI`, and `ZOOM_WEBHOOK_SECRET_TOKEN`.
- Zoom OAuth callback and webhook delivery were not externally exercised in this pass.

GHL:

- Vercel Production has `ARGOS_GHL_ENABLED`.
- Vercel Production does not have `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, or `GHL_REDIRECT_URI`.
- Current code requires explicit enablement plus credentials before GoHighLevel is available, so GHL remains gated by missing credentials.

## Worker

- Fly app: `argos-v2-worker-jared`
- Owner: `argos-revenue-command`
- Status: deployed
- Latest deploy: Apr 29, 2026 19:59
- Machine: `2872e44c0e0058`, version `4`, region `lax`, state `started`
- Checks: 1 total, 1 passing
- Worker secrets present: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_CALL_SCORING_MODEL`, `OPENAI_CALL_TRANSCRIPTION_MODEL`, `CALL_PROCESSING_ENABLED`, and processing tuning secrets.
- Direct `curl https://argos-v2-worker-jared.fly.dev/health` could not resolve the host from this environment, so Fly status/checks are the verification source for worker health in this pass.

## Required Before Production Signoff

1. Configure Stripe live products, prices, webhook endpoint, and Vercel Production `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` using a Stripe key with sufficient live permissions.
2. Redeploy the remediation branch or merge it to the production branch and deploy.
3. Run live smoke tests for blocked public signup, invite acceptance, Google OAuth, checkout/webhook entitlement update, roleplay end-and-score voice shutdown, and voice quota enforcement.
4. Verify Zoom OAuth/webhook delivery and worker processing against the deployed remediation commit.
