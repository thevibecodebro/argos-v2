import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import {
  createDb,
  findActiveCallProcessingSubscription,
  findActiveTrainingAiSubscription,
} from "@argos-v2/db";
import { afterAll, describe, expect, it } from "vitest";
import { discoverWorkerTestDatabaseUrl } from "../test-support/database-env";

function normalizeSql(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function migrationSql() {
  const path = join(
    process.cwd(),
    "../../supabase/migrations/20260820180510_managed_client_capabilities_and_rubric_tracks.sql",
  );

  return normalizeSql(await readFile(path, "utf8"));
}

async function roleplayTenantIsolationMigrationSql() {
  const path = join(
    process.cwd(),
    "../../supabase/migrations/20260821160729_roleplay_session_select_org_scope.sql",
  );

  return normalizeSql(await readFile(path, "utf8"));
}

describe("managed client tenant isolation migration", () => {
  it("marks managed organizations explicitly and versions agreement changes", async () => {
    const sql = await migrationSql();

    expect(sql).toContain("add column if not exists access_model text not null default 'legacy'");
    expect(sql).toContain("organizations_access_model_check");
    expect(sql).toContain("access_model in ('legacy', 'managed')");
    expect(sql).toContain("add column if not exists version integer not null default 1");
    expect(sql).toContain("add column if not exists access_model text not null default 'legacy_package'");
    expect(sql).toContain("software_access_grants_id_org_id_uq");
  });

  it("keeps capability rows service-only and prevents cross-organization attachment", async () => {
    const sql = await migrationSql();

    expect(sql).toContain("create table if not exists public.software_access_capabilities");
    expect(sql).toContain("foreign key (grant_id, org_id) references public.software_access_grants(id, org_id)");
    expect(sql).toContain("primary key (grant_id, capability_key)");
    expect(sql).toContain("alter table public.software_access_capabilities enable row level security");
    expect(sql).toContain("revoke all on table public.software_access_capabilities from public");
    expect(sql).toContain("revoke all on table public.software_access_capabilities from anon");
    expect(sql).toContain("revoke all on table public.software_access_capabilities from authenticated");
    expect(sql).not.toMatch(
      /create policy [^;]+ on public\.software_access_capabilities [^;]+ to (?:anon|authenticated|public)/,
    );
  });

  it("builds rubric tracks with organization-bound foreign keys and RLS", async () => {
    const sql = await migrationSql();

    expect(sql).toContain("create table if not exists public.rubric_tracks");
    expect(sql).toContain("unique (id, org_id)");
    expect(sql).toContain("foreign key (track_id, org_id) references public.rubric_tracks(id, org_id)");
    expect(sql).toContain("create table if not exists public.team_rubric_assignments");
    expect(sql).toContain("foreign key (team_id, org_id) references public.teams(id, org_id)");
    expect(sql).toContain("alter table public.rubric_tracks enable row level security");
    expect(sql).toContain("alter table public.team_rubric_assignments enable row level security");
    expect(sql).toContain("revoke all on table public.rubric_tracks from authenticated");
    expect(sql).toContain("revoke all on table public.team_rubric_assignments from authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.rubric_tracks to service_role");
    expect(sql).toContain("grant select, insert, update, delete on table public.team_rubric_assignments to service_role");
    expect(sql).toContain("revoke insert, update, delete on table public.rubrics from authenticated");
    expect(sql).toContain("revoke insert, update, delete on table public.rubric_categories from authenticated");
    expect(sql).toContain("org_id = private.current_user_org_id()");
    expect(sql).toContain("with check ( org_id = private.current_user_org_id()");
  });

  it("keeps roleplay reads inside the current organization before applying rep scope", async () => {
    const sql = await roleplayTenantIsolationMigrationSql();

    expect(sql).toContain('drop policy if exists "roleplay_sessions_can_read_team_scope"');
    expect(sql).toContain('create policy "roleplay_sessions_can_read_team_scope"');
    expect(sql).toContain("org_id = private.current_user_org_id()");
    expect(sql).toContain("private.current_user_can_read_rep_with_permissions(");
  });
});

const isolationIds = {
  orgA: "10000000-0000-4000-8000-000000000001",
  orgB: "10000000-0000-4000-8000-000000000002",
  userA: "10000000-0000-4000-8000-000000000003",
  userB: "10000000-0000-4000-8000-000000000004",
  callA: "10000000-0000-4000-8000-000000000005",
  callB: "10000000-0000-4000-8000-000000000006",
  trainingA: "10000000-0000-4000-8000-000000000007",
  trainingB: "10000000-0000-4000-8000-000000000008",
  roleplayA: "10000000-0000-4000-8000-000000000009",
  roleplayB: "10000000-0000-4000-8000-000000000010",
  teamA: "10000000-0000-4000-8000-000000000011",
  teamB: "10000000-0000-4000-8000-000000000012",
  trackA: "10000000-0000-4000-8000-000000000013",
  trackB: "10000000-0000-4000-8000-000000000014",
  assignmentA: "10000000-0000-4000-8000-000000000015",
  assignmentB: "10000000-0000-4000-8000-000000000016",
  grantA: "10000000-0000-4000-8000-000000000017",
  rubricA: "10000000-0000-4000-8000-000000000018",
  rubricB: "10000000-0000-4000-8000-000000000019",
} as const;

const workerTestDatabaseUrl = await discoverWorkerTestDatabaseUrl();
const workerTestDb = workerTestDatabaseUrl ? createDb(workerTestDatabaseUrl) : null;
const describeWithDatabase = workerTestDb ? describe : describe.skip;

describeWithDatabase("managed client isolation against local Postgres", () => {
  async function seed() {
    if (!workerTestDb) throw new Error("Local Postgres is required");

    await workerTestDb.execute(sql`
      grant select on table
        public.organizations,
        public.calls,
        public.training_modules,
        public.roleplay_sessions,
        public.rubric_tracks,
        public.team_rubric_assignments
      to authenticated;
    `);
    await workerTestDb.execute(sql`
      insert into public.organizations (id, name, slug, plan, access_model)
      values
        (${isolationIds.orgA}, 'Intero A', 'isolation-intero-a', 'team', 'managed'),
        (${isolationIds.orgB}, 'Intero B', 'isolation-intero-b', 'team', 'managed')
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.users (id, org_id, role, email)
      values
        (${isolationIds.userA}, ${isolationIds.orgA}, 'admin', 'isolation-a@example.test'),
        (${isolationIds.userB}, ${isolationIds.orgB}, 'admin', 'isolation-b@example.test')
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.calls (id, org_id, rep_id, status)
      values
        (${isolationIds.callA}, ${isolationIds.orgA}, ${isolationIds.userA}, 'complete'),
        (${isolationIds.callB}, ${isolationIds.orgB}, ${isolationIds.userB}, 'complete')
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.training_modules (id, org_id, title, order_index)
      values
        (${isolationIds.trainingA}, ${isolationIds.orgA}, 'Training A', 9001),
        (${isolationIds.trainingB}, ${isolationIds.orgB}, 'Training B', 9001)
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.roleplay_sessions (id, org_id, rep_id, status)
      values
        (${isolationIds.roleplayA}, ${isolationIds.orgA}, ${isolationIds.userA}, 'active'),
        (${isolationIds.roleplayB}, ${isolationIds.orgB}, ${isolationIds.userB}, 'active')
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.teams (id, org_id, name)
      values
        (${isolationIds.teamA}, ${isolationIds.orgA}, 'Department A'),
        (${isolationIds.teamB}, ${isolationIds.orgB}, 'Department B')
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.rubric_tracks (id, org_id, name, is_default)
      values
        (${isolationIds.trackA}, ${isolationIds.orgA}, 'Default', true),
        (${isolationIds.trackB}, ${isolationIds.orgB}, 'Default', true)
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.team_rubric_assignments (id, org_id, team_id, track_id)
      values
        (${isolationIds.assignmentA}, ${isolationIds.orgA}, ${isolationIds.teamA}, ${isolationIds.trackA}),
        (${isolationIds.assignmentB}, ${isolationIds.orgB}, ${isolationIds.teamB}, ${isolationIds.trackB})
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.rubrics (id, org_id, track_id, name, is_active)
      values
        (${isolationIds.rubricA}, ${isolationIds.orgA}, ${isolationIds.trackA}, 'Rubric A', true),
        (${isolationIds.rubricB}, ${isolationIds.orgB}, ${isolationIds.trackB}, 'Rubric B', true)
      on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.software_access_grants (
        id, org_id, source_type, package, seat_limit, starts_at, ends_at,
        status, contract_reference, access_model
      ) values (
        ${isolationIds.grantA}, ${isolationIds.orgA}, 'coaching_contract', 'team', 2,
        now() - interval '1 day', now() + interval '30 days', 'active',
        'isolation-test', 'managed_capabilities'
      ) on conflict (id) do nothing;
    `);
    await workerTestDb.execute(sql`
      insert into public.software_access_capabilities (grant_id, org_id, capability_key)
      values (${isolationIds.grantA}, ${isolationIds.orgA}, 'training')
      on conflict do nothing;
    `);
  }

  afterAll(async () => {
    if (!workerTestDb) return;
    await workerTestDb.execute(sql`
      delete from public.users where id in (${isolationIds.userA}, ${isolationIds.userB});
    `);
    await workerTestDb.execute(sql`
      delete from public.organizations where id in (${isolationIds.orgA}, ${isolationIds.orgB});
    `);
  });

  it("shows organization A only its own tenant-readable records on every core surface", async () => {
    if (!workerTestDb) throw new Error("Local Postgres is required");
    await seed();

    const visible = await workerTestDb.transaction(async (tx) => {
      await tx.execute(sql`set local role authenticated`);
      await tx.execute(
        sql`select set_config('request.jwt.claim.sub', ${isolationIds.userA}, true)`,
      );
      return tx.execute(sql`
        select 'organization' as surface, id from public.organizations
          where id in (${isolationIds.orgA}, ${isolationIds.orgB})
        union all
        select 'call', id from public.calls
          where id in (${isolationIds.callA}, ${isolationIds.callB})
        union all
        select 'training', id from public.training_modules
          where id in (${isolationIds.trainingA}, ${isolationIds.trainingB})
        union all
        select 'roleplay', id from public.roleplay_sessions
          where id in (${isolationIds.roleplayA}, ${isolationIds.roleplayB})
        order by surface;
      `);
    });

    expect(
      visible.rows.map((row) => ({
        id: String(row.id),
        surface: String(row.surface),
      })),
    ).toEqual([
      { id: isolationIds.callA, surface: "call" },
      { id: isolationIds.orgA, surface: "organization" },
      { id: isolationIds.roleplayA, surface: "roleplay" },
      { id: isolationIds.trainingA, surface: "training" },
    ]);
  });

  it("does not expose the service-only capability table to tenant sessions", async () => {
    if (!workerTestDb) throw new Error("Local Postgres is required");
    await seed();

    await expect(
      workerTestDb.transaction(async (tx) => {
        await tx.execute(sql`set local role authenticated`);
        await tx.execute(
          sql`select set_config('request.jwt.claim.sub', ${isolationIds.userA}, true)`,
        );
        await tx.execute(sql`select * from public.software_access_capabilities`);
      }),
    ).rejects.toThrow();
  });

  it("rejects cross-organization capability and rubric attachments", async () => {
    if (!workerTestDb) throw new Error("Local Postgres is required");
    await seed();

    await expect(
      workerTestDb.execute(sql`
        insert into public.software_access_capabilities (grant_id, org_id, capability_key)
        values (${isolationIds.grantA}, ${isolationIds.orgB}, 'roleplay');
      `),
    ).rejects.toThrow();

    await expect(
      workerTestDb.execute(sql`
        update public.team_rubric_assignments
        set track_id = ${isolationIds.trackB}
        where id = ${isolationIds.assignmentA};
      `),
    ).rejects.toThrow();
  });

  it("does not let tenant admins mutate platform-gated rubric track state directly", async () => {
    if (!workerTestDb) throw new Error("Local Postgres is required");
    await seed();

    await expect(
      workerTestDb.transaction(async (tx) => {
        await tx.execute(sql`set local role authenticated`);
        await tx.execute(
          sql`select set_config('request.jwt.claim.sub', ${isolationIds.userA}, true)`,
        );
        await tx.execute(sql`
          insert into public.rubric_tracks (org_id, name)
          values (${isolationIds.orgA}, 'Unauthorized tenant track');
        `);
      }),
    ).rejects.toThrow();

    await expect(
      workerTestDb.transaction(async (tx) => {
        await tx.execute(sql`set local role authenticated`);
        await tx.execute(
          sql`select set_config('request.jwt.claim.sub', ${isolationIds.userA}, true)`,
        );
        await tx.execute(sql`
          update public.rubrics
          set track_id = ${isolationIds.trackB}
          where org_id = ${isolationIds.orgA};
        `);
      }),
    ).rejects.toThrow();
  });

  it("does not treat an active managed agreement as access to unselected processing features", async () => {
    if (!workerTestDb) throw new Error("Local Postgres is required");
    await seed();

    await expect(
      findActiveCallProcessingSubscription(workerTestDb, {
        orgId: isolationIds.orgA,
        userId: null,
      }),
    ).resolves.toBeNull();
    await expect(
      findActiveTrainingAiSubscription(workerTestDb, {
        orgId: isolationIds.orgA,
        userId: null,
      }),
    ).resolves.toMatchObject({
      id: isolationIds.grantA,
      sourceType: "coaching_contract",
    });
  });
});
