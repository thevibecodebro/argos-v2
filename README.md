# Argos V2

Next.js 15 + Supabase replatform for Argos.

## Workspaces

- `apps/web`: Next.js 15 App Router application
- `apps/worker`: background worker foundation for AI/media/realtime jobs
- `packages/db`: shared Drizzle schema package
- `packages/ui`: shared UI primitives
- `docs`: migration and execution documents

## Current foundation

- Next.js 15 App Router web shell in `apps/web`
- Supabase SSR auth plumbing with middleware, callback route, and login screen
- Tailwind v4 styling and shared `@argos-v2/ui` button primitive
- Drizzle database client + dashboard summary feature slice
- Worker queue polling for call transcription/scoring in `apps/worker`
- Shared Drizzle schema package in `packages/db`

## Commands

- `npm run dev:web`
- `npm run dev:worker`
- `npm run build:web`
- `npm run db:generate`
- `npm run db:studio`
- `npm run test:web`
- `npm run test:worker`
- `npm run typecheck:db`
- `npm run typecheck:web`
- `npm run typecheck:worker`
- `npm run verify:db`
- `npm run verify:web`
- `npm run verify:worker`
- `npm run verify`

## Worker Call Processing

The worker owns async call processing for manual uploads and Zoom recordings. When `CALL_PROCESSING_ENABLED=true`, it claims jobs from `call_processing_jobs`, downloads the stored source asset, normalizes it to mono 16 kHz MP3, chunks oversized recordings, transcribes them, scores the merged transcript, and persists the final evaluation back to `calls` and `call_moments`.

For local development, `apps/worker/src/index.ts` automatically loads `apps/web/.env` and `apps/web/.env.local` before reading worker config. Keep the worker env values in the same file as the web app unless you explicitly export them in your shell.

Required worker env vars when processing is enabled:

- `APP_ENV`
- `DATABASE_ENVIRONMENT`
- `SUPABASE_ENVIRONMENT`
- `OPENAI_ENVIRONMENT`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `OPENAI_API_KEY`

Optional worker test env var:

- `WORKER_TEST_DATABASE_URL` to force the worker repository integration tests onto a specific local Postgres instance. If unset, the suite will use a local-only `DATABASE_URL` when available, otherwise it will probe the default Supabase local Postgres at `127.0.0.1:54322` and skip the DB-backed tests if that database is not reachable.

Recommended worker env vars:

- `OPENAI_CALL_SCORING_MODEL`
- `OPENAI_BUYER_PERSONALITY_MODEL`
- `OPENAI_CALL_TRANSCRIPTION_MODEL`
- `FFMPEG_BINARY` if you want to override the bundled `ffmpeg-static` binary
- `CALL_PROCESSING_POLL_INTERVAL_MS`
- `CALL_PROCESSING_MAX_SOURCE_BYTES`
- `CALL_PROCESSING_TRANSCRIBE_CONCURRENCY`
- `CALL_PROCESSING_V2_ENABLED` (default `false`; set on both the web app and worker only after the checkpoint migration is applied)
- `CALL_PROCESSING_HEARTBEAT_INTERVAL_MS` (default `30000`)
- `CALL_PROCESSING_MAX_ELAPSED_MS` (default `21600000`, six hours)
- `CALL_PROCESSING_TRANSCRIPTION_TIMEOUT_MS` (default `120000`)

The worker still exposes `/health` for uptime checks.

### Resumable processing rollout

The additive `call_processing_checkpoints` migration introduces version-2 jobs. Version 2 renews a fenced lease, checkpoints each completed transcription chunk, resumes profile/scoring from saved output, and commits the call result, job completion, and notification in one transaction. Legacy jobs remain version 1 and do not change behavior.

Roll out in this order:

1. Apply the migration and verify that `call_processing_chunks` and `call_processing_checkpoints` have RLS enabled with no `anon` or `authenticated` grants.
2. Deploy the web and worker code with `CALL_PROCESSING_V2_ENABLED=false`.
3. Drain active version-1 jobs, then set `CALL_PROCESSING_V2_ENABLED=true` on both the web app and worker for a controlled canary upload.
4. Verify structured `call_processing.*` worker events, chunk progress, a forced retry, one completion notification, and full transcript coverage before broader enrollment.

To stop enrollment, set the flag back to `false`; existing version-2 jobs still require the compatible worker to finish. Do not roll the worker back to a build that ignores `processing_version`, and do not delete checkpoint rows during rollback. Admin retry creates a fresh version-2 generation so incompatible checkpoints are not reused.

## Vercel Web Deploy

Use these settings for the web app project:

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Include source files outside Root Directory in the Build Step: enabled
- Install Command: leave default
- Build Command: leave default
- Output Directory: leave default
- Automatically expose System Environment Variables: enabled

Set these Vercel environment variables for `apps/web`:

- `APP_ENV`
- `SUPABASE_ENVIRONMENT`
- `DATABASE_ENVIRONMENT`
- `OPENAI_ENVIRONMENT`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `ARGOS_ALLOWED_ORIGINS`
- `ARGOS_INVITE_ONLY`
- `ARGOS_BOOTSTRAP_ADMIN_EMAILS`
- `ARGOS_TOKEN_ENCRYPTION_KEY`
- `ARGOS_RATE_LIMIT_HASH_SECRET`
- `RESEND_API_KEY`
- `ARGOS_FEEDBACK_TO`
- `ARGOS_FEEDBACK_FROM`
- `ARGOS_ONBOARDING_FROM`
- `ARGOS_ONBOARDING_URL`
- `ARGOS_GHL_ENABLED`
- `ARGOS_GOOGLE_MEET_ENABLED`
- `ARGOS_INGESTION_TITLE_FILTERS_ENFORCED`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_REDIRECT_URI`
- `ARGOS_WEBHOOK_URL`
- `ZOOM_WEBHOOK_SECRET_TOKEN`
- `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET`
- `GHL_REDIRECT_URI`
- `GHL_WEBHOOK_TOKEN`
- `GHL_IMPORT_ENABLED`
- `GHL_IMPORT_POLL_INTERVAL_MS`
- `GHL_SYNC_INTERVAL_MS`
- `GHL_SYNC_POLL_INTERVAL_MS`
- `GOOGLE_MEET_CLIENT_ID`
- `GOOGLE_MEET_CLIENT_SECRET`
- `GOOGLE_MEET_REDIRECT_URI`
- `GOOGLE_MEET_IMPORT_ENABLED`
- `GOOGLE_MEET_IMPORT_POLL_INTERVAL_MS`
- `GOOGLE_MEET_SYNC_INTERVAL_MS`
- `GOOGLE_MEET_SYNC_POLL_INTERVAL_MS`
- `OPENAI_API_KEY`
- `OPENAI_CALL_SCORING_MODEL`
- `OPENAI_BUYER_PERSONALITY_MODEL`
- `OPENAI_TRAINING_MODEL`

Recommended environment scoping:

- Production: set `APP_ENV`, `SUPABASE_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, and `OPENAI_ENVIRONMENT` to `production` before privileged clients can boot.
- Production: set `NEXT_PUBLIC_SITE_URL` to the exact production URL, `https://argosrevenuecommand.com`
- Production: set `GHL_REDIRECT_URI=https://argosrevenuecommand.com/api/integrations/leadconnector/callback` so the GoHighLevel Marketplace app uses the white-label-safe callback alias
- Production: set `ARGOS_ONBOARDING_FROM` to `Argos Revenue Command <onboarding@hello.argosrevenuecommand.com>` after the `hello.argosrevenuecommand.com` sending domain is verified in Resend
- Preview: leave `NEXT_PUBLIC_SITE_URL` unset and let the login flow use the current deployment origin
- Development: set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
