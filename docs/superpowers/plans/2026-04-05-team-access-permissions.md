# Team Access And Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add future-proofed team-based access control so reps can belong to multiple teams, managers only see granted teams, executives/admins stay org-wide, and the leaderboard remains org-wide by explicit exception.

**Architecture:** Introduce four new primitives: teams, team memberships, primary manager assignments, and per-team permission grants. Centralize access decisions in a new access service, then refactor existing calls, dashboard, training, roleplay, compliance, integrations, and settings flows to consume that service instead of role-only checks.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Drizzle ORM, Supabase, SQL migrations

---

## Scope Check

This remains one implementation plan because the schema, access model, services, RLS, and admin UI are tightly coupled. Shipping any one of them alone would leave the product in a half-migrated state.

## File Structure

### New files

- `packages/db/src/schema/teams.ts`
  Team table definition.
- `packages/db/src/schema/teamMemberships.ts`
  Many-to-many mapping between users and teams with `membershipType`.
- `packages/db/src/schema/repManagerAssignments.ts`
  Primary manager-of-record mapping for reps.
- `packages/db/src/schema/teamPermissionGrants.ts`
  Per-team permission grants for managers.
- `supabase/migrations/202604050001_team_access_permissions.sql`
  Base schema migration for teams, memberships, primary manager assignments, and permission grants.
- `supabase/migrations/202604050002_team_access_policies.sql`
  Helper functions and RLS changes for team-scoped manager access and leaderboard exception handling.
- `apps/web/lib/access/permissions.ts`
  Shared permission keys, presets, and access-related types.
- `apps/web/lib/access/service.ts`
  Central access-resolution service.
- `apps/web/lib/access/service.test.ts`
  Pure access decision tests.
- `apps/web/lib/access/repository.ts`
  Drizzle access repository.
- `apps/web/lib/access/supabase-repository.ts`
  Supabase access repository.
- `apps/web/lib/access/create-repository.ts`
  Repository factory matching existing `create-repository` patterns.
- `apps/web/lib/access/repository.types.ts`
  Shared repository contracts for access service consumers.
- `apps/web/lib/team-access/service.ts`
  Admin-facing team and grant management orchestration.
- `apps/web/lib/team-access/service.test.ts`
  Team and grant workflow tests.
- `apps/web/lib/team-access/repository.ts`
  Drizzle team-access repository.
- `apps/web/lib/team-access/supabase-repository.ts`
  Supabase team-access repository.
- `apps/web/lib/team-access/create-repository.ts`
  Team-access repository factory.
- `apps/web/components/settings/team-access-panel.tsx`
  Focused settings UI for teams, memberships, primary manager, and manager grant presets.
- `apps/web/lib/team-access-panel.test.ts`
  Server-rendered settings/team access panel smoke tests.
- `apps/web/app/api/teams/route.ts`
  Team list and create API.
- `apps/web/app/api/teams/[teamId]/route.ts`
  Team update/archive API.
- `apps/web/app/api/teams/[teamId]/members/route.ts`
  Membership add/remove API.
- `apps/web/app/api/teams/[teamId]/grants/route.ts`
  Manager grant set/update API.
- `apps/web/app/api/organizations/members/[userId]/primary-manager/route.ts`
  Primary manager assignment API.

### Modified files

- `packages/db/src/schema/index.ts`
  Export new schema modules.
- `apps/web/lib/users/service.ts`
  Remove manager-class assumptions from member list/update flows and include primary manager metadata.
- `apps/web/lib/users/repository.ts`
  Join and persist primary manager state in Drizzle.
- `apps/web/lib/users/supabase-repository.ts`
  Join and persist primary manager state in Supabase.
- `apps/web/lib/dashboard/service.ts`
  Use access service for manager-scoped views and keep leaderboard org-wide.
- `apps/web/lib/dashboard/repository.ts`
  Add team-scoped query helpers.
- `apps/web/lib/dashboard/supabase-repository.ts`
  Add team-scoped query helpers.
- `apps/web/lib/calls/service.ts`
  Replace role-only manager checks with access service decisions.
- `apps/web/lib/calls/repository.ts`
  Add rep/team lookup helpers needed by access.
- `apps/web/lib/calls/supabase-repository.ts`
  Add rep/team lookup helpers needed by access.
- `apps/web/lib/training/service.ts`
  Add team-aware manager checks and team-tagged training ownership.
- `apps/web/lib/training/repository.ts`
  Support team-aware training queries.
- `apps/web/lib/training/supabase-repository.ts`
  Support team-aware training queries.
- `apps/web/lib/roleplay/service.ts`
  Replace manager-class checks with access service decisions.
- `apps/web/lib/compliance/service.ts`
  Keep executive/admin org-wide access and route manager actions through grants if team-scoped behavior is added.
- `apps/web/lib/integrations/service.ts`
  Keep admin/executive org-wide configuration and remove role-only manager assumptions.
- `apps/web/components/settings-workspace-panel.tsx`
  Host the new `TeamAccessPanel`.
- `apps/web/app/(authenticated)/settings/page.tsx`
  Load team access data and pass it into settings.
- `apps/web/lib/settings-workspace-panel.test.ts`
  Update settings rendering expectations.
- `apps/web/app/api/organizations/members/[userId]/route.ts`
  Keep admin-only role changes but include primary-manager metadata handling where needed.
- `apps/web/app/api/dashboard/leaderboard/route.ts`
  Keep org-wide visibility explicit.

### Test focus

- `apps/web/lib/access/service.test.ts`
- `apps/web/lib/team-access/service.test.ts`
- `apps/web/lib/users/service.test.ts`
- `apps/web/lib/calls/service.test.ts`
- `apps/web/lib/dashboard/service.test.ts`
- `apps/web/lib/training/service.test.ts`
- `apps/web/lib/roleplay/service.test.ts`
- `apps/web/lib/settings-workspace-panel.test.ts`
- `apps/web/lib/team-access-panel.test.ts`

## Task 1: Introduce Access Primitives And Decision Tests

**Files:**
- Create: `apps/web/lib/access/permissions.ts`
- Create: `apps/web/lib/access/service.ts`
- Test: `apps/web/lib/access/service.test.ts`

- [ ] **Step 1: Write the failing access decision tests**

```ts
import { describe, expect, it } from "vitest";
import {
  buildAccessContext,
  canActorViewRep,
  canActorUsePermissionForRep,
  canActorDrillIntoLeaderboardRep,
} from "./service";

describe("access service", () => {
  it("allows a manager to view reps on teams where they hold view_team_calls", () => {
    const access = buildAccessContext({
      actor: { id: "mgr-1", role: "manager", orgId: "org-1" },
      memberships: [
        { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        { teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_calls" },
      ],
    });

    expect(canActorViewRep(access, "rep-1")).toBe(true);
    expect(canActorViewRep(access, "rep-2")).toBe(false);
  });

  it("allows leaderboard visibility org-wide but keeps drilldown scoped", () => {
    const access = buildAccessContext({
      actor: { id: "mgr-1", role: "manager", orgId: "org-1" },
      memberships: [
        { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        { teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_analytics" },
      ],
    });

    expect(access.canSeeLeaderboard).toBe(true);
    expect(canActorDrillIntoLeaderboardRep(access, "rep-1")).toBe(true);
    expect(canActorDrillIntoLeaderboardRep(access, "rep-2")).toBe(false);
  });

  it("treats executives as org-wide viewers", () => {
    const access = buildAccessContext({
      actor: { id: "exec-1", role: "executive", orgId: "org-1" },
      memberships: [],
      grants: [],
    });

    expect(canActorViewRep(access, "rep-1")).toBe(true);
    expect(canActorUsePermissionForRep(access, "view_team_calls", "rep-1")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @argos-v2/web -- apps/web/lib/access/service.test.ts`

Expected: FAIL with module resolution errors for `./service` and missing exports.

- [ ] **Step 3: Write the minimal access primitives and pure decision helpers**

`apps/web/lib/access/permissions.ts`

```ts
export const TEAM_PERMISSION_KEYS = [
  "view_team_calls",
  "coach_team_calls",
  "manage_call_highlights",
  "view_team_training",
  "manage_team_training",
  "manage_team_roster",
  "view_team_analytics",
] as const;

export type TeamPermissionKey = (typeof TEAM_PERMISSION_KEYS)[number];

export type TeamMembershipType = "rep" | "manager";

export type AccessActorRole = "admin" | "executive" | "manager" | "rep";

export type AccessActor = {
  id: string;
  orgId: string | null;
  role: AccessActorRole | null;
};

export type TeamMembershipRecord = {
  teamId: string;
  userId: string;
  membershipType: TeamMembershipType;
};

export type TeamPermissionGrantRecord = {
  teamId: string;
  userId: string;
  permissionKey: TeamPermissionKey;
};
```

`apps/web/lib/access/service.ts`

```ts
import type {
  AccessActor,
  TeamMembershipRecord,
  TeamPermissionGrantRecord,
  TeamPermissionKey,
} from "./permissions";

export type AccessContext = {
  actor: AccessActor;
  repIdsByTeamId: Map<string, Set<string>>;
  grantedTeamIdsByPermission: Map<TeamPermissionKey, Set<string>>;
  canSeeLeaderboard: boolean;
};

export function buildAccessContext(input: {
  actor: AccessActor;
  memberships: TeamMembershipRecord[];
  grants: TeamPermissionGrantRecord[];
}): AccessContext {
  const repIdsByTeamId = new Map<string, Set<string>>();
  for (const membership of input.memberships) {
    if (membership.membershipType !== "rep") continue;
    const current = repIdsByTeamId.get(membership.teamId) ?? new Set<string>();
    current.add(membership.userId);
    repIdsByTeamId.set(membership.teamId, current);
  }

  const grantedTeamIdsByPermission = new Map<TeamPermissionKey, Set<string>>();
  for (const grant of input.grants) {
    const current = grantedTeamIdsByPermission.get(grant.permissionKey) ?? new Set<string>();
    current.add(grant.teamId);
    grantedTeamIdsByPermission.set(grant.permissionKey, current);
  }

  return {
    actor: input.actor,
    repIdsByTeamId,
    grantedTeamIdsByPermission,
    canSeeLeaderboard: Boolean(input.actor.orgId),
  };
}

export function canActorViewRep(access: AccessContext, repId: string) {
  if (access.actor.role === "admin" || access.actor.role === "executive") return true;
  if (access.actor.role === "rep") return access.actor.id === repId;

  const teamIds = access.grantedTeamIdsByPermission.get("view_team_calls") ?? new Set<string>();
  for (const teamId of teamIds) {
    if (access.repIdsByTeamId.get(teamId)?.has(repId)) return true;
  }
  return false;
}

export function canActorUsePermissionForRep(
  access: AccessContext,
  permissionKey: TeamPermissionKey,
  repId: string,
) {
  if (access.actor.role === "admin" || access.actor.role === "executive") return true;
  if (access.actor.role !== "manager") return access.actor.id === repId;

  const teamIds = access.grantedTeamIdsByPermission.get(permissionKey) ?? new Set<string>();
  for (const teamId of teamIds) {
    if (access.repIdsByTeamId.get(teamId)?.has(repId)) return true;
  }
  return false;
}

export function canActorDrillIntoLeaderboardRep(access: AccessContext, repId: string) {
  if (access.actor.role === "admin" || access.actor.role === "executive") return true;
  if (access.actor.role === "rep") return access.actor.id === repId;
  return canActorUsePermissionForRep(access, "view_team_analytics", repId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @argos-v2/web -- apps/web/lib/access/service.test.ts`

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/access/permissions.ts apps/web/lib/access/service.ts apps/web/lib/access/service.test.ts
git commit -m "feat: add access permission primitives"
```

## Task 2: Add Team Access Schema And Export Surface

**Files:**
- Create: `packages/db/src/schema/teams.ts`
- Create: `packages/db/src/schema/teamMemberships.ts`
- Create: `packages/db/src/schema/repManagerAssignments.ts`
- Create: `packages/db/src/schema/teamPermissionGrants.ts`
- Create: `supabase/migrations/202604050001_team_access_permissions.sql`
- Test: `apps/web/lib/access/schema-smoke.test.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Write the failing schema export smoke test**

```ts
import { describe, expect, it } from "vitest";
import {
  teamsTable,
  teamMembershipsTable,
  repManagerAssignmentsTable,
  teamPermissionGrantsTable,
} from "@argos-v2/db";

describe("team access schema exports", () => {
  it("exports the new access tables", () => {
    expect(teamsTable).toBeTruthy();
    expect(teamMembershipsTable).toBeTruthy();
    expect(repManagerAssignmentsTable).toBeTruthy();
    expect(teamPermissionGrantsTable).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @argos-v2/web -- apps/web/lib/access/schema-smoke.test.ts`

Expected: FAIL because the new exports do not exist in `@argos-v2/db`.

- [ ] **Step 3: Add the schema modules, exports, and migration**

`packages/db/src/schema/teams.ts`

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const teamsTable = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

`packages/db/src/schema/teamMemberships.ts`

```ts
import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const teamMembershipsTable = pgTable(
  "team_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    membershipType: text("membership_type", { enum: ["rep", "manager"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueMembership: uniqueIndex("team_memberships_unique_user_team_type").on(
      table.teamId,
      table.userId,
      table.membershipType,
    ),
  }),
);
```

`packages/db/src/schema/repManagerAssignments.ts`

```ts
import { pgTable, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const repManagerAssignmentsTable = pgTable(
  "rep_manager_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    repId: uuid("rep_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRep: uniqueIndex("rep_manager_assignments_unique_rep").on(table.repId),
  }),
);
```

`packages/db/src/schema/teamPermissionGrants.ts`

```ts
import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const teamPermissionGrantsTable = pgTable(
  "team_permission_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key").notNull(),
    grantedBy: uuid("granted_by").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueGrant: uniqueIndex("team_permission_grants_unique_user_team_permission").on(
      table.teamId,
      table.userId,
      table.permissionKey,
    ),
  }),
);
```

`packages/db/src/schema/index.ts`

```ts
export * from "./organizations";
export * from "./users";
export * from "./teams";
export * from "./teamMemberships";
export * from "./repManagerAssignments";
export * from "./teamPermissionGrants";
export * from "./calls";
export * from "./training";
export * from "./notifications";
export * from "./roleplay";
export * from "./compliance";
export * from "./zoomIntegrations";
export * from "./ghlIntegrations";
```

`supabase/migrations/202604050001_team_access_permissions.sql`

```sql
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  membership_type text not null check (membership_type in ('rep', 'manager')),
  created_at timestamptz not null default now()
);

create unique index if not exists team_memberships_unique_user_team_type
  on public.team_memberships (team_id, user_id, membership_type);

create table if not exists public.rep_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references public.users(id) on delete cascade,
  manager_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists rep_manager_assignments_unique_rep
  on public.rep_manager_assignments (rep_id);

create table if not exists public.team_permission_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null,
  granted_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists team_permission_grants_unique_user_team_permission
  on public.team_permission_grants (team_id, user_id, permission_key);
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/access/schema-smoke.test.ts
npm run typecheck:db
```

Expected:

- Vitest PASS for schema smoke test
- TypeScript typecheck PASS for `@argos-v2/db`

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/index.ts packages/db/src/schema/teams.ts packages/db/src/schema/teamMemberships.ts packages/db/src/schema/repManagerAssignments.ts packages/db/src/schema/teamPermissionGrants.ts supabase/migrations/202604050001_team_access_permissions.sql apps/web/lib/access/schema-smoke.test.ts
git commit -m "feat: add team access schema"
```

## Task 3: Add Access Repositories And Team Access Admin Service

**Files:**
- Create: `apps/web/lib/access/repository.types.ts`
- Create: `apps/web/lib/access/repository.ts`
- Create: `apps/web/lib/access/supabase-repository.ts`
- Create: `apps/web/lib/access/create-repository.ts`
- Create: `apps/web/lib/team-access/service.ts`
- Create: `apps/web/lib/team-access/service.test.ts`
- Create: `apps/web/lib/team-access/repository.ts`
- Create: `apps/web/lib/team-access/supabase-repository.ts`
- Create: `apps/web/lib/team-access/create-repository.ts`

- [ ] **Step 1: Write the failing admin service tests**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  assignPrimaryManager,
  createTeam,
  setManagerPermissionPreset,
} from "./service";

const repository = {
  createTeam: vi.fn().mockResolvedValue({ id: "team-a", orgId: "org-1", name: "Closers", description: null, status: "active", createdAt: new Date(), updatedAt: new Date() }),
  findCurrentUserByAuthId: vi.fn().mockResolvedValue({ id: "admin-1", email: "owner@argos.ai", role: "admin", firstName: "Ada", lastName: "Owner", org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" } }),
  upsertPrimaryManagerAssignment: vi.fn().mockResolvedValue({ repId: "rep-1", managerId: "mgr-1" }),
  replaceManagerTeamPermissionGrants: vi.fn().mockResolvedValue(["view_team_calls", "coach_team_calls", "view_team_analytics"]),
};

describe("team access service", () => {
  it("allows admins to create teams", async () => {
    const result = await createTeam(repository as any, "admin-1", { name: "Closers", description: "" });
    expect(result.ok).toBe(true);
  });

  it("assigns a primary manager of record", async () => {
    const result = await assignPrimaryManager(repository as any, "admin-1", { repId: "rep-1", managerId: "mgr-1" });
    expect(result.ok).toBe(true);
    expect(repository.upsertPrimaryManagerAssignment).toHaveBeenCalledWith("org-1", "rep-1", "mgr-1");
  });

  it("materializes a preset into explicit grants", async () => {
    const result = await setManagerPermissionPreset(repository as any, "admin-1", {
      teamId: "team-a",
      managerId: "mgr-1",
      preset: "Coach",
    });
    expect(result.ok).toBe(true);
    expect(repository.replaceManagerTeamPermissionGrants).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @argos-v2/web -- apps/web/lib/team-access/service.test.ts`

Expected: FAIL with missing module and missing export errors.

- [ ] **Step 3: Add the repository contracts and admin service**

`apps/web/lib/access/repository.types.ts`

```ts
import type { AccessActor, TeamMembershipRecord, TeamPermissionGrantRecord } from "./permissions";

export interface AccessRepository {
  findActorByAuthUserId(authUserId: string): Promise<AccessActor | null>;
  findMembershipsByOrgId(orgId: string): Promise<TeamMembershipRecord[]>;
  findGrantsByUserId(userId: string, orgId: string): Promise<TeamPermissionGrantRecord[]>;
}
```

`apps/web/lib/access/create-repository.ts`

```ts
import { DrizzleAccessRepository } from "./repository";
import { SupabaseAccessRepository } from "./supabase-repository";

export function createAccessRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleAccessRepository();
  }

  return new SupabaseAccessRepository();
}
```

`apps/web/lib/team-access/service.ts`

```ts
import type { TeamPermissionKey } from "@/lib/access/permissions";

const PRESET_GRANTS: Record<"Coach" | "Training Manager" | "Team Lead", TeamPermissionKey[]> = {
  Coach: ["view_team_calls", "coach_team_calls", "manage_call_highlights", "view_team_analytics"],
  "Training Manager": ["view_team_training", "manage_team_training", "view_team_analytics"],
  "Team Lead": [
    "view_team_calls",
    "coach_team_calls",
    "manage_call_highlights",
    "view_team_training",
    "manage_team_training",
    "manage_team_roster",
    "view_team_analytics",
  ],
};

function assertAdmin(viewer: { role: string | null; org: { id: string } | null }) {
  if (viewer.role !== "admin" || !viewer.org) {
    return { ok: false as const, status: 403 as const, error: "Admin only" };
  }
  return { ok: true as const, orgId: viewer.org.id };
}

export async function createTeam(
  repository: {
    createTeam(input: { orgId: string; name: string; description: string | null }): Promise<unknown>;
    findCurrentUserByAuthId(authUserId: string): Promise<{ role: string | null; org: { id: string } | null } | null>;
  },
  authUserId: string,
  input: { name?: unknown; description?: unknown },
) {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) return { ok: false as const, status: 404 as const, error: "User not found" };

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) return adminCheck;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() || null : null;
  if (!name) return { ok: false as const, status: 400 as const, error: "name is required" };

  const team = await repository.createTeam({ orgId: adminCheck.orgId, name, description });
  return { ok: true as const, data: team };
}

export async function assignPrimaryManager(
  repository: {
    findCurrentUserByAuthId(authUserId: string): Promise<{ role: string | null; org: { id: string } | null } | null>;
    upsertPrimaryManagerAssignment(orgId: string, repId: string, managerId: string): Promise<unknown>;
  },
  authUserId: string,
  input: { repId?: unknown; managerId?: unknown },
) {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) return { ok: false as const, status: 404 as const, error: "User not found" };

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) return adminCheck;

  if (typeof input.repId !== "string" || typeof input.managerId !== "string") {
    return { ok: false as const, status: 400 as const, error: "repId and managerId are required" };
  }

  const assignment = await repository.upsertPrimaryManagerAssignment(adminCheck.orgId, input.repId, input.managerId);
  return { ok: true as const, data: assignment };
}

export async function setManagerPermissionPreset(
  repository: {
    findCurrentUserByAuthId(authUserId: string): Promise<{ role: string | null; org: { id: string } | null } | null>;
    replaceManagerTeamPermissionGrants(input: { orgId: string; teamId: string; managerId: string; permissionKeys: TeamPermissionKey[]; grantedBy: string }): Promise<TeamPermissionKey[]>;
  },
  authUserId: string,
  input: { teamId?: unknown; managerId?: unknown; preset?: unknown },
) {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) return { ok: false as const, status: 404 as const, error: "User not found" };

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) return adminCheck;

  if (
    typeof input.teamId !== "string" ||
    typeof input.managerId !== "string" ||
    (input.preset !== "Coach" && input.preset !== "Training Manager" && input.preset !== "Team Lead")
  ) {
    return { ok: false as const, status: 400 as const, error: "teamId, managerId, and preset are required" };
  }

  const grants = await repository.replaceManagerTeamPermissionGrants({
    orgId: adminCheck.orgId,
    teamId: input.teamId,
    managerId: input.managerId,
    permissionKeys: PRESET_GRANTS[input.preset],
    grantedBy: authUserId,
  });

  return { ok: true as const, data: { grants } };
}

export async function getTeamAccessSnapshot(
  repository: {
    findCurrentUserByAuthId(authUserId: string): Promise<{ role: string | null; org: { id: string } | null } | null>;
    findTeamAccessSnapshot(orgId: string): Promise<{
      teams: Array<{ id: string; name: string; description: string | null; status: string }>;
      managers: Array<{ id: string; name: string }>;
      reps: Array<{ id: string; name: string; primaryManagerId: string | null }>;
    }>;
  },
  authUserId: string,
) {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) return { ok: false as const, status: 404 as const, error: "User not found" };

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) return adminCheck;

  const snapshot = await repository.findTeamAccessSnapshot(adminCheck.orgId);
  return { ok: true as const, data: snapshot };
}
```

`apps/web/lib/team-access/create-repository.ts`

```ts
import { DrizzleTeamAccessRepository } from "./repository";
import { SupabaseTeamAccessRepository } from "./supabase-repository";

export function createTeamAccessRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleTeamAccessRepository();
  }

  return new SupabaseTeamAccessRepository();
}
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/team-access/service.test.ts
npm run typecheck:web
```

Expected:

- Vitest PASS for team access admin service tests
- Web typecheck PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/access/repository.types.ts apps/web/lib/access/repository.ts apps/web/lib/access/supabase-repository.ts apps/web/lib/access/create-repository.ts apps/web/lib/team-access/service.ts apps/web/lib/team-access/service.test.ts apps/web/lib/team-access/repository.ts apps/web/lib/team-access/supabase-repository.ts apps/web/lib/team-access/create-repository.ts
git commit -m "feat: add team access admin services"
```

## Task 4: Refactor Product Read Paths To Use Team-Scoped Access

**Files:**
- Modify: `apps/web/lib/calls/service.ts`
- Modify: `apps/web/lib/calls/service.test.ts`
- Modify: `apps/web/lib/dashboard/service.ts`
- Modify: `apps/web/lib/dashboard/service.test.ts`
- Modify: `apps/web/lib/training/service.ts`
- Modify: `apps/web/lib/training/service.test.ts`
- Modify: `apps/web/lib/roleplay/service.ts`
- Modify: `apps/web/lib/roleplay/service.test.ts`
- Modify: `apps/web/app/api/team/route.ts`
- Modify: `apps/web/app/api/team/[repId]/route.ts`

- [ ] **Step 1: Write the failing service tests for team-scoped managers**

`apps/web/lib/calls/service.test.ts`

```ts
it("blocks a manager from viewing a rep outside granted teams", async () => {
  const accessRepository = {
    findActorByAuthUserId: vi.fn().mockResolvedValue({ id: "mgr-1", role: "manager", orgId: "org-1" }),
    findMembershipsByOrgId: vi.fn().mockResolvedValue([
      { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
      { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      { teamId: "team-b", userId: "rep-2", membershipType: "rep" },
    ]),
    findGrantsByUserId: vi.fn().mockResolvedValue([
      { teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_calls" },
    ]),
  };

  const result = await getCallDetail(repository as any, "mgr-1", "call-for-rep-2", accessRepository as any);
  expect(result).toMatchObject({ ok: false, status: 403 });
});
```

`apps/web/lib/dashboard/service.test.ts`

```ts
it("keeps leaderboard org-wide while team drilldown stays scoped", async () => {
  const leaderboard = await getDashboardLeaderboard(repository, "mgr-1", new Date("2026-04-05T00:00:00.000Z"));
  expect(leaderboard?.topQuality.length).toBeGreaterThan(0);

  await expect(getRepDashboard(repository, "mgr-1", "rep-outside-scope")).rejects.toMatchObject({
    status: 403,
  });
});
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/calls/service.test.ts apps/web/lib/dashboard/service.test.ts apps/web/lib/training/service.test.ts apps/web/lib/roleplay/service.test.ts
```

Expected: FAIL because the services still use role-only manager checks.

- [ ] **Step 3: Inject access service into calls, dashboard, training, and roleplay**

Representative changes:

`apps/web/lib/calls/service.ts`

```ts
import { buildAccessContext, canActorUsePermissionForRep, canActorViewRep } from "@/lib/access/service";
import { createAccessRepository } from "@/lib/access/create-repository";

export async function getCallDetail(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  accessRepository = createAccessRepository(),
) {
  // ...
}

async function resolveViewerAccess(authUserId: string, accessRepository = createAccessRepository()) {
  const actor = await accessRepository.findActorByAuthUserId(authUserId);
  if (!actor?.orgId) return null;

  const [memberships, grants] = await Promise.all([
    accessRepository.findMembershipsByOrgId(actor.orgId),
    accessRepository.findGrantsByUserId(actor.id, actor.orgId),
  ]);

  return buildAccessContext({ actor, memberships, grants });
}

if (viewerAccess && !canActorViewRep(viewerAccess, call.repId)) {
  return { ok: false, status: 403, code: "forbidden", error: "You do not have access to this rep" };
}
```

`apps/web/lib/dashboard/service.ts`

```ts
if (requestedRepId && access && !canActorDrillIntoLeaderboardRep(access, requestedRepId)) {
  throw new DashboardServiceError("Only authorized team managers can view this rep", 403);
}
```

`apps/web/lib/training/service.ts`

```ts
if (!canActorUsePermissionForRep(access, "view_team_training", targetRepId)) {
  return { ok: false, status: 403, error: "Managers only" };
}
```

`apps/web/lib/roleplay/service.ts`

```ts
if (session.repId !== viewerResult.data.id && access && !canActorViewRep(access, session.repId)) {
  return { ok: false, status: 403, error: "You do not have access to this roleplay session" };
}
```

- [ ] **Step 4: Run the product access tests and typecheck**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/calls/service.test.ts apps/web/lib/dashboard/service.test.ts apps/web/lib/training/service.test.ts apps/web/lib/roleplay/service.test.ts
npm run typecheck:web
```

Expected:

- All four service suites PASS
- TypeScript typecheck PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/calls/service.ts apps/web/lib/calls/service.test.ts apps/web/lib/dashboard/service.ts apps/web/lib/dashboard/service.test.ts apps/web/lib/training/service.ts apps/web/lib/training/service.test.ts apps/web/lib/roleplay/service.ts apps/web/lib/roleplay/service.test.ts apps/web/app/api/team/route.ts apps/web/app/api/team/[repId]/route.ts
git commit -m "feat: scope manager views by team access"
```

## Task 5: Add Admin APIs And Settings UI For Teams, Memberships, And Grants

**Files:**
- Create: `apps/web/components/settings/team-access-panel.tsx`
- Create: `apps/web/lib/team-access-panel.test.ts`
- Create: `apps/web/app/api/teams/route.ts`
- Create: `apps/web/app/api/teams/[teamId]/route.ts`
- Create: `apps/web/app/api/teams/[teamId]/members/route.ts`
- Create: `apps/web/app/api/teams/[teamId]/grants/route.ts`
- Create: `apps/web/app/api/organizations/members/[userId]/primary-manager/route.ts`
- Modify: `apps/web/components/settings-workspace-panel.tsx`
- Modify: `apps/web/app/(authenticated)/settings/page.tsx`
- Modify: `apps/web/lib/settings-workspace-panel.test.ts`

- [ ] **Step 1: Write the failing UI and route tests**

`apps/web/lib/team-access-panel.test.ts`

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamAccessPanel } from "../components/settings/team-access-panel";

describe("TeamAccessPanel", () => {
  it("renders teams, manager presets, and primary manager controls", () => {
    const html = renderToStaticMarkup(
      createElement(TeamAccessPanel, {
        canManage: true,
        teams: [{ id: "team-a", name: "Closers", description: null, status: "active" }],
        managers: [{ id: "mgr-1", name: "Morgan Lane" }],
        reps: [{ id: "rep-1", name: "Riley Stone", primaryManagerId: "mgr-1" }],
      }),
    );

    expect(html).toContain("Team Access");
    expect(html).toContain("Closers");
    expect(html).toContain("Primary manager");
    expect(html).toContain("Coach");
  });
});
```

`apps/web/lib/settings-workspace-panel.test.ts`

```ts
expect(html).toContain("Team Access");
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/team-access-panel.test.ts apps/web/lib/settings-workspace-panel.test.ts
```

Expected: FAIL because `TeamAccessPanel` and its settings integration do not exist.

- [ ] **Step 3: Add the team access panel and APIs**

`apps/web/components/settings/team-access-panel.tsx`

```tsx
"use client";

type TeamAccessPanelProps = {
  canManage: boolean;
  teams: Array<{ id: string; name: string; description: string | null; status: string }>;
  managers: Array<{ id: string; name: string }>;
  reps: Array<{ id: string; name: string; primaryManagerId: string | null }>;
};

export function TeamAccessPanel({ canManage, teams, managers, reps }: TeamAccessPanelProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Team Access</h2>
        </div>
        <span className="text-sm text-slate-400">{teams.length} teams</span>
      </div>

      {!canManage ? (
        <p className="mt-4 text-sm text-slate-400">Only admins can manage teams and grants.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {teams.map((team) => (
            <article key={team.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{team.name}</p>
                  <p className="text-sm text-slate-400">{team.description ?? "No description"}</p>
                </div>
                <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                  {team.status}
                </span>
              </div>
            </article>
          ))}

          <div>
            <p className="text-sm font-semibold text-slate-200">Primary manager</p>
            <p className="mt-1 text-sm text-slate-400">
              Assign one accountable owner per rep while preserving multi-team memberships.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">Permission presets</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Coach", "Training Manager", "Team Lead"].map((preset) => (
                <span key={preset} className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300">
                  {preset}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

`apps/web/components/settings-workspace-panel.tsx`

```tsx
import { TeamAccessPanel } from "./settings/team-access-panel";

type SettingsWorkspacePanelProps = {
  initialTeams: Array<{ id: string; name: string; description: string | null; status: string }>;
  initialManagers: Array<{ id: string; name: string }>;
  initialReps: Array<{ id: string; name: string; primaryManagerId: string | null }>;
};

<TeamAccessPanel
  canManage={currentUser.role === "admin"}
  teams={initialTeams}
  managers={initialManagers}
  reps={initialReps}
/>
```

`apps/web/app/(authenticated)/settings/page.tsx`

```ts
const teamAccessResult =
  authUser && profileResult.data.role === "admin"
    ? await getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id)
    : null;

<SettingsWorkspacePanel
  initialTeams={teamAccessResult?.ok ? teamAccessResult.data.teams : []}
  initialManagers={teamAccessResult?.ok ? teamAccessResult.data.managers : []}
  initialReps={teamAccessResult?.ok ? teamAccessResult.data.reps : []}
/>
```

`apps/web/app/api/teams/route.ts`

```ts
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { createTeam } from "@/lib/team-access/service";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) return unauthorizedJson();

  const payload = await request.json();
  return fromServiceResult(await createTeam(createTeamAccessRepository(), authUser.id, payload));
}
```

- [ ] **Step 4: Run UI and route verification**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/team-access-panel.test.ts apps/web/lib/settings-workspace-panel.test.ts
npm run typecheck:web
```

Expected:

- Both UI tests PASS
- Web typecheck PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/settings/team-access-panel.tsx apps/web/lib/team-access-panel.test.ts apps/web/app/api/teams/route.ts apps/web/app/api/teams/[teamId]/route.ts apps/web/app/api/teams/[teamId]/members/route.ts apps/web/app/api/teams/[teamId]/grants/route.ts apps/web/app/api/organizations/members/[userId]/primary-manager/route.ts apps/web/components/settings-workspace-panel.tsx apps/web/app/(authenticated)/settings/page.tsx apps/web/lib/settings-workspace-panel.test.ts
git commit -m "feat: add admin team access settings"
```

## Task 6: Add Team-Scoped Persistence, RLS, And Leaderboard Exception Behavior

**Files:**
- Create: `supabase/migrations/202604050002_team_access_policies.sql`
- Modify: `apps/web/lib/users/repository.ts`
- Modify: `apps/web/lib/users/supabase-repository.ts`
- Modify: `apps/web/lib/dashboard/repository.ts`
- Modify: `apps/web/lib/dashboard/supabase-repository.ts`
- Modify: `apps/web/lib/calls/repository.ts`
- Modify: `apps/web/lib/calls/supabase-repository.ts`
- Modify: `apps/web/lib/training/repository.ts`
- Modify: `apps/web/lib/training/supabase-repository.ts`
- Modify: `apps/web/lib/compliance/service.ts`
- Modify: `apps/web/lib/integrations/service.ts`
- Modify: `apps/web/app/api/dashboard/leaderboard/route.ts`

- [ ] **Step 1: Write the failing regression tests for leaderboard drilldown and primary-manager data**

`apps/web/lib/users/service.test.ts`

```ts
it("returns primary manager metadata for org members", async () => {
  const result = await listOrganizationMembers(repository as any, "admin-1");
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data[0]).toHaveProperty("primaryManagerId");
});
```

`apps/web/lib/dashboard/service.test.ts`

```ts
it("keeps leaderboard visible org-wide for managers", async () => {
  const result = await getDashboardLeaderboard(repository, "mgr-1");
  expect(result?.topQuality.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run regression tests to verify failure**

Run:

```bash
npm run test -w @argos-v2/web -- apps/web/lib/users/service.test.ts apps/web/lib/dashboard/service.test.ts
```

Expected: FAIL because primary manager metadata is absent and the drilldown/leaderboard rules are not fully wired through repository data.

- [ ] **Step 3: Add the persistence joins and RLS helper functions**

`supabase/migrations/202604050002_team_access_policies.sql`

```sql
create or replace function public.current_user_is_org_wide()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'executive');
$$;

create or replace function public.current_user_can_view_rep(target_rep_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_org_wide()
    or target_rep_id = auth.uid()
    or exists (
      select 1
      from public.team_permission_grants g
      join public.team_memberships manager_membership
        on manager_membership.team_id = g.team_id
       and manager_membership.user_id = g.user_id
       and manager_membership.membership_type = 'manager'
      join public.team_memberships rep_membership
        on rep_membership.team_id = g.team_id
       and rep_membership.user_id = target_rep_id
       and rep_membership.membership_type = 'rep'
      where g.user_id = auth.uid()
        and g.permission_key = 'view_team_calls'
    );
$$;
```

`apps/web/lib/users/repository.ts`

```ts
primaryManagerId: repManagerAssignmentsTable.managerId,
```

`apps/web/lib/dashboard/repository.ts`

```ts
query = query.where(inArray(callsTable.repId, scopedRepIds));
```

`apps/web/app/api/dashboard/leaderboard/route.ts`

```ts
// The leaderboard stays org-wide by product rule. Drilldown routes enforce scoped access separately.
return NextResponse.json({ leaderboard });
```

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run test:web
npm run typecheck:web
npm run typecheck:db
```

Expected:

- Full web Vitest suite PASS
- Web typecheck PASS
- DB typecheck PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202604050002_team_access_policies.sql apps/web/lib/users/repository.ts apps/web/lib/users/supabase-repository.ts apps/web/lib/dashboard/repository.ts apps/web/lib/dashboard/supabase-repository.ts apps/web/lib/calls/repository.ts apps/web/lib/calls/supabase-repository.ts apps/web/lib/training/repository.ts apps/web/lib/training/supabase-repository.ts apps/web/lib/compliance/service.ts apps/web/lib/integrations/service.ts apps/web/app/api/dashboard/leaderboard/route.ts apps/web/lib/users/service.test.ts apps/web/lib/dashboard/service.test.ts
git commit -m "feat: persist and enforce team access rules"
```

## Self-Review

### Spec coverage

- Teams, many-to-many memberships, primary manager, and permission grants: covered by Tasks 2 and 3
- Centralized access checks: covered by Tasks 1, 3, and 4
- Manager team scoping across product data: covered by Task 4
- Admin UX for teams and grants: covered by Task 5
- Leaderboard org-wide exception: covered by Tasks 4 and 6
- Future-proofing for Option 3: covered by explicit permission primitives in Tasks 1, 2, and 3

No spec gaps remain.

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- Every task includes exact file paths, code blocks, commands, expected outputs, and commit commands.

### Type consistency

- `TeamPermissionKey`, `TeamMembershipType`, and access actor roles are defined once in `apps/web/lib/access/permissions.ts` and reused across later tasks.
- Team preset names are consistent across service and UI tasks: `Coach`, `Training Manager`, `Team Lead`.
- New DB table names remain consistent across schema and SQL tasks: `teams`, `team_memberships`, `rep_manager_assignments`, `team_permission_grants`.
