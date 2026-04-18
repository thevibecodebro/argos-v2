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
- `npm run db:generate`
- `npm run db:studio`
- `npm run test:web`
- `npm run test:worker`
- `npm run typecheck:web`
- `npm run typecheck:worker`

## Worker Call Processing

The worker owns async call processing for manual uploads and Zoom recordings. When `CALL_PROCESSING_ENABLED=true`, it claims jobs from `call_processing_jobs`, downloads the stored source asset, normalizes it to mono 16 kHz MP3, chunks oversized recordings, transcribes them, scores the merged transcript, and persists the final evaluation back to `calls` and `call_moments`.

For local development, `apps/worker/src/index.ts` automatically loads `apps/web/.env` and `apps/web/.env.local` before reading worker config. Keep the worker env values in the same file as the web app unless you explicitly export them in your shell.

Required worker env vars when processing is enabled:

- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `OPENAI_API_KEY`

Optional worker test env var:

- `WORKER_TEST_DATABASE_URL` to force the worker repository integration tests onto a specific local Postgres instance. If unset, the suite will use a local-only `DATABASE_URL` when available, otherwise it will probe the default Supabase local Postgres at `127.0.0.1:54322` and skip the DB-backed tests if that database is not reachable.

Recommended worker env vars:

- `OPENAI_CALL_SCORING_MODEL`
- `OPENAI_CALL_TRANSCRIPTION_MODEL`
- `FFMPEG_BINARY` if you want to override the bundled `ffmpeg-static` binary
- `CALL_PROCESSING_POLL_INTERVAL_MS`
- `CALL_PROCESSING_MAX_SOURCE_BYTES`
- `CALL_PROCESSING_TRANSCRIBE_CONCURRENCY`

The worker still exposes `/health` for uptime checks.

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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Recommended environment scoping:

- Production: set `NEXT_PUBLIC_SITE_URL` to the exact production Vercel URL, for example `https://your-project.vercel.app`
- Preview: leave `NEXT_PUBLIC_SITE_URL` unset and let the login flow use the current deployment origin
- Development: set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
