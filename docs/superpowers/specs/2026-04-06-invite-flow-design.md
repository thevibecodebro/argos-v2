# Invite Flow Design

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Admin-initiated email invite flow for onboarding org members

---

## Overview

Admins can invite people to their organization by email. Each invite specifies a role and, for `rep` and `manager` roles, optional team assignments. Invites are delivered via Resend, expire after 7 days, and are accepted via a token-based URL.

---

## 1. Database Schema

New table `invites` in `packages/db/src/schema/invites.ts`:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `defaultRandom()` |
| `orgId` | `uuid` FK → `organizations.id` ON DELETE CASCADE | NOT NULL |
| `email` | `text` | NOT NULL |
| `role` | `text` enum(`rep`,`manager`,`executive`,`admin`) | NOT NULL |
| `token` | `text` UNIQUE | Generated in application code via `crypto.randomUUID()`. The UNIQUE constraint implicitly creates a B-tree index, so token lookups are efficient. |
| `teamIds` | `uuid[]` | NULL for `executive`/`admin`; optional for `rep`/`manager` |
| `expiresAt` | `timestamp` | Set to `createdAt + 7 days` in application code at insert time |
| `acceptedAt` | `timestamp` | NULL = pending; set = consumed |
| `createdAt` | `timestamp` | `defaultNow()` |

No unique constraint on `(orgId, email)` — admins may re-invite after expiry. The service layer enforces that no pending unexpired invite exists for a given email+org before creating a new one. Expired rows are not automatically cleaned up — no background job or DB trigger is needed. The expiry check is done at acceptance time in the service layer.

---

## 2. Service Layer

### `lib/invites/repository.ts`

`InvitesRepository` interface:

- `createInvite(input)` → `InviteRecord`
- `findInviteByToken(token)` → `InviteRecord | null` — returns regardless of status; service checks expiry/accepted
- `findPendingInviteByOrgAndEmail(orgId, email)` → `InviteRecord | null` — DB-level filter: `acceptedAt IS NULL AND expiresAt > NOW()` (avoids loading expired rows into memory)
- `findPendingInvitesByOrg(orgId)` → `InviteRecord[]` — same DB-level expiry filter as above
- `markInviteAccepted(id)` → `void`
- `findTeamsByIds(teamIds, orgId)` → `TeamRecord[]` — returns only teams that belong to the org; used for validation
- `listActiveTeamsByOrg(orgId)` → `TeamRecord[]` — used to populate the team multi-select in the UI
- `createTeamMemberships(input: { orgId, userId, teamIds, membershipType: "rep" | "manager" })` → `void` — inserts one `team_memberships` row per team ID

Note on DB-level vs. service-level expiry filtering: `findPendingInviteByOrgAndEmail` and `findPendingInvitesByOrg` filter at the DB layer as an optimization. `findInviteByToken` intentionally does not — the service needs to distinguish between "not found", "expired", and "already accepted" to return appropriate error codes.

### `lib/invites/service.ts`

This module defines its own `InviteServiceResult<T>` type that extends the standard status set with `409` and `410`:

```ts
type InviteServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 410; error: string };
```

`fromServiceResult` in `/lib/http.ts` accepts `status: number`, so it handles `409` and `410` correctly without modification.

---

**`sendInvite(repo, usersRepo, authUserId, input: { email, role, teamIds? })`**

Returns `InviteServiceResult<InviteRecord>`. Throws (does not return a ServiceResult) if `sendInviteEmail` fails — the API route layer catches uncaught throws and returns HTTP 500.

1. Load caller via `usersRepo.findCurrentUserByAuthId`; return 404 if not found
2. Return 400 if `caller.orgId` is not set
3. Return 403 if `caller.role !== "admin"`
4. Return 400 if `email` is not a valid email format (basic regex check at service layer; additional Zod validation at the API route layer is optional)
5. Return 400 if `role` is not a valid `AppUserRole`
6. When `role` is `executive` or `admin`, always set `teamIds` to null regardless of what was submitted
7. Call `findPendingInviteByOrgAndEmail(caller.orgId, email)`; return 409 if a pending unexpired invite already exists
8. If `role` is `rep` or `manager` and `teamIds` is non-empty, call `findTeamsByIds(teamIds, caller.orgId)`; return 400 if the returned count does not match the input count (i.e., one or more team IDs are invalid or belong to a different org)
9. Call `createInvite` to persist the record (token = `crypto.randomUUID()`, `expiresAt = now + 7 days`, `teamIds` already nullified for executive/admin per step 6)
10. Call `sendInviteEmail`. If it throws, the persisted invite row remains — the admin can recover by using the "Invite Member" form again after the invite expires. Re-throw the error; do not swallow it.

---

**`acceptInvite(repo, onboardingRepo, authUserId, token)`**

Returns `InviteServiceResult<{ orgId: string }>`.

**Note on transactions and pre-checks:** This function has two phases. The route handler runs the read-only pre-check phase outside a transaction, then opens a transaction for the mutating phase. See Section 7, Prerequisite 3 for route handler details. The service function itself is called twice by the route handler — once for pre-checks (using normal repos), once for mutations (using transaction-scoped repos) — or alternatively the route handler performs pre-checks itself and calls a narrower `commitInviteAcceptance` helper. The simplest pattern: the route handler performs steps 1–6 itself (reads), then opens a transaction and calls `commitInviteAcceptance(txRepo, txOnboardingRepo, caller, invite)` for steps 7a–8.

**Pre-check steps (performed by the route handler outside a transaction):**

1. Load caller via `onboardingRepo.findCurrentUserByAuthId(authUserId)`; return 404 if not found. In the normal accept flow, the user arrives at `/invite/[token]` after going through `/login?next=/invite/[token]`, which routes through `/auth/callback`. That callback calls `ensureUserProvisioned` before redirecting back, guaranteeing the user row exists. A 404 here should never occur in the normal flow, but the guard is kept for safety.
2. Return 400 if `caller.orgId` is already set (user already belongs to an org)
3. Call `findInviteByToken(token)`; return 404 if not found
4. Return 410 if `invite.expiresAt` is in the past
5. Return 400 if `invite.acceptedAt` is already set (error: `"Invite has already been accepted"`). Note: `400` is used rather than `410` to keep `InviteServiceResult` status values manageable; the error message distinguishes it from other 400s.
6. Return 403 if `caller.email !== invite.email`

**Mutating steps (performed inside `db.transaction()` using transaction-scoped repos):**

7a. Call `onboardingRepo.assignUserToOrganization({ orgId: invite.orgId, userId: caller.id, role: invite.role })`. This widens the existing method to accept all four `AppUserRole` values — see Prerequisites.
7b. If `invite.teamIds` is non-empty, call `repo.createTeamMemberships({ orgId: invite.orgId, userId: caller.id, teamIds: invite.teamIds, membershipType: invite.role as "rep" | "manager" })`. Step 7a must be issued before step 7b — the `team_memberships` table has a compound FK `(userId, orgId) → (users.id, users.orgId)` which requires the user row to already have `orgId` set. Drizzle transactions execute statements serially in the order issued, so sequencing 7a before 7b is sufficient.
8. Call `markInviteAccepted(invite.id)`
9. Return `{ ok: true, data: { orgId: invite.orgId } }`

---

**`listPendingInvites(repo, usersRepo, authUserId)`**

Returns `InviteServiceResult<InviteRecord[]>`.

1. Load caller via `usersRepo.findCurrentUserByAuthId`; return 404 if not found
2. Return 400 if `caller.orgId` is not set
3. Return 403 if `caller.role !== "admin"`
4. Call `findPendingInvitesByOrg(caller.orgId)`
5. Return the list

---

### `lib/invites/email.ts`

Thin wrapper around Resend SDK:

```ts
sendInviteEmail(to: string, inviteUrl: string, orgName: string, role: AppUserRole): Promise<void>
```

Kept in its own module so it can be stubbed in tests without mocking the Resend SDK globally. If the Resend call fails, throws — does not swallow.

---

## 3. API Routes

### `POST /api/invites`
- Auth required; caller must be admin
- Body: `{ email, role, teamIds? }`
- Calls `sendInvite` inside a try/catch. If `sendInvite` throws (email send failure), the route handler catches it and returns `NextResponse.json({ error: "Failed to send invite email" }, { status: 500 })` so the client always receives a JSON body.
- Returns HTTP 200 with invite record on success (consistent with all other POST routes in the codebase which use `fromServiceResult`)
- Error responses: 400, 403, 404, 409 via `fromServiceResult`; 500 (JSON) if email send throws

### `GET /api/invites`
- Auth required; caller must be admin
- Calls `listPendingInvites`
- Returns HTTP 200 with array of pending unexpired invites for the org

### `POST /api/invites/[token]/accept`
- Auth required
- No body; token from URL, user identity from session
- This route opens a Drizzle transaction and instantiates both `DrizzleOnboardingRepository` and `DrizzleInvitesRepository` with the transaction handle before calling `acceptInvite`. This ensures that the user org assignment and team membership inserts are atomic.
- On success, returns `{ orgId }` — client redirects to `/dashboard`
- Error responses: 400, 403, 404, 410 via `fromServiceResult`

### `GET /api/teams`
- Auth required; caller must be admin
- New route that returns active teams for the org (calls `repo.listActiveTeamsByOrg`)
- Used by the UI team multi-select in the invite form
- Returns HTTP 200 with `{ id, name }[]`
- This is a prerequisite deliverable; see Section 7

### `app/invite/[token]/page.tsx`
- **This route must remain outside `PROTECTED_PATH_PREFIXES` in `lib/auth-routing.ts`.** It is intentionally public so unauthenticated users can land on it from an email link. Do not add `/invite` to the protected list.
- This is a React Server Component. It loads invite data and session as follows:
  - Call `createSupabaseServerClient()` and `supabase.auth.getUser()` to get the authenticated user (or null if unauthenticated). The authenticated user's email is available as `user.email` on the Supabase `User` object — no additional DB query is needed for email comparison.
  - Load the invite record directly via the Drizzle client to get org name, role, and `invite.email` for rendering
- Conditional rendering:
  - Token not found or expired: error state — "This invite is no longer valid"
  - Token already accepted: error state — "This invite has already been accepted"
  - Unauthenticated: "Sign in to accept" button linking to `/login?next=/invite/[token]`. The auth callback at `/auth/callback` already reads `?next=` and redirects back after login — no changes to the auth flow are needed.
  - Authenticated, email mismatch (`user.email !== invite.email`): error — "This invite was sent to a different email address"
  - Authenticated, email matches, invite valid: renders org name, role, and an "Accept Invite" button. The button calls `POST /api/invites/[token]/accept` (client-side fetch) then redirects to `/dashboard` on success.
- Visual style: `LegacyAuthShell` (same as onboarding page)

---

## 4. UI

### Onboarding — post-org-creation invite step

After the admin successfully creates an org, `OnboardingPanel` transitions to a new `"invite"` step instead of immediately redirecting to `/dashboard`. The existing step model is `"choose" | "create" | "join"` — extend to `"choose" | "create" | "join" | "invite"`.

The transition to `"invite"` happens inside the existing `submit` function after a successful `POST /api/organizations` response, instead of immediately calling `router.push("/dashboard")`.

The invite step renders:
- Email input + role selector (`rep`, `manager`, `executive`, `admin`)
- If `rep` or `manager` is selected: a team multi-select appears. The component fetches teams via `GET /api/teams` on mount (or when the role changes to rep/manager). If no teams exist yet, shows a note: "You can assign teams later from settings."
- "Send Invite" button: calls `POST /api/invites`; on success, clears the form and shows an inline confirmation ("Invite sent to [email]")
- "Go to Dashboard" link: a plain anchor/button that calls `router.push("/dashboard"); router.refresh()` — no API call needed, the user is already in the org at this point

### Settings page — invite management (admin-only section)

New section on the existing `/settings` page:

- List of pending invites fetched from `GET /api/invites`: shows email, role, expiry date. Read-only in this iteration — no Resend or Cancel actions.
- "Invite Member" button: opens the same invite form inline (email + role + optional team multi-select, same logic as onboarding invite step)

### `/invite/[token]` acceptance page

Described in Section 3 above.

---

## 5. Testing

All tests use in-memory stub repositories — no database or Resend calls. `sendInviteEmail` is always stubbed.

### `lib/invites/service.test.ts`

**`sendInvite`:**
- Happy path: creates invite record, calls email sender
- 400 when caller has no orgId
- 403 when caller is not admin
- 400 when email format is invalid
- 400 when role is not valid
- teamIds is persisted as null when role is executive or admin, even if teamIds was supplied
- 409 when a pending unexpired invite already exists for email+org
- 400 when `teamIds` contains a team ID not belonging to the org
- Throws (does not return ServiceResult) when email send fails; invite row already persisted in stub

**`acceptInvite`:**
- Happy path for `rep`: assigns to org with `rep` team memberships, marks accepted
- Happy path for `manager`: assigns to org with `manager` team memberships, marks accepted
- Happy path for `executive`: assigns to org, no team memberships inserted
- Happy path for `admin`: assigns to org, no team memberships inserted
- Happy path with no teamIds: assigns to org, no team memberships inserted
- 400 when caller already belongs to an org
- 404 when token not found
- 410 when token expired
- 400 when token already accepted (error message: "Invite has already been accepted")
- 403 when authenticated user's email does not match invite email

**`listPendingInvites`:**
- Returns only pending unexpired invites for the caller's org
- 400 when caller has no orgId
- 403 when caller is not admin

---

## 6. Environment Variables

Add to `apps/web/.env.local`:

```
RESEND_API_KEY=
```

---

## 7. Prerequisites

The following changes must be made before or alongside the invite flow:

### 1. Widen `assignUserToOrganization` role type

`OnboardingRepository.assignUserToOrganization` currently accepts `role: "admin" | "rep"`. Widen to `role: AppUserRole` (all four values: `rep`, `manager`, `executive`, `admin`). Update:
- The `OnboardingRepository` interface in `lib/onboarding/service.ts`
- The `DrizzleOnboardingRepository` implementation
- Any test stubs that reference the old type

### 2. Add `GET` handler to existing `apps/web/app/api/teams/route.ts`

The file already exists with a `POST` handler for `createTeam`. Add a `GET` handler (admin-only) that returns active teams for the org via `repo.listActiveTeamsByOrg(orgId)`. Required by the invite form team multi-select. Do not create a new file.

### 3. Transaction-aware repository instantiation in `POST /api/invites/[token]/accept`

Both `DrizzleOnboardingRepository` and `DrizzleInvitesRepository` must accept a Drizzle transaction handle (or the default db client) in their constructors. The accept route handler proceeds as follows:

1. Perform non-mutating pre-checks (load user, load invite, validate expiry/accepted/email mismatch) using normal repository instances outside any transaction. This avoids holding a transaction open during read-only work.
2. Open a `db.transaction()`.
3. Instantiate both repositories with the transaction handle inside the transaction body.
4. Perform mutating steps (assign org, insert team memberships, mark accepted) using the transaction-scoped repositories.
5. On any error, Drizzle automatically rolls back.

The `acceptInvite` service function receives already-validated inputs from the pre-check phase (invite record, caller record) so it does not need to re-issue the read queries inside the transaction.

---

## 8. Out of Scope (Future Work)

- Resend and Cancel invite API endpoints
- Rate limiting on `POST /api/invites`
- Invite email template branding
- Background cleanup of expired invite rows
