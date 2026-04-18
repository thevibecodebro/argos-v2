# API Spec Drift Audit

Date: 2026-04-17

## Scope

This audit compares the active backend route surface in `apps/web/app/api/**/route.ts` against:

- the archived legacy OpenAPI contract in `archive/argos-legacy/argos-main/lib/api-spec/openapi.yaml`
- the newly restored active contract in `packages/api-spec/openapi.json`
- the regenerated client and Zod packages in `packages/api-client` and `packages/api-zod`

The current backend is a Next.js route-handler app, not the legacy Express service. The legacy spec and codegen output had drifted far enough that they no longer described the live API surface used by the frontend.

## Findings

### Critical

1. The repo had no active maintained OpenAPI source for the current backend route surface.
2. The only codegen pipeline in-tree was archived legacy Orval output and did not match the active Next.js API.

### High

1. Frontend-used routes for teams, invites, roleplay, call upload, training team progress, and OAuth connect flows were undocumented.
2. Legacy contract definitions for `/calls`, `/dashboard/rep`, `/training/progress`, `/healthz`, and related endpoints no longer matched live handler behavior.
3. The onboarding UI still presented direct org-slug self-join even though backend behavior now correctly rejects it with `403`.

### Medium

1. Query parameters on live handlers had grown beyond the archived spec. The biggest example was `/calls`, which now supports `search`, `status`, `sortBy`, `sortOrder`, `minScore`, and `maxScore` in addition to pagination and `repId`.
2. The frontend had no cheap automated check that its `/api/*` usage was represented in the contract.

## Patches Applied

1. Added an active OpenAPI source at `packages/api-spec/openapi.json`.
2. Added an active Orval config at `packages/api-spec/orval.config.ts`.
3. Regenerated typed client output in `packages/api-client/src/generated`.
4. Regenerated Zod output in `packages/api-zod/src/generated`.
5. Added a drift guard test in `apps/web/lib/api-spec-drift.test.ts`.
6. Removed the stale direct-join UI from `apps/web/components/onboarding-panel.tsx` and aligned the copy with backend behavior.
7. Fixed the onboarding submit loading-state bug so the invite flow can progress after successful org creation.

## Lightweight Guard

The repo now has:

- `npm run api:generate`
- `npm run api:guard`

`api:guard` fails when:

1. the frontend uses a `/api/*` path that is not documented in `packages/api-spec/openapi.json`
2. the active spec documents an operation that does not exist in `apps/web/app/api/**/route.ts`

## Route Audit Table

| Route | Methods | In Legacy Spec | In Active Spec | Frontend Use | Notes |
| --- | --- | --- | --- | --- | --- |
| `/calls/{id}/annotations/{annotationId}` | `DELETE` | no | yes | yes | |
| `/calls/{id}/annotations` | `GET,POST` | no | yes | yes | |
| `/calls/{id}/highlights` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/calls/{id}/moments/{momentId}/highlight` | `PATCH` | yes | yes | yes | |
| `/calls/{id}` | `GET,PATCH` | yes | no | no | backend-only; not yet in active spec |
| `/calls/{id}/status` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/calls` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/calls/scores/trend` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/calls/upload` | `POST` | no | yes | yes | |
| `/compliance/consent` | `POST` | yes | yes | yes | |
| `/compliance/status` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/dashboard/badges/{repId}` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/dashboard/badges` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/dashboard/executive` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/dashboard/leaderboard` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/dashboard/manager` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/dashboard/rep` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/dashboard/setup-status` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/dashboard/summary` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/health` | `GET` | no | yes | no | renamed from legacy `/healthz` |
| `/highlights` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/integrations/ghl/callback` | `GET` | no | no | no | OAuth callback; backend-only; not yet in active spec |
| `/integrations/ghl/connect` | `GET` | no | yes | yes | browser redirect OAuth flow |
| `/integrations/ghl/disconnect` | `POST` | no | yes | yes | |
| `/integrations/ghl/status` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/integrations/zoom/callback` | `GET` | no | no | no | OAuth callback; backend-only; not yet in active spec |
| `/integrations/zoom/connect` | `GET` | no | yes | yes | browser redirect OAuth flow |
| `/integrations/zoom/disconnect` | `POST` | yes | yes | yes | |
| `/integrations/zoom/status` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/invites/{token}/accept` | `POST` | no | yes | yes | |
| `/invites/{token}` | `DELETE` | no | yes | yes | |
| `/invites` | `GET,POST` | no | yes | yes | |
| `/leaderboard` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/me` | `GET,PATCH` | yes | yes | yes | |
| `/notifications/{id}/read` | `POST` | yes | yes | yes | |
| `/notifications/read-all` | `POST` | yes | yes | yes | |
| `/notifications` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/organizations/join` | `POST` | yes | yes | no | deprecated compatibility route; self-join intentionally blocked |
| `/organizations/members/{userId}/primary-manager` | `PATCH` | no | yes | no | |
| `/organizations/members/{userId}` | `DELETE,PATCH` | no | yes | yes | |
| `/organizations/members` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/organizations` | `POST` | yes | yes | yes | |
| `/roleplay/personas` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/roleplay/sessions/{id}/complete` | `POST` | no | yes | yes | |
| `/roleplay/sessions/{id}/messages` | `POST` | no | yes | yes | |
| `/roleplay/sessions/{id}/realtime` | `GET,POST` | no | yes | yes | |
| `/roleplay/sessions/{id}` | `GET` | no | yes | yes | |
| `/roleplay/sessions` | `GET,POST` | no | yes | yes | |
| `/roleplay/tts` | `POST` | no | yes | yes | |
| `/team/{repId}` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/team` | `GET` | no | no | no | backend-only; not yet in active spec |
| `/teams/{teamId}/grants` | `POST` | no | yes | no | |
| `/teams/{teamId}/members` | `DELETE,POST` | no | yes | no | |
| `/teams/{teamId}` | `PATCH` | no | yes | no | |
| `/teams` | `GET,POST` | no | yes | yes | |
| `/training/ai-status` | `GET` | yes | no | no | backend-only; not yet in active spec |
| `/training/modules/{id}/assign/{repId}` | `DELETE` | yes | yes | yes | |
| `/training/modules/{id}/assign` | `POST` | yes | yes | yes | |
| `/training/modules/{id}/generate` | `POST` | no | yes | yes | |
| `/training/modules/{id}/progress` | `POST` | yes | yes | yes | |
| `/training/modules/{id}` | `GET,PATCH` | yes | yes | yes | |
| `/training/modules/generate` | `POST` | yes | yes | yes | |
| `/training/modules` | `GET,POST` | yes | yes | yes | |
| `/training/team-progress` | `GET` | no | yes | yes | replaces legacy `/training/progress` |
| `/webhooks/zoom` | `POST` | yes | no | no | provider webhook; backend-only; not yet in active spec |

## Notable Drift Examples

### Undocumented frontend-used endpoints before this pass

- `/teams`
- `/invites`
- `/roleplay/sessions`
- `/roleplay/tts`
- `/calls/upload`
- `/training/team-progress`
- `/integrations/zoom/connect`
- `/integrations/ghl/connect`

### Query drift examples

1. `/calls`
   - legacy spec: `repId`, `limit`, `offset`
   - live handler: `repId`, `search`, `status`, `sortBy`, `sortOrder`, `minScore`, `maxScore`, `limit`, `offset`
2. `/calls/scores/trend`
   - live handler supports `repId` and `days`
   - no legacy contract coverage
3. `/dashboard/rep` and `/dashboard/badges`
   - live handlers support optional `repId`
   - coverage in legacy contract was incomplete or absent

## Verification

Verified in this pass with:

```bash
npm run api:generate
npm run api:guard
npm run typecheck:web
npx tsc --noEmit --moduleResolution bundler --module ESNext --target ES2022 --lib ES2022,DOM packages/api-client/src/index.ts packages/api-zod/src/index.ts
```

All commands completed successfully.
