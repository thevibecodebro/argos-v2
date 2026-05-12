# Production Verification - 2026-05-11

Executed on May 12, 2026 from branch `codex/argos-remediation-sweep`; updated after PR #15 was merged to `main` and deployed to production.

## Verdict

Production has the remediation sweep deployed and safe unauthenticated smoke checks passed.

Full operational signoff still needs an authenticated live test account/invite path to exercise invite acceptance, checkout completion/webhook entitlement update, roleplay end-and-score voice shutdown, and voice quota exhaustion without using a real customer account.

## Vercel

- Project: `argos-v2`
- Linked project id: `prj_xKrubkV2SZSMffxrhGoDagymbvzs`
- Root directory: `apps/web`
- Current production deployment: `https://argos-v2-gjm15ic6r-thevibecodebro.vercel.app`
- Deployment id: `dpl_4J1EF3WQv9vvWR19Z49XwvJzgtvA`
- Deployment status: Ready
- Deployment created: May 12, 2026 14:18:29 CDT
- Production aliases: `argos-v2-nine.vercel.app`, `argos-v2-thevibecodebro.vercel.app`, `argos-v2-git-main-thevibecodebro.vercel.app`
- Deployed Git commit: `3d3587e410300e62fbfc20313a74b466fe4b86b3`
- Current local branch commit at first verification time: `f81e92cecbf47bda66bd8f0b8a5044c1dee12c2e`
- PR #15 was squash-merged into `main`.

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
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Production env names missing for completed billing:

- `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET`
- `GHL_REDIRECT_URI`

Production Stripe env names added in follow-up:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

HTTP smoke:

- `/login` returned `200`.
- `/settings/people` returned `307` with `location: /login?next=%2Fsettings%2Fpeople`.
- `/onboarding` returned `307` with `location: /login?next=%2Fonboarding`.
- `/billing/checkout?plan=team&seats=3` returned `307` with `location: /login?next=%2Fbilling%2Fcheckout%3Fplan%3Dteam%26seats%3D3`.
- `POST /api/webhooks/stripe` with an invalid signature returned `400` and `{"error":"Invalid Stripe signature."}`, confirming the production webhook secret is configured at runtime.
- `/api/health` returned `{"ok":true,"service":"@argos-v2/web"}`.
- The rendered `/login` HTML had no `sign up`, `signup`, `create account`, `create an account`, `join as`, or `create organization` text.
- `vercel logs --environment production --since 10m --level error --limit 20 --no-branch --json` returned no error log entries.

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

- Products:
  - `prod_argos_solo`
  - `prod_argos_team`
  - `prod_argos_extra_voice_minutes`
- Prices:
  - `argos_solo_monthly`: `price_1TWJVlHQQsl005RT8PUT4K2M`, `$79.00/month`
  - `argos_solo_annual`: `price_1TWJVlHQQsl005RTdZ2NpBmw`, `$853.20/year`
  - `argos_paid_seat_monthly`: `price_1TWJVlHQQsl005RTlgw5MlDy`, `$50.00/seat/month`
  - `argos_paid_seat_annual`: `price_1TWJVlHQQsl005RToMCjmJct`, `$540.00/seat/year`
  - `argos_extra_minutes_250`: `price_1TWJW2HQQsl005RTf6ybYHHg`, `$125.00`
  - `argos_extra_minutes_500`: `price_1TWJW2HQQsl005RTX19VEP6n`, `$175.00`
  - `argos_extra_minutes_2000`: `price_1TWJW2HQQsl005RTmmElUZRd`, `$600.00`
- Webhook endpoint:
  - `we_1TWJWQHQQsl005RT9NfxzKZP`
  - URL: `https://argos-v2-thevibecodebro.vercel.app/api/webhooks/stripe`
  - API version: `2026-02-25.clover`
  - Enabled events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

Stripe live setup attempt:

- Initial live setup was blocked because the active live key was restricted and lacked product endpoint permissions.
- After Stripe CLI permission updates, live products, prices, and webhook endpoint creation succeeded.
- Vercel Production now has a durable live Stripe runtime key stored as sensitive `STRIPE_SECRET_KEY`.

Production billing blockers:

- Vercel Production has `STRIPE_SECRET_KEY`.
- Vercel Production has `STRIPE_WEBHOOK_SECRET`.
- Stripe live products, prices, and webhook endpoint now exist.
- Hosted Supabase now has billing, voice entitlement, and audit tables.

## OpenAI Voice

- Vercel Production has `OPENAI_API_KEY` and the realtime/TTS model and voice env names.
- Worker secrets include `OPENAI_API_KEY`, `OPENAI_CALL_SCORING_MODEL`, and `OPENAI_CALL_TRANSCRIPTION_MODEL`.
- Live realtime/TTS roleplay was not invoked because authenticated production browser QA was not available in this pass.
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

## Remaining Authenticated Smoke

1. Exercise invite acceptance with a live test invite or controlled test account.
2. Complete a live/test-mode checkout path appropriate for the production Stripe account and verify webhook entitlement updates.
3. Run roleplay end-and-score with audio and verify browser voice shutdown plus usage settlement.
4. Force or seed a quota-exhausted test state and verify realtime/TTS is blocked before provider calls.
5. Verify Zoom OAuth/webhook delivery and worker processing against the deployed remediation commit.
