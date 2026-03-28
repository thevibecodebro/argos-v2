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
