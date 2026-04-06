# Invite Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to invite people to their organization by email, with role and optional team assignment, via Resend-delivered token links that expire after 7 days.

**Architecture:** New `invites` DB table + `lib/invites/` service domain (repository interface, Drizzle implementation, email helper, service functions). Three API routes (`POST/GET /api/invites`, `POST /api/invites/[token]/accept`) plus a public `/invite/[token]` page. UI changes to `OnboardingPanel` (post-create invite step) and the Settings page (pending invites list + invite form).

**Tech Stack:** Next.js 15 App Router, Drizzle ORM (node-postgres), Supabase Auth, Resend SDK (`resend` npm package), Vitest

---

## File Map

### New files
- `packages/db/src/schema/invites.ts` — Drizzle table schema
- `apps/web/lib/invites/repository.ts` — `InvitesRepository` interface + `InviteRecord` type
- `apps/web/lib/invites/supabase-repository.ts` — Drizzle implementation (`DrizzleInvitesRepository`)
- `apps/web/lib/invites/create-repository.ts` — factory function
- `apps/web/lib/invites/email.ts` — `sendInviteEmail` Resend wrapper
- `apps/web/lib/invites/service.ts` — `sendInvite`, `commitInviteAcceptance`, `listPendingInvites`
- `apps/web/lib/invites/service.test.ts` — Vitest unit tests
- `apps/web/app/api/invites/route.ts` — `POST /api/invites`, `GET /api/invites`
- `apps/web/app/api/invites/[token]/accept/route.ts` — `POST /api/invites/[token]/accept`
- `apps/web/app/invite/[token]/page.tsx` — public acceptance page

### Modified files
- `packages/db/src/schema/index.ts` — export `invitesTable`
- `apps/web/lib/onboarding/service.ts` — widen `assignUserToOrganization` role type
- `apps/web/lib/onboarding/repository.ts` — widen `assignUserToOrganization` role type
- `apps/web/lib/onboarding/service.test.ts` — update stub (no functional change, just TypeScript)
- `apps/web/app/api/teams/route.ts` — add `GET` handler
- `apps/web/components/onboarding-panel.tsx` — add `"invite"` step
- `apps/web/app/(authenticated)/settings/page.tsx` — pass pending invites to panel
- `apps/web/components/settings-workspace-panel.tsx` — add invite management section

---

## Task 1: Widen `assignUserToOrganization` role type (prerequisite)

**Files:**
- Modify: `apps/web/lib/onboarding/service.ts:24`
- Modify: `apps/web/lib/onboarding/repository.ts:14-17`

- [ ] **Step 1: Update the `OnboardingRepository` interface**

In `apps/web/lib/onboarding/service.ts`, first add the import at the top of the file (after existing imports):
```ts
import type { AppUserRole } from "@/lib/users/roles";
```

Then change the interface method:
```ts
assignUserToOrganization(input: {
  orgId: string;
  role: "admin" | "rep";
  userId: string;
}): Promise<void>;
```
to:
```ts
assignUserToOrganization(input: {
  orgId: string;
  role: AppUserRole;
  userId: string;
}): Promise<void>;
```

- [ ] **Step 2: Update the Drizzle implementation**

In `apps/web/lib/onboarding/repository.ts`, the file already imports `parseAppUserRole` from `@/lib/users/roles`. Add `type AppUserRole` to that import:
```ts
import { parseAppUserRole, type AppUserRole } from "@/lib/users/roles";
```

Then change the method signature:
```ts
async assignUserToOrganization(input: {
  orgId: string;
  role: AppUserRole;
  userId: string;
}) {
```

- [ ] **Step 3: Run type check to confirm no regressions**

```bash
npm run typecheck:web
```
Expected: passes with no errors.

- [ ] **Step 4: Run existing onboarding tests**

```bash
npx vitest run apps/web/lib/onboarding/service.test.ts
```
Expected: all tests pass (no functional change, the stubs use `"admin"` and `"rep"` which are still valid).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/onboarding/service.ts apps/web/lib/onboarding/repository.ts
git commit -m "feat: widen assignUserToOrganization role to all AppUserRole values"
```

---

## Task 2: Add `invites` DB schema

**Files:**
- Create: `packages/db/src/schema/invites.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create the schema file**

Create `packages/db/src/schema/invites.ts`:
```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const invitesTable = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["rep", "manager", "executive", "admin"] }).notNull(),
  token: text("token").notNull().unique(),
  teamIds: uuid("team_ids").array(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Export from schema index**

In `packages/db/src/schema/index.ts`, add:
```ts
export * from "./invites";
```

- [ ] **Step 3: Generate and apply the migration**

```bash
npm run db:generate
```
Review the generated migration file to confirm it creates the `invites` table with the correct columns and constraints. Then apply it to your local Supabase:
```bash
# Apply via Supabase CLI or Drizzle Studio — the exact command depends on your local setup.
# If using supabase CLI: supabase db push
# If using drizzle migrate: add a migrate script or run through db:studio
```

- [ ] **Step 4: Run type check**

```bash
npm run typecheck:db
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/invites.ts packages/db/src/schema/index.ts
git add packages/db/src/migrations  # include generated migration file
git commit -m "feat: add invites table schema"
```

---

## Task 3: `InvitesRepository` interface + `InviteRecord` type

**Files:**
- Create: `apps/web/lib/invites/repository.ts`

- [ ] **Step 1: Create the repository interface**

Create `apps/web/lib/invites/repository.ts`:
```ts
import type { AppUserRole } from "@/lib/users/roles";

export type InviteRecord = {
  id: string;
  orgId: string;
  email: string;
  role: AppUserRole;
  token: string;
  teamIds: string[] | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

export type TeamRecord = {
  id: string;
  name: string;
};

export interface InvitesRepository {
  createInvite(input: {
    orgId: string;
    email: string;
    role: AppUserRole;
    token: string;
    teamIds: string[] | null;
    expiresAt: Date;
  }): Promise<InviteRecord>;

  findInviteByToken(token: string): Promise<InviteRecord | null>;

  findPendingInviteByOrgAndEmail(
    orgId: string,
    email: string,
  ): Promise<InviteRecord | null>;

  findPendingInvitesByOrg(orgId: string): Promise<InviteRecord[]>;

  markInviteAccepted(id: string): Promise<void>;

  findTeamsByIds(teamIds: string[], orgId: string): Promise<TeamRecord[]>;

  listActiveTeamsByOrg(orgId: string): Promise<TeamRecord[]>;

  createTeamMemberships(input: {
    orgId: string;
    userId: string;
    teamIds: string[];
    membershipType: "rep" | "manager";
  }): Promise<void>;
}
```

- [ ] **Step 2: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/invites/repository.ts
git commit -m "feat: add InvitesRepository interface and InviteRecord type"
```

---

## Task 4: Drizzle implementation + factory

**Files:**
- Create: `apps/web/lib/invites/supabase-repository.ts`
- Create: `apps/web/lib/invites/create-repository.ts`

- [ ] **Step 1: Create the Drizzle implementation**

Create `apps/web/lib/invites/supabase-repository.ts`:
```ts
import { and, eq, gt, isNull, inArray } from "drizzle-orm";
import {
  getDb,
  invitesTable,
  teamsTable,
  teamMembershipsTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { InvitesRepository, InviteRecord, TeamRecord } from "./repository";

function mapInvite(row: typeof invitesTable.$inferSelect): InviteRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    email: row.email,
    role: parseAppUserRole(row.role)!,
    token: row.token,
    teamIds: row.teamIds ?? null,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt ?? null,
    createdAt: row.createdAt,
  };
}

export class DrizzleInvitesRepository implements InvitesRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async createInvite(input: {
    orgId: string;
    email: string;
    role: string;
    token: string;
    teamIds: string[] | null;
    expiresAt: Date;
  }): Promise<InviteRecord> {
    const [row] = await this.db
      .insert(invitesTable)
      .values({
        orgId: input.orgId,
        email: input.email,
        role: input.role as "rep" | "manager" | "executive" | "admin",
        token: input.token,
        teamIds: input.teamIds ?? undefined,
        expiresAt: input.expiresAt,
      })
      .returning();
    return mapInvite(row);
  }

  async findInviteByToken(token: string): Promise<InviteRecord | null> {
    const [row] = await this.db
      .select()
      .from(invitesTable)
      .where(eq(invitesTable.token, token))
      .limit(1);
    return row ? mapInvite(row) : null;
  }

  async findPendingInviteByOrgAndEmail(
    orgId: string,
    email: string,
  ): Promise<InviteRecord | null> {
    const now = new Date();
    const [row] = await this.db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.orgId, orgId),
          eq(invitesTable.email, email),
          isNull(invitesTable.acceptedAt),
          gt(invitesTable.expiresAt, now),
        ),
      )
      .limit(1);
    return row ? mapInvite(row) : null;
  }

  async findPendingInvitesByOrg(orgId: string): Promise<InviteRecord[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.orgId, orgId),
          isNull(invitesTable.acceptedAt),
          gt(invitesTable.expiresAt, now),
        ),
      );
    return rows.map(mapInvite);
  }

  async markInviteAccepted(id: string): Promise<void> {
    await this.db
      .update(invitesTable)
      .set({ acceptedAt: new Date() })
      .where(eq(invitesTable.id, id));
  }

  async findTeamsByIds(teamIds: string[], orgId: string): Promise<TeamRecord[]> {
    if (teamIds.length === 0) return [];
    const rows = await this.db
      .select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(
        and(
          inArray(teamsTable.id, teamIds),
          eq(teamsTable.orgId, orgId),
          eq(teamsTable.status, "active"),
        ),
      );
    return rows;
  }

  async listActiveTeamsByOrg(orgId: string): Promise<TeamRecord[]> {
    return this.db
      .select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(
        and(eq(teamsTable.orgId, orgId), eq(teamsTable.status, "active")),
      );
  }

  async createTeamMemberships(input: {
    orgId: string;
    userId: string;
    teamIds: string[];
    membershipType: "rep" | "manager";
  }): Promise<void> {
    if (input.teamIds.length === 0) return;
    await this.db.insert(teamMembershipsTable).values(
      input.teamIds.map((teamId) => ({
        orgId: input.orgId,
        teamId,
        userId: input.userId,
        membershipType: input.membershipType,
      })),
    );
  }
}
```

- [ ] **Step 2: Create the factory**

Create `apps/web/lib/invites/create-repository.ts`:
```ts
import { DrizzleInvitesRepository } from "./supabase-repository";

export function createInvitesRepository() {
  return new DrizzleInvitesRepository();
}
```

- [ ] **Step 3: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/invites/supabase-repository.ts apps/web/lib/invites/create-repository.ts
git commit -m "feat: add DrizzleInvitesRepository implementation"
```

---

## Task 5: `sendInviteEmail` helper

**Files:**
- Create: `apps/web/lib/invites/email.ts`

Before this task, install the Resend SDK if not already present:
```bash
cd apps/web && npm install resend
```

- [ ] **Step 1: Create the email helper**

Create `apps/web/lib/invites/email.ts`:
```ts
import { Resend } from "resend";
import type { AppUserRole } from "@/lib/users/roles";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  orgName: string,
  role: AppUserRole,
): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: "Argos <noreply@argos.ai>",
    to,
    subject: `You've been invited to join ${orgName} on Argos`,
    html: `
      <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${inviteUrl}">Accept your invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });

  if (error) {
    throw new Error(`Failed to send invite email: ${error.message}`);
  }
}
```

- [ ] **Step 2: Add `RESEND_API_KEY` to your local env**

In `apps/web/.env.local`, add:
```
RESEND_API_KEY=re_your_api_key_here
```

- [ ] **Step 3: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/invites/email.ts
git commit -m "feat: add sendInviteEmail Resend helper"
```

---

## Task 6: Write failing service tests

**Files:**
- Create: `apps/web/lib/invites/service.test.ts`

This task writes all the tests first — the service doesn't exist yet, so they will all fail.

- [ ] **Step 1: Create the test file**

Create `apps/web/lib/invites/service.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { InvitesRepository, InviteRecord, TeamRecord } from "./repository";
import type { UsersRepository } from "@/lib/users/service";
import type { OnboardingRepository } from "@/lib/onboarding/service";
import {
  sendInvite,
  commitInviteAcceptance,
  listPendingInvites,
} from "./service";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  id: string;
  email: string;
  orgId: string | null;
  role: string | null;
  org: { id: string; name: string; slug: string; plan: string; createdAt: string } | null;
  displayNameSet: boolean;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}> = {}) {
  return {
    id: "user-1",
    email: "admin@acme.com",
    orgId: "org-1",
    role: "admin" as const,
    org: { id: "org-1", name: "Acme", slug: "acme", plan: "trial", createdAt: new Date().toISOString() },
    displayNameSet: true,
    firstName: "Admin",
    lastName: "User",
    profileImageUrl: null,
    ...overrides,
  };
}

function makeInvite(overrides: Partial<InviteRecord> = {}): InviteRecord {
  return {
    id: "invite-1",
    orgId: "org-1",
    email: "rep@acme.com",
    role: "rep",
    token: "test-token",
    teamIds: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeInvitesRepo(overrides: Partial<InvitesRepository> = {}): InvitesRepository {
  return {
    createInvite: vi.fn().mockResolvedValue(makeInvite()),
    findInviteByToken: vi.fn().mockResolvedValue(null),
    findPendingInviteByOrgAndEmail: vi.fn().mockResolvedValue(null),
    findPendingInvitesByOrg: vi.fn().mockResolvedValue([]),
    markInviteAccepted: vi.fn().mockResolvedValue(undefined),
    findTeamsByIds: vi.fn().mockResolvedValue([]),
    listActiveTeamsByOrg: vi.fn().mockResolvedValue([]),
    createTeamMemberships: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeUsersRepo(overrides: Partial<UsersRepository> = {}): UsersRepository {
  return {
    findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser()),
    findOrganizationMember: vi.fn().mockResolvedValue(null),
    findOrganizationMembers: vi.fn().mockResolvedValue([]),
    removeOrganizationMember: vi.fn().mockResolvedValue(true),
    updateCurrentUserProfile: vi.fn().mockResolvedValue(null),
    updateOrganizationMemberRole: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeOnboardingRepo(overrides: Partial<OnboardingRepository> = {}): OnboardingRepository {
  return {
    assignUserToOrganization: vi.fn().mockResolvedValue(undefined),
    createOrganization: vi.fn().mockResolvedValue(null),
    findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
    findOrganizationBySlug: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("./email", () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

beforeEach(() => {
  mockSendEmail.mockClear();
});

// ── sendInvite ────────────────────────────────────────────────────────────────

describe("sendInvite", () => {
  it("creates invite record and sends email on happy path", async () => {
    const repo = makeInvitesRepo();
    const usersRepo = makeUsersRepo();
    const result = await sendInvite(repo, usersRepo, "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result.ok).toBe(true);
    expect(repo.createInvite).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("returns 400 when caller has no orgId", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ orgId: null, org: null })),
    });
    const result = await sendInvite(makeInvitesRepo(), usersRepo, "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("returns 403 when caller is not admin", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ role: "manager" })),
    });
    const result = await sendInvite(makeInvitesRepo(), usersRepo, "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it("returns 400 when email format is invalid", async () => {
    const result = await sendInvite(makeInvitesRepo(), makeUsersRepo(), "user-1", {
      email: "not-an-email",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("returns 400 when role is invalid", async () => {
    const result = await sendInvite(makeInvitesRepo(), makeUsersRepo(), "user-1", {
      email: "rep@acme.com",
      role: "unknown-role" as any,
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("persists teamIds as null for executive role even if teamIds supplied", async () => {
    const repo = makeInvitesRepo();
    await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "exec@acme.com",
      role: "executive",
      teamIds: ["team-1"],
    });
    expect(repo.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: null }),
    );
  });

  it("persists teamIds as null for admin role even if teamIds supplied", async () => {
    const repo = makeInvitesRepo();
    await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "admin2@acme.com",
      role: "admin",
      teamIds: ["team-1"],
    });
    expect(repo.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: null }),
    );
  });

  it("returns 409 when pending unexpired invite already exists", async () => {
    const repo = makeInvitesRepo({
      findPendingInviteByOrgAndEmail: vi.fn().mockResolvedValue(makeInvite()),
    });
    const result = await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 409, error: expect.any(String) });
  });

  it("returns 400 when teamIds contains unknown team", async () => {
    const repo = makeInvitesRepo({
      findTeamsByIds: vi.fn().mockResolvedValue([]), // returns 0 of 1 requested
    });
    const result = await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "rep@acme.com",
      role: "rep",
      teamIds: ["nonexistent-team"],
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("throws when email send fails (invite row already persisted)", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("Resend error"));
    await expect(
      sendInvite(makeInvitesRepo(), makeUsersRepo(), "user-1", {
        email: "rep@acme.com",
        role: "rep",
      }),
    ).rejects.toThrow("Resend error");
  });
});

// ── commitInviteAcceptance ────────────────────────────────────────────────────

describe("commitInviteAcceptance", () => {
  function makeAcceptArgs(inviteOverrides: Partial<InviteRecord> = {}) {
    const caller = { id: "user-2", email: "rep@acme.com", orgId: null as string | null };
    const invite = makeInvite(inviteOverrides);
    return { caller, invite };
  }

  it("happy path for rep: assigns org, inserts rep team memberships, marks accepted", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "rep", teamIds: ["team-1"] });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    const result = await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(result.ok).toBe(true);
    expect(onboardingRepo.assignUserToOrganization).toHaveBeenCalledWith({
      orgId: invite.orgId,
      userId: caller.id,
      role: "rep",
    });
    expect(repo.createTeamMemberships).toHaveBeenCalledWith({
      orgId: invite.orgId,
      userId: caller.id,
      teamIds: ["team-1"],
      membershipType: "rep",
    });
    expect(repo.markInviteAccepted).toHaveBeenCalledWith(invite.id);
  });

  it("happy path for manager: assigns org with manager team memberships", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "manager", teamIds: ["team-2"] });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).toHaveBeenCalledWith(
      expect.objectContaining({ membershipType: "manager" }),
    );
  });

  it("happy path for executive: assigns org, no team memberships", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "executive", teamIds: null });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).not.toHaveBeenCalled();
  });

  it("happy path for admin: assigns org, no team memberships", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "admin", teamIds: null });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).not.toHaveBeenCalled();
  });

  it("no team memberships inserted when teamIds is empty", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "rep", teamIds: [] });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).not.toHaveBeenCalled();
  });
});

// ── listPendingInvites ────────────────────────────────────────────────────────

describe("listPendingInvites", () => {
  it("returns pending invites for the caller's org", async () => {
    const pending = [makeInvite(), makeInvite({ id: "invite-2", email: "other@acme.com" })];
    const repo = makeInvitesRepo({
      findPendingInvitesByOrg: vi.fn().mockResolvedValue(pending),
    });
    const result = await listPendingInvites(repo, makeUsersRepo(), "user-1");
    expect(result).toEqual({ ok: true, data: pending });
  });

  it("returns 400 when caller has no orgId", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ orgId: null, org: null })),
    });
    const result = await listPendingInvites(makeInvitesRepo(), usersRepo, "user-1");
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("returns 403 when caller is not admin", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ role: "rep" })),
    });
    const result = await listPendingInvites(makeInvitesRepo(), usersRepo, "user-1");
    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run the tests to confirm they all fail**

```bash
npx vitest run apps/web/lib/invites/service.test.ts
```
Expected: all tests fail with "Cannot find module './service'" or similar.

- [ ] **Step 3: Commit the failing tests**

```bash
git add apps/web/lib/invites/service.test.ts
git commit -m "test: add failing service tests for invite flow"
```

---

## Task 7: Implement `lib/invites/service.ts`

**Files:**
- Create: `apps/web/lib/invites/service.ts`

- [ ] **Step 1: Create the service**

Create `apps/web/lib/invites/service.ts`:
```ts
import type { AppUserRole } from "@/lib/users/roles";
import { APP_USER_ROLES } from "@/lib/users/roles";
import type { UsersRepository } from "@/lib/users/service";
import type { OnboardingRepository } from "@/lib/onboarding/service";
import type { InvitesRepository, InviteRecord } from "./repository";
import { sendInviteEmail } from "./email";

type InviteServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 410; error: string };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendInvite(
  repo: InvitesRepository,
  usersRepo: UsersRepository,
  authUserId: string,
  input: { email?: unknown; role?: unknown; teamIds?: unknown },
): Promise<InviteServiceResult<InviteRecord>> {
  const caller = await usersRepo.findCurrentUserByAuthId(authUserId);

  if (!caller) {
    return { ok: false, status: 404, error: "User not found" };
  }

  if (!caller.orgId) {
    return { ok: false, status: 400, error: "You are not part of an organization" };
  }

  if (caller.role !== "admin") {
    return { ok: false, status: 403, error: "Only admins can send invites" };
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";

  if (!email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "A valid email address is required" };
  }

  if (!APP_USER_ROLES.includes(input.role as AppUserRole)) {
    return { ok: false, status: 400, error: "role must be one of: rep, manager, executive, admin" };
  }

  const role = input.role as AppUserRole;
  const rawTeamIds =
    Array.isArray(input.teamIds) && (role === "rep" || role === "manager")
      ? (input.teamIds as string[])
      : null;

  // Check for existing pending invite before validating teams (spec order: 409 before 400)
  const existing = await repo.findPendingInviteByOrgAndEmail(caller.orgId, email);

  if (existing) {
    return { ok: false, status: 409, error: "A pending invite already exists for this email" };
  }

  // Validate team IDs belong to org
  if (rawTeamIds && rawTeamIds.length > 0) {
    const found = await repo.findTeamsByIds(rawTeamIds, caller.orgId);
    if (found.length !== rawTeamIds.length) {
      return { ok: false, status: 400, error: "One or more team IDs are invalid" };
    }
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  const invite = await repo.createInvite({
    orgId: caller.orgId,
    email,
    role,
    token,
    teamIds: rawTeamIds,
    expiresAt,
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${token}`;

  // Fetch org name for email (caller.org is available from UsersRepository)
  const orgName = caller.org?.name ?? "your organization";

  await sendInviteEmail(email, inviteUrl, orgName, role);

  return { ok: true, data: invite };
}

export type InviteCallerRecord = {
  id: string;
  email: string;
  orgId: string | null;
};

export async function commitInviteAcceptance(
  repo: InvitesRepository,
  onboardingRepo: OnboardingRepository,
  caller: InviteCallerRecord,
  invite: InviteRecord,
): Promise<InviteServiceResult<{ orgId: string }>> {
  await onboardingRepo.assignUserToOrganization({
    orgId: invite.orgId,
    userId: caller.id,
    role: invite.role,
  });

  if (invite.teamIds && invite.teamIds.length > 0 && (invite.role === "rep" || invite.role === "manager")) {
    await repo.createTeamMemberships({
      orgId: invite.orgId,
      userId: caller.id,
      teamIds: invite.teamIds,
      membershipType: invite.role,
    });
  }

  await repo.markInviteAccepted(invite.id);

  return { ok: true, data: { orgId: invite.orgId } };
}

export async function listPendingInvites(
  repo: InvitesRepository,
  usersRepo: UsersRepository,
  authUserId: string,
): Promise<InviteServiceResult<InviteRecord[]>> {
  const caller = await usersRepo.findCurrentUserByAuthId(authUserId);

  if (!caller) {
    return { ok: false, status: 404, error: "User not found" };
  }

  if (!caller.orgId) {
    return { ok: false, status: 400, error: "You are not part of an organization" };
  }

  if (caller.role !== "admin") {
    return { ok: false, status: 403, error: "Only admins can view invites" };
  }

  const invites = await repo.findPendingInvitesByOrg(caller.orgId);

  return { ok: true, data: invites };
}
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run apps/web/lib/invites/service.test.ts
```
Expected: all tests pass.

- [ ] **Step 3: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/invites/service.ts
git commit -m "feat: implement invite service (sendInvite, commitInviteAcceptance, listPendingInvites)"
```

---

## Task 8: Add `GET /api/teams` handler

**Files:**
- Modify: `apps/web/app/api/teams/route.ts`

- [ ] **Step 1: Add GET handler to the existing file**

In `apps/web/app/api/teams/route.ts`, add after the existing imports:
```ts
import { createInvitesRepository } from "@/lib/invites/create-repository";
```
(`listActiveTeamsByOrg` is called directly on the repository instance — there is no service wrapper for this.)

Then add the handler:
```ts
export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const usersRepo = createUsersRepository();
  const caller = await usersRepo.findCurrentUserByAuthId(authUser.id);

  if (!caller || !caller.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const repo = createInvitesRepository();
  const teams = await repo.listActiveTeamsByOrg(caller.orgId);
  return NextResponse.json(teams, { headers: { "Cache-Control": "private, no-store" } });
}
```

Also add `NextResponse` to the imports at the top:
```ts
import { NextResponse } from "next/server";
import { createUsersRepository } from "@/lib/users/create-repository";
```

- [ ] **Step 2: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/teams/route.ts
git commit -m "feat: add GET /api/teams for active org teams"
```

---

## Task 9: API routes — `POST /api/invites` and `GET /api/invites`

**Files:**
- Create: `apps/web/app/api/invites/route.ts`

- [ ] **Step 1: Create the route file**

Create `apps/web/app/api/invites/route.ts`:
```ts
import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { sendInvite, listPendingInvites } from "@/lib/invites/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const payload = (await request.json()) as {
    email?: unknown;
    role?: unknown;
    teamIds?: unknown;
  };

  try {
    const result = await sendInvite(
      createInvitesRepository(),
      createUsersRepository(),
      authUser.id,
      payload,
    );
    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to send invite email:", error);
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  }
}

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await listPendingInvites(
    createInvitesRepository(),
    createUsersRepository(),
    authUser.id,
  );

  return fromServiceResult(result);
}
```

- [ ] **Step 2: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/invites/route.ts
git commit -m "feat: add POST/GET /api/invites routes"
```

---

## Task 10: API route — `POST /api/invites/[token]/accept`

**Files:**
- Create: `apps/web/app/api/invites/[token]/accept/route.ts`

- [ ] **Step 1: Create the route file**

Create `apps/web/app/api/invites/[token]/accept/route.ts`:
```ts
import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getDb } from "@argos-v2/db";
import { DrizzleInvitesRepository } from "@/lib/invites/supabase-repository";
import { DrizzleOnboardingRepository } from "@/lib/onboarding/repository";
import { commitInviteAcceptance } from "@/lib/invites/service";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createOnboardingRepository } from "@/lib/onboarding/create-repository";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { token } = await params;

  // Pre-checks (outside transaction)
  const repo = createInvitesRepository();
  const onboardingRepo = createOnboardingRepository();

  const caller = await onboardingRepo.findCurrentUserByAuthId(authUser.id);

  if (!caller) {
    return fromServiceResult({ ok: false, status: 404, error: "User not found" });
  }

  if (caller.org) {
    return fromServiceResult({ ok: false, status: 400, error: "You already belong to an organization" });
  }

  const invite = await repo.findInviteByToken(token);

  if (!invite) {
    return fromServiceResult({ ok: false, status: 404, error: "Invite not found" });
  }

  if (invite.expiresAt < new Date()) {
    return fromServiceResult({ ok: false, status: 410, error: "This invite has expired" });
  }

  if (invite.acceptedAt) {
    return fromServiceResult({ ok: false, status: 400, error: "Invite has already been accepted" });
  }

  if (caller.email !== invite.email) {
    return fromServiceResult({ ok: false, status: 403, error: "This invite was sent to a different email address" });
  }

  // Mutating steps (inside transaction)
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const txRepo = new DrizzleInvitesRepository(tx);
    const txOnboardingRepo = new DrizzleOnboardingRepository(tx);
    const callerRecord = { id: caller.id, email: caller.email, orgId: caller.org?.id ?? null };
    return commitInviteAcceptance(txRepo, txOnboardingRepo, callerRecord, invite);
  });

  return fromServiceResult(result);
}
```

- [ ] **Step 2: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/invites/
git commit -m "feat: add POST /api/invites/[token]/accept route"
```

---

## Task 11: Public `/invite/[token]` acceptance page

**Files:**
- Create: `apps/web/app/invite/[token]/page.tsx`

- [ ] **Step 1: Create the acceptance page**

Create `apps/web/app/invite/[token]/page.tsx`:
```tsx
import { LegacyAuthShell } from "@/components/legacy-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { InviteAcceptButton } from "./invite-accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repo = createInvitesRepository();
  const invite = await repo.findInviteByToken(token);

  // Invalid / expired / accepted states
  if (!invite) {
    return (
      <LegacyAuthShell note="This invite is no longer valid.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Invite Not Found</h1>
          <p className="mt-4 text-[#8696ba]">This invite link is invalid or has already been used.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <LegacyAuthShell note="This invite has expired.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Invite Expired</h1>
          <p className="mt-4 text-[#8696ba]">Ask your admin to send a new invite.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  if (invite.acceptedAt) {
    return (
      <LegacyAuthShell note="This invite has already been accepted.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Already Accepted</h1>
          <p className="mt-4 text-[#8696ba]">This invite has already been used.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  // Unauthenticated
  if (!user) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <LegacyAuthShell note={`You've been invited to join as a ${invite.role}.`}>
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">You&apos;re Invited</h1>
          <p className="mt-4 text-[#8696ba]">Sign in to accept your invite.</p>
          <a
            className="mt-6 inline-block rounded-[1.1rem] bg-[#2c63f6] px-6 py-3 text-base font-semibold text-white hover:bg-[#4476ff]"
            href={`/login?next=${next}`}
          >
            Sign In to Accept
          </a>
        </div>
      </LegacyAuthShell>
    );
  }

  // Email mismatch
  if (user.email !== invite.email) {
    return (
      <LegacyAuthShell note="Wrong account.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Wrong Account</h1>
          <p className="mt-4 text-[#8696ba]">
            This invite was sent to a different email address.
          </p>
        </div>
      </LegacyAuthShell>
    );
  }

  // Ready to accept
  return (
    <LegacyAuthShell note={`You've been invited to join as a ${invite.role}.`}>
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white">You&apos;re Invited</h1>
        <p className="mt-4 text-[#8696ba]">
          Accept your invite to join as a <strong className="text-white">{invite.role}</strong>.
        </p>
        <div className="mt-6">
          <InviteAcceptButton token={token} />
        </div>
      </div>
    </LegacyAuthShell>
  );
}
```

- [ ] **Step 2: Create the accept button client component**

Create `apps/web/app/invite/[token]/invite-accept-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to accept invite.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <button
        className="rounded-[1.1rem] bg-[#2c63f6] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
        disabled={loading}
        onClick={handleAccept}
        type="button"
      >
        {loading ? "Accepting..." : "Accept Invite"}
      </button>
      {error ? <p className="mt-3 text-sm text-[#ff7f7f]">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Confirm `/invite` is NOT in `PROTECTED_PATH_PREFIXES`**

Open `apps/web/lib/auth-routing.ts` and confirm `/invite` is NOT in the `PROTECTED_PATH_PREFIXES` array. Do not add it. The page is intentionally public.

- [ ] **Step 4: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/invite/
git commit -m "feat: add /invite/[token] public acceptance page"
```

---

## Task 12: Onboarding panel — post-create invite step

**Files:**
- Modify: `apps/web/components/onboarding-panel.tsx`

- [ ] **Step 1: Add the invite step to `OnboardingPanel`**

The current `Step` type is `"choose" | "create" | "join"`. Extend it and add the invite step UI.

In `apps/web/components/onboarding-panel.tsx`:

1. Change `type Step = "choose" | "create" | "join";` to:
```ts
type Step = "choose" | "create" | "join" | "invite";
```

2. Add state for the invite form:
```ts
const [inviteEmail, setInviteEmail] = useState("");
const [inviteRole, setInviteRole] = useState<"rep" | "manager" | "executive" | "admin">("rep");
const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
const [teamsLoaded, setTeamsLoaded] = useState(false);
const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
```

3. In the `submit` function, change the redirect after successful `POST /api/organizations` from `router.push("/dashboard")` to:
```ts
setStep("invite");
```

4. Add a `loadTeams` async function:
```ts
async function loadTeams() {
  if (teamsLoaded) return;
  const response = await fetch("/api/teams");
  if (response.ok) {
    const data = (await response.json()) as { id: string; name: string }[];
    setTeams(data);
  }
  setTeamsLoaded(true);
}
```

5. Add the invite step JSX (after the `"join"` step block):
```tsx
{step === "invite" ? (
  <div className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
      Invite Your Team
    </p>
    <div className="mt-6 space-y-4">
      <label className="block text-left">
        <span className="text-sm font-medium text-[#a8b8da]">Email</span>
        <input
          className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="teammate@company.com"
          type="email"
          value={inviteEmail}
        />
      </label>

      <label className="block text-left">
        <span className="text-sm font-medium text-[#a8b8da]">Role</span>
        <select
          className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition focus:border-[#4f96ff]"
          onChange={(e) => {
            const role = e.target.value as typeof inviteRole;
            setInviteRole(role);
            setInviteTeamIds([]);
            if (role === "rep" || role === "manager") {
              void loadTeams();
            }
          }}
          value={inviteRole}
        >
          <option value="rep">Rep</option>
          <option value="manager">Manager</option>
          <option value="executive">Executive</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      {(inviteRole === "rep" || inviteRole === "manager") ? (
        <div className="block text-left">
          <span className="text-sm font-medium text-[#a8b8da]">Teams (optional)</span>
          {teams.length === 0 ? (
            <p className="mt-2 text-sm text-[#4c5d85]">
              You can assign teams later from settings.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {teams.map((team) => (
                <label key={team.id} className="flex items-center gap-2 text-white">
                  <input
                    checked={inviteTeamIds.includes(team.id)}
                    className="accent-[#2c63f6]"
                    onChange={(e) => {
                      setInviteTeamIds(prev =>
                        e.target.checked
                          ? [...prev, team.id]
                          : prev.filter(id => id !== team.id),
                      );
                    }}
                    type="checkbox"
                  />
                  {team.name}
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>

    {error ? <p className="mt-4 text-sm text-[#ff7f7f]">{error}</p> : null}
    {inviteSuccess ? <p className="mt-4 text-sm text-green-400">{inviteSuccess}</p> : null}

    <div className="mt-6 flex gap-3">
      <button
        className="flex-1 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
        disabled={!inviteEmail.trim() || isMutating}
        onClick={async () => {
          setError(null);
          setInviteSuccess(null);
          setIsMutating(true);
          const response = await fetch("/api/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: inviteEmail,
              role: inviteRole,
              teamIds: inviteTeamIds.length > 0 ? inviteTeamIds : undefined,
            }),
          });
          const data = (await response.json()) as { error?: string };
          setIsMutating(false);
          if (!response.ok) {
            setError(data.error ?? "Unable to send invite.");
          } else {
            setInviteSuccess(`Invite sent to ${inviteEmail}`);
            setInviteEmail("");
            setInviteTeamIds([]);
          }
        }}
        type="button"
      >
        {isMutating ? "Sending..." : "Send Invite"}
      </button>
      <button
        className="flex-1 rounded-[1.1rem] border border-[#1f335d] px-4 py-3 text-base font-medium text-[#a8b8da] transition hover:border-[#4f96ff] hover:text-white"
        onClick={() => {
          router.push("/dashboard");
          router.refresh();
        }}
        type="button"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
) : null}
```

- [ ] **Step 2: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/onboarding-panel.tsx
git commit -m "feat: add invite step to OnboardingPanel post-org-creation"
```

---

## Task 13: Settings page — pending invites section

**Files:**
- Modify: `apps/web/app/(authenticated)/settings/page.tsx`
- Modify: `apps/web/components/settings-workspace-panel.tsx`

- [ ] **Step 1: Fetch pending invites in the settings page**

In `apps/web/app/(authenticated)/settings/page.tsx`:

1. Add imports:
```ts
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { listPendingInvites } from "@/lib/invites/service";
import type { InviteRecord } from "@/lib/invites/repository";
```

2. In the admin-only data fetching block (near line 91), add:
```ts
const pendingInvitesResult =
  authUser && profileResult.data.role === "admin"
    ? await listPendingInvites(createInvitesRepository(), createUsersRepository(), authUser.id)
    : null;
```

3. Pass it to `SettingsWorkspacePanel`:
```tsx
initialPendingInvites={pendingInvitesResult?.ok ? pendingInvitesResult.data : []}
```

- [ ] **Step 2: Add the invite section to `SettingsWorkspacePanel`**

In `apps/web/components/settings-workspace-panel.tsx`:

1. Add `initialPendingInvites: InviteRecord[]` to the component props (import `InviteRecord` from `@/lib/invites/repository`).

2. Add invite state:
```ts
const [pendingInvites, setPendingInvites] = useState(initialPendingInvites);
const [showInviteForm, setShowInviteForm] = useState(false);
const [inviteEmail, setInviteEmail] = useState("");
const [inviteRole, setInviteRole] = useState<"rep" | "manager" | "executive" | "admin">("rep");
const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
const [teamsLoaded, setTeamsLoaded] = useState(false);
const [inviteError, setInviteError] = useState<string | null>(null);
const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
const [inviteSending, setInviteSending] = useState(false);
```

3. Add a `loadTeams` helper (same pattern as onboarding panel).

4. Render this section only when `initialUser.role === "admin"`. Add a new section in the JSX:
```tsx
{/* Pending Invites */}
<section className="mt-8">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold text-white">Invites</h2>
    <button
      className="rounded-[1rem] bg-[#2c63f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4476ff]"
      onClick={() => setShowInviteForm((prev) => !prev)}
      type="button"
    >
      {showInviteForm ? "Cancel" : "Invite Member"}
    </button>
  </div>

  {showInviteForm ? (
    <div className="mt-4 rounded-[1.5rem] border border-[#182748] bg-[#101a30] p-6">
      {/* Same invite form fields as onboarding panel — email, role, teams */}
      {/* ... (copy form structure from Task 12 step 1) */}
      {inviteError ? <p className="mt-3 text-sm text-[#ff7f7f]">{inviteError}</p> : null}
      {inviteSuccess ? <p className="mt-3 text-sm text-green-400">{inviteSuccess}</p> : null}
      <button
        className="mt-4 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
        disabled={!inviteEmail.trim() || inviteSending}
        onClick={async () => {
          setInviteError(null);
          setInviteSuccess(null);
          setInviteSending(true);
          const response = await fetch("/api/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: inviteEmail,
              role: inviteRole,
              teamIds: inviteTeamIds.length > 0 ? inviteTeamIds : undefined,
            }),
          });
          const data = (await response.json()) as { error?: string; id?: string };
          setInviteSending(false);
          if (!response.ok) {
            setInviteError(data.error ?? "Unable to send invite.");
          } else {
            setInviteSuccess(`Invite sent to ${inviteEmail}`);
            setInviteEmail("");
            setInviteTeamIds([]);
            // Refresh invite list
            const listRes = await fetch("/api/invites");
            if (listRes.ok) {
              setPendingInvites(await listRes.json() as InviteRecord[]);
            }
          }
        }}
        type="button"
      >
        {inviteSending ? "Sending..." : "Send Invite"}
      </button>
    </div>
  ) : null}

  {pendingInvites.length > 0 ? (
    <ul className="mt-4 space-y-2">
      {pendingInvites.map((invite) => (
        <li
          key={invite.id}
          className="flex items-center justify-between rounded-[1rem] border border-[#182748] bg-[#101a30] px-4 py-3"
        >
          <div>
            <p className="text-sm text-white">{invite.email}</p>
            <p className="text-xs text-[#7283a9]">
              {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-4 text-sm text-[#4c5d85]">No pending invites.</p>
  )}
</section>
```

- [ ] **Step 3: Run type check**

```bash
npm run typecheck:web
```
Expected: passes.

- [ ] **Step 4: Run all tests**

```bash
npm run test:web
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(authenticated)/settings/page.tsx apps/web/components/settings-workspace-panel.tsx
git commit -m "feat: add pending invites section to settings page"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full type check**

```bash
npm run typecheck:web && npm run typecheck:worker && npm run typecheck:db
```
Expected: all pass.

- [ ] **Step 2: Full test suite**

```bash
npm run test:web
```
Expected: all tests pass.

- [ ] **Step 3: Manual smoke test — send invite flow**
1. Start the dev server: `npm run dev`
2. Log in as an admin, go to `/onboarding`, create an org
3. On the invite step, send an invite to a test email — confirm no errors
4. Check Resend dashboard (or logs) to confirm the email was triggered
5. Navigate to `/settings` — confirm the pending invite appears in the list

- [ ] **Step 4: Manual smoke test — accept invite flow**
1. Open the invite URL `/invite/[token]` in an incognito window
2. Confirm you see the "Sign in to accept" screen
3. Sign in with the invited email — confirm the auth callback redirects back to `/invite/[token]`
4. Click "Accept Invite" — confirm redirect to `/dashboard`
5. Confirm the user now has an org and the correct role in the database

- [ ] **Step 5: Final commit (if any cleanup needed)**

```bash
git add -p  # stage only intentional changes
git commit -m "chore: final cleanup for invite flow"
```
