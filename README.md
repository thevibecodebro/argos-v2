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
- Worker HTTP health server in `apps/worker`
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
