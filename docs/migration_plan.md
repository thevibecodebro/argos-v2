# Next.js 15 + Supabase Replatform Migration Plan

**Goal:** Replace the current Vite/Express/Replit stack with a Next.js 15 App Router web app on Vercel, Supabase for auth/database/storage, and a dedicated Node worker for AI/media/realtime, while preserving full feature parity and migrating existing business data.

**Architecture:** Keep the product API-centric rather than rewriting everything around browser-direct Supabase queries. The new web app owns UI, SSR auth, and normal JSON APIs; a separate worker owns long-running jobs, webhooks, storage-side ingestion, and the realtime roleplay WebSocket. Supabase becomes the managed platform layer for auth, Postgres, and object storage; Drizzle remains the application's typed DB access layer.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui, TanStack Query, Supabase Auth, Supabase Postgres, Supabase Storage, Drizzle ORM, `pg-boss` job queue, dedicated Node worker (default: Fly.io), Vercel for web hosting.

---

## Summary

- This is a big-bang rewrite with full parity, but the implementation should still be staged internally: foundation, parity build-out, data migration rehearsal, then one production cutover.
- The new stack should preserve the existing API-centric shape. Keep `/api/*` JSON contracts as stable as practical so the frontend migration can reuse existing generated client/types patterns.
- Do not force AI/media/realtime into Next route handlers. Next handles normal APIs and auth; the worker handles transcription, scoring, Zoom/GHL background work, and the realtime voice socket.
- Existing business data is migrated to Supabase Postgres. Historical media files are not migrated; old calls keep metadata/transcripts/scores/highlights but are marked as legacy calls without playable recordings.
- The first web auth experience is Supabase magic link + Google, but migrated users should claim their migrated accounts via magic link first to avoid duplicate identity creation during cutover.

## Key Implementation Changes

### 1. Platform and repo reshape

- Make the repo root the real application root; retire the current nested `argos-main` shape after migration.
- Create a new workspace split:
  - `apps/web` for the Next.js 15 App Router application.
  - `apps/worker` for the long-running Node worker and realtime WebSocket service.
  - `packages/db` for Drizzle schema/query layer.
  - `packages/ui` for shared shadcn/ui-based components ported from the current UI.
  - `packages/api-contract` or equivalent to preserve typed API contracts and generated client behavior.
  - `supabase/` for project config, auth/storage setup, SQL policies, and deployment env docs.
- Preserve the existing visual design and component language; port the current `components/ui` primitives and page shells instead of redesigning the app during the migration.

### 2. Web app architecture in Next.js 15

- Replace `wouter` routing with App Router route segments and `next/navigation`.
- Use Server Components for initial page shells and auth-gated layout loading.
- Keep TanStack Query for the highly interactive screens: dashboards, training flows, roleplay, notifications, and call detail interactions.
- Use Route Handlers for the product API surface and external callbacks. Use Server Actions only for small local form mutations where there is no API reuse pressure.
- Preserve the current user-facing route map: login, dashboard, calls library/detail/upload, highlights, team, rep profile, training, settings, notifications, onboarding, roleplay, compliance, integrations.
- Preserve the current API namespace shape under `/api/*` so frontend migrations stay mechanical and mobile can be added later without another backend rewrite.

### 3. Auth redesign with Supabase

- Remove Replit OIDC, session cookies backed by the `sessions` table, and the `replit-auth-web` package.
- Use Supabase SSR auth in the Next app for browser sessions; server code resolves the signed-in Supabase user and then loads the matching application user row.
- Keep a single-org app model in v1 to minimize migration risk:
  - `users.id` becomes the Supabase auth UUID.
  - Keep `users.orgId`, `users.role`, profile fields, and current role semantics (`rep`, `manager`, `executive`, `admin`).
  - Add `legacyReplitUserId` as a nullable unique migration field for traceability.
- Auth launch behavior:
  - Existing migrated users are pre-created in Supabase Auth and must first enter via magic link claim.
  - Google OAuth is enabled at launch, but only after an account has been claimed once via magic link for migrated users.
  - Net-new users can use magic link or Google immediately.
- Keep browser access to business data going through your own API layer. Supabase Auth is the identity system; it is not the primary business API.

### 4. Database and storage redesign

- Keep Drizzle as the typed query layer for the web app and worker.
- Use Supabase Postgres as the new database target. Migrate the existing business tables with minimal semantic drift:
  - `organizations`
  - `users`
  - `calls`
  - `call_moments`
  - `call_annotations`
  - `org_compliance`
  - `roleplay_sessions`
  - `training_modules`
  - `training_progress`
  - `zoom_integrations`
  - `ghl_integrations`
  - `notifications`
- Drop `sessions` entirely.
- Replace local-disk recording access with storage-backed metadata:
  - Replace direct filesystem URLs with bucket/path/status fields.
  - For new files, the app serves signed playback/download URLs via API.
  - For migrated historical calls, media fields remain null and the UI shows a clear "legacy recording unavailable" state while keeping transcripts, scores, and highlights accessible.
- Use Supabase Storage for all new uploads and worker-produced artifacts. The browser uploads directly via signed upload URLs; the worker reads from storage for processing.

### 5. API and job migration

- Rebuild the current Express route surface as Next Route Handlers wherever the workload is normal request/response:
  - health
  - auth/session read endpoints
  - users/org membership and profile
  - calls list/detail/annotations/highlights metadata
  - dashboards
  - compliance
  - training
  - notifications
  - integration status/connect/disconnect initiation
- Move long-running or socket-heavy workloads to the worker:
  - call transcription and AI scoring
  - Zoom recording download + ingestion
  - GHL sync/background actions
  - TTS/audio processing
  - realtime voice roleplay WebSocket proxy
  - any ffmpeg/ffprobe work
- Use `pg-boss` on Supabase Postgres as the durable queue:
  - enqueue from Next API after upload/create actions
  - consume in the worker
  - persist job state to the existing `calls.status` / `roleplay_sessions.status` model where applicable
- Realtime roleplay architecture:
  - Next creates/authorizes roleplay sessions and returns the signed worker WS endpoint/token.
  - Browser connects directly to the worker WebSocket for `/roleplay/sessions/:id/realtime`.
  - Worker persists transcript chunks and evaluation results back to Supabase Postgres.

### 6. Integrations and external callbacks

- Keep Zoom and GHL in v1 for full parity.
- OAuth initiation may start in Next; callbacks and durable token persistence stay server-side.
- Webhook receivers should terminate in the worker or a dedicated ingestion route that immediately hands work to the queue.
- Secrets move from Replit envs into Vercel, Fly.io, and Supabase-managed secrets according to ownership:
  - web-only secrets in Vercel
  - worker-only secrets in Fly.io
  - Supabase keys split between anon usage in the browser and service-role usage only in trusted server/worker code
- Keep encryption for stored third-party tokens; do not store provider tokens as plaintext app data.

### 7. Data migration and cutover

- Build a repeatable migration pipeline and rehearse it on a production snapshot before the real cutover.
- Migration order:
  1. Export current business data from the existing Postgres database.
  2. Provision Supabase project, schema, auth config, storage buckets, and queue tables.
  3. Pre-create Supabase auth users for all existing emails.
  4. Build an old-user-ID to new-auth-UUID mapping.
  5. Transform and import app tables using the new UUIDs.
  6. Exclude the old `sessions` table.
  7. Mark all historical calls as `recordingStatus = unavailable` or equivalent, with transcripts/scores retained.
- Production cutover:
  - Freeze writes on the old system during the cutover window.
  - Run the final export/import mapping job.
  - Run smoke tests on the migrated production target.
  - Switch DNS/webhook/provider callback URLs.
  - Send migrated-user claim email flow.
  - Keep the old stack available read-only for a rollback window, but do not dual-write.

## Public API / Interface Changes

- Remove Replit-auth endpoints and behaviors:
  - `/api/login`
  - `/api/callback`
  - `/api/logout`
  - `/api/mobile-auth/token-exchange`
  - any cookie/session semantics tied to the `sid` cookie and DB sessions table
- Replace them with:
  - Supabase SSR session handling in the web app
  - app-level current-user endpoints based on Supabase-authenticated user ID
  - magic-link claim flow for migrated accounts
- Keep the rest of `/api/*` route shapes as stable as practical so existing page logic, OpenAPI contracts, and generated query hooks can be ported instead of redesigned.
- User identity type changes:
  - from Replit OIDC string `sub`
  - to Supabase auth UUID
- File interface changes:
  - old local `/api/files/:orgId/:filename`
  - to signed storage URL issuance for new media and explicit legacy-media-unavailable behavior for old records

## Test Plan

### Migration validation

- Rehearse the full export -> transform -> import flow on a snapshot.
- Verify row counts and FK integrity for every migrated table.
- Verify migrated users can claim accounts via magic link and land on the correct org/role.
- Verify historical calls render correctly without media but with transcript/score/highlights intact.

### Auth and authorization

- Magic link sign-in for migrated users.
- Google sign-in for net-new users.
- Role enforcement for rep/manager/executive/admin on every protected route.
- Unauthorized cross-org access attempts on calls, training, team, and integrations.

### Core product parity

- Dashboard reads and aggregate metrics.
- Call upload flow with direct storage upload, queue enqueue, transcription, scoring, and notification.
- Call detail, highlights, and annotations.
- Training creation, assignment, quiz, progress, and team progress.
- Notifications list and read-state behavior.
- Settings/profile/org membership and role-change flows.
- Compliance activation and consent gate behavior.

### Integrations and realtime

- Zoom OAuth connect, webhook ingest, storage write, queued evaluation, and call creation.
- GHL connect/status/disconnect and downstream sync behavior.
- Text roleplay session lifecycle.
- Voice roleplay WebSocket connection, transcript persistence, evaluation, and reconnect/error handling.

### Release readiness

- E2E smoke suite across login, upload, scoring, training, settings, and roleplay.
- Load test queue-backed scoring and webhook bursts.
- Verify Vercel web deployment and worker deployment independently.
- Verify rollback playbook against the frozen pre-cutover export.

## Assumptions and Defaults

- Rollout is big-bang rewrite, not phased production coexistence.
- Scope is full parity, including roleplay realtime voice, Zoom/GHL integrations, training, notifications, and compliance.
- Deployment target is Vercel for web + Supabase + dedicated Node worker, with Fly.io as the default worker host.
- Existing business data is migrated; historical media files are not.
- The migration is web-first but mobile-future-ready; no dedicated mobile auth/token-exchange API is required in v1.
- The app remains API-centric. Browser clients do not query Supabase business tables directly.
- Drizzle stays as the typed DB layer; Supabase is used for auth, managed Postgres, storage, and platform services.
- Migrated users claim accounts with magic link first; Google login is enabled at launch but not used as the first-claim path for migrated users.

## Reference Docs

- Next.js App Router migration: https://nextjs.org/docs/app/guides/migrating/app-router-migration
- Next.js route handlers: https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware
- Supabase Next.js auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase SSR for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
