# Authorization And Multitenancy Audit

Date: `2026-04-17`

## Route Audit Table

Legend:
- Roles: `rep`, `manager`, `executive`, `admin`
- Scope terms: `self` = current user only, `team-scoped` = reps reachable through team grants, `org-wide` = current org only

### Public / System

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/health` | `GET` | Public | None | None |
| `/api/webhooks/zoom` | `POST` | Zoom only | Resolved from stored webhook token | Valid webhook signature/token; no user session |

### Identity / Personal Data

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/me` | `GET`, `PATCH` | Any authenticated user | Self only | Only the caller's profile can be read/updated |
| `/api/notifications` | `GET` | Any authenticated user | Self only | Returns only notifications addressed to caller |
| `/api/notifications/read-all` | `POST` | Any authenticated user | Self only | Marks only caller's notifications read |
| `/api/notifications/[id]/read` | `POST` | Any authenticated user | Self only | Notification id must belong to caller |

### Onboarding / Organizations / Invites

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/organizations` | `POST` | Authenticated user without an org | Creates new org only | Caller must not already belong to an org |
| `/api/organizations/join` | `POST` | Authenticated user without an org | None; direct join disabled | Must use invite flow instead of slug-based self-join |
| `/api/invites` | `GET`, `POST` | `admin` only | Current org only | Pending invite email uniqueness within org; invited team ids must belong to org |
| `/api/invites/[token]` | `DELETE` | `admin` only | Current org only | Token must resolve to invite in caller's org |
| `/api/invites/[token]/accept` | `POST` | Authenticated user without an org | Invite's org only | Token must exist, not be expired/accepted, and invite email must match caller email |
| `/api/organizations/members` | `GET` | `executive`, `admin` | Current org only | Lists only members in caller's org |
| `/api/organizations/members/[userId]` | `PATCH`, `DELETE` | `admin` only | Current org only | Target user must belong to caller org; admins cannot remove themselves |
| `/api/organizations/members/[userId]/primary-manager` | `PATCH` | `admin` only | Current org only | `repId` and `managerId` must both belong to caller org with correct roles |

### Teams / Roster / Grants

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/teams` | `GET`, `POST` | `admin` only | Current org only | Team list/create limited to caller org |
| `/api/teams/[teamId]` | `PATCH` | `admin` only | Current org only | Target team must belong to caller org |
| `/api/teams/[teamId]/members` | `POST`, `DELETE` | `admin` only | Current org only | Team and user must both belong to caller org; membership type must match real user role |
| `/api/teams/[teamId]/grants` | `POST` | `admin` only | Current org only | Manager must belong to caller org and already be a manager member of target team |

### Calls / Highlights / Annotations

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/calls` | `GET` | `rep`, `manager`, `executive`, `admin` | `self` for reps, `team-scoped` for managers, `org-wide` for exec/admin | If `repId` filter is supplied, target rep must be a same-org rep and visible to caller |
| `/api/calls/upload` | `POST` | Any authenticated org member | Current org only | Upload is always recorded against caller's own user id |
| `/api/calls/[id]` | `GET`, `PATCH` | `rep`, `manager`, `executive`, `admin` | Current org only | Call must belong to caller org; reps can only rename their own calls |
| `/api/calls/[id]/status` | `GET` | `rep`, `manager`, `executive`, `admin` | Current org only | Same object-level guard as call detail |
| `/api/calls/[id]/highlights` | `GET` | `rep`, `manager`, `executive`, `admin` | Current org only | Same object-level guard as call detail |
| `/api/calls/[id]/annotations` | `GET`, `POST` | `GET`: visible caller; `POST`: rep self, coaching manager, admin | Current org only | Call must belong to caller org and target rep must be visible; posting requires coaching access |
| `/api/calls/[id]/annotations/[annotationId]` | `DELETE` | Annotation author, coaching manager, admin | Current org only | Call must belong to caller org; non-authors need coaching access to target rep |
| `/api/calls/[id]/moments/[momentId]/highlight` | `PATCH` | Highlight-managing manager or admin | Current org only | Call must belong to caller org and target rep must be in highlight-manage scope |
| `/api/highlights` | `GET` | `rep`, `manager`, `executive`, `admin` | `self` for reps, visible highlights for managers, org-wide for exec/admin | Highlighted calls must still resolve to visible reps |
| `/api/calls/scores/trend` | `GET` | `rep`, `manager`, `executive`, `admin` | `self` by default, otherwise same-org target rep only | `repId` drill-in must resolve to a same-org rep visible to caller |

### Dashboard / Team Views / Leaderboards

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/dashboard/summary` | `GET` | Any authenticated user | Self only | No cross-user parameters |
| `/api/dashboard/rep` | `GET` | `rep`, `manager`, `executive`, `admin` | Self by default; rep drill-ins are same-org only | `repId` must be a same-org rep; managers additionally need analytics visibility for that rep |
| `/api/dashboard/manager` | `GET` | `manager`, `executive`, `admin` | Current org only | Managers see only granted-team reps; exec/admin see org-wide |
| `/api/dashboard/executive` | `GET` | `executive`, `admin` | Current org only | Org-wide aggregate only |
| `/api/dashboard/leaderboard` | `GET` | Any authenticated org member | Current org only | Aggregate leaderboard only; no arbitrary rep drill-in |
| `/api/dashboard/badges` | `GET` | Any authenticated user | Self only | No cross-user parameters |
| `/api/dashboard/badges/[repId]` | `GET` | `manager`, `executive`, `admin`, or rep for self | Same-org target rep only | `repId` must be a same-org rep; managers need analytics visibility |
| `/api/dashboard/setup-status` | `GET` | `executive`, `admin` | Current org only | Org-wide onboarding counts only |
| `/api/team` | `GET` | `manager`, `executive`, `admin` | Current org only | Team list is manager dashboard output scoped by grants/org |
| `/api/team/[repId]` | `GET` | `manager`, `executive`, `admin` | Same-org target rep only | Rep detail/badges require same-org rep; managers need analytics visibility |
| `/api/leaderboard` | `GET` | Any authenticated org member | Current org only | Aggregate org leaderboard only |

### Training

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/training/ai-status` | `GET` | Any authenticated user | None beyond caller auth | Reports configuration availability only |
| `/api/training/modules` | `GET`, `POST` | `GET`: users with training access; `POST`: training managers/admins | Current org only | Create limited to manager/admin with `manage_team_training`; listing returns caller progress only |
| `/api/training/modules/generate` | `POST` | Training managers/admins | Current org only | AI generation only for callers with module-manage access |
| `/api/training/modules/[id]` | `GET`, `PATCH` | `GET`: users with training access; `PATCH`: training managers/admins | Current org only | Module id must belong to caller org |
| `/api/training/modules/[id]/generate` | `POST` | Training managers/admins | Current org only | Module id must belong to caller org |
| `/api/training/modules/[id]/progress` | `POST` | `rep` only | Current org only | Rep can update only their own progress for same-org module |
| `/api/training/modules/[id]/assign` | `POST` | Training managers/admins | Current org only | Module must belong to caller org; reps can only be assigned if same-org and in manager's granted scope |
| `/api/training/modules/[id]/assign/[repId]` | `DELETE` | Training managers/admins | Current org only | Module must belong to caller org; target rep must be managed by caller |
| `/api/training/team-progress` | `GET` | `manager`, `executive`, `admin` with training access | Current org only | Managers only see reps in granted teams |

### Roleplay

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/roleplay/personas` | `GET` | Any authenticated org user | Org membership required | Static persona catalog only |
| `/api/roleplay/sessions` | `GET`, `POST` | Any authenticated org user | Current org only | List returns own/team/org-visible sessions; create always creates session for caller |
| `/api/roleplay/sessions/[id]` | `GET` | `rep`, `manager`, `executive`, `admin` | Current org only | Session must belong to caller org and target rep must be visible to caller |
| `/api/roleplay/sessions/[id]/messages` | `POST` | Same as session read | Current org only | Session must belong to caller org and be visible to caller before mutation |
| `/api/roleplay/sessions/[id]/complete` | `POST` | Same as session read | Current org only | Session must belong to caller org and be visible to caller before mutation |
| `/api/roleplay/sessions/[id]/realtime` | `GET`, `POST` | Same as session read | Current org only | Session must belong to caller org and be visible to caller before realtime access |
| `/api/roleplay/tts` | `POST` | Any authenticated user | None beyond caller auth | Voice generation only; no cross-user object access |

### Integrations / Compliance

| Route | Methods | Expected role access | Expected org scoping | Object-level requirements |
| --- | --- | --- | --- | --- |
| `/api/integrations/zoom/status` | `GET` | Any authenticated user | Current org only | Status is read-only; `canManage` true only for admin |
| `/api/integrations/zoom/connect` | `GET` | `admin` only | Current org only | OAuth state binds nonce + user id + org id |
| `/api/integrations/zoom/callback` | `GET` | `admin` only | Current org only | Signed state must match cookie nonce, caller user, and caller org |
| `/api/integrations/zoom/disconnect` | `POST` | `admin` only | Current org only | Disconnect limited to caller org integration |
| `/api/integrations/ghl/status` | `GET` | Any authenticated user | Current org only | Status is read-only; `canManage` true only for admin |
| `/api/integrations/ghl/connect` | `GET` | `admin` only | Current org only | OAuth state binds nonce + user id + org id |
| `/api/integrations/ghl/callback` | `GET` | `admin` only | Current org only | Signed state must match cookie nonce, caller user, and caller org |
| `/api/integrations/ghl/disconnect` | `POST` | `admin` only | Current org only | Disconnect limited to caller org integration |
| `/api/compliance/status` | `GET` | Any authenticated user | Current org only | Returns only caller org consent status |
| `/api/compliance/consent` | `POST` | `admin` only | Current org only | Consent record always written against caller org |

## Findings Ranked By Severity

1. `CRITICAL` `POST /api/organizations/join`
   - Before patch, any authenticated user without an org could join any org by slug.
   - Impact: direct tenant-boundary bypass and privilege escalation into arbitrary organizations.
   - Fixed by disabling slug-based self-join and forcing invite-based membership.

2. `HIGH` `GET/POST /api/roleplay/sessions/[id]*`
   - Before patch, roleplay session access checked only `repId` visibility. `admin` and `executive` roles auto-passed that check, so same-role users from other orgs could read/update foreign sessions by id.
   - Impact: cross-org access to session transcripts, scoring, and realtime session bootstrap.
   - Fixed by requiring `session.orgId === caller.orgId` before rep-visibility checks.

3. `HIGH` `GET /api/dashboard/rep`, `GET /api/dashboard/badges/[repId]`, `GET /api/team/[repId]`
   - Before patch, `admin`/`executive` callers could drill into any `repId` because the service never verified the target rep belonged to the caller org.
   - Impact: cross-org analytics and badge visibility.
   - Fixed by validating the target rep exists as a `rep` inside the caller's org before role-based drill-in checks.

4. `HIGH` `GET /api/calls?repId=...`, `GET /api/calls/scores/trend?repId=...`
   - Before patch, `admin`/`executive` callers could target arbitrary rep ids because rep drill-in checks trusted role-based visibility without verifying target-org membership.
   - Impact: cross-org call lists and score-trend analytics.
   - Fixed by resolving the target rep through the access repository and requiring same-org membership plus existing rep-visibility rules.

5. `LOW` `POST /api/calls/upload`
   - Any authenticated org member can upload a call and the call is always attributed to the caller.
   - This is not a tenant-isolation bug, but it is broader than a strict “reps only” policy.
   - Not patched because product intent is unclear and the current flow remains self-scoped.

## Patches Applied

- `apps/web/lib/onboarding/service.ts`
  - Disabled direct org join by slug.
  - Service now returns `403 "Use an invite to join an organization"` for self-service join attempts.

- `apps/web/lib/roleplay/service.ts`
  - Added explicit same-org guard inside `getAuthorizedSession`.
  - This secures `getRoleplaySession`, `appendRoleplayMessage`, `completeRoleplaySession`, and realtime roleplay routes through one shared check.

- `apps/web/lib/dashboard/service.ts`
  - Added shared `assertRequestedRepAccessible(...)`.
  - Both `getRepDashboard` and `getRepBadges` now require the target rep to exist as a same-org `rep` before applying manager/admin drill-in rules.

- `apps/web/lib/calls/service.ts`
  - Added shared `canActorAccessTargetRep(...)`.
  - `listCalls` and `getScoreTrend` now reject cross-org `repId` drill-ins even for `admin` and `executive`.

## Tests Added

- `apps/web/lib/onboarding/service.test.ts`
  - Self-service org join without invite is rejected.

- `apps/web/lib/roleplay/service.test.ts`
  - Cross-org session read is hidden from org admins.
  - Cross-org session updates are rejected even for org admins.

- `apps/web/lib/dashboard/service.test.ts`
  - Cross-org rep analytics drill-ins are rejected for admins.
  - Cross-org badge drill-ins are rejected for admins.

- `apps/web/lib/calls/service.test.ts`
  - Cross-org call list filtering by `repId` is rejected.
  - Cross-org score trend drill-ins by `repId` are rejected.

- `apps/web/lib/team-access/service.test.ts`
  - Rep is explicitly denied access to admin-only team creation.

## Verification

- `npm run test -w @argos-v2/web -- lib/onboarding/service.test.ts lib/roleplay/service.test.ts lib/dashboard/service.test.ts lib/team-access/service.test.ts lib/calls/service.test.ts`
- `npm run typecheck:web`

## Notes

- GitNexus `impact` was run before editing `joinOrganizationForUser`, `getAuthorizedSession`, `getRepDashboard`, `getRepBadges`, `listCalls`, and `getScoreTrend`.
- GitNexus `detect_changes` is referenced by repo policy but was not exposed through the available CLI/MCP surface in this session, so changed-file scope was verified with `git diff --stat` instead.
