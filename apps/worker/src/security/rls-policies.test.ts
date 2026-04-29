import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { createDb } from "@argos-v2/db";
import { describe, expect, it } from "vitest";
import { discoverWorkerTestDatabaseUrl } from "../test-support/database-env";

type PolicyRow = {
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
};

type RlsRow = {
  relname: string;
  relrowsecurity: boolean;
};

type DirectTableGrantRow = {
  table_name: string;
  grantee: string;
  privilege_type: string;
};

const expectedPolicies = [
  {
    tablename: "rubrics",
    policyname: "rubrics_can_read_visible",
    cmd: "SELECT",
    roles: ["authenticated"],
  },
  {
    tablename: "rubrics",
    policyname: "rubrics_admins_can_manage",
    cmd: "ALL",
    roles: ["authenticated"],
  },
  {
    tablename: "rubric_categories",
    policyname: "rubric_categories_can_read_visible",
    cmd: "SELECT",
    roles: ["authenticated"],
  },
  {
    tablename: "rubric_categories",
    policyname: "rubric_categories_admins_can_manage",
    cmd: "ALL",
    roles: ["authenticated"],
  },
  {
    tablename: "call_scores",
    policyname: "call_scores_can_read_team_scope",
    cmd: "SELECT",
    roles: ["authenticated"],
  },
] satisfies PolicyRow[];

const serviceOnlyTables = ["invites", "call_processing_jobs"] as const;
const broadClientRoles = ["authenticated", "anon", "public"] as const;
const directClientGrantees = ["anon", "authenticated", "PUBLIC"] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function readMigrationSql() {
  const migrationPath = join(
    process.cwd(),
    "../../supabase/migrations/202604280003_rls_policy_hardening.sql",
  );

  return normalizeWhitespace(await readFile(migrationPath, "utf8"));
}

describe("RLS policy hardening migration", () => {
  it("defines the expected rubric and call score policies", async () => {
    const migrationSql = await readMigrationSql();

    for (const policy of expectedPolicies) {
      expect(migrationSql).toContain(`drop policy if exists "${policy.policyname}"`);
      expect(migrationSql).toContain(`create policy "${policy.policyname}"`);
      expect(migrationSql).toContain(`on public.${policy.tablename}`);
      expect(migrationSql).toContain(`for ${policy.cmd.toLowerCase()} to authenticated`);
    }

    expect(migrationSql).toContain("org_id = public.current_user_org_id()");
    expect(migrationSql).toContain("is_template = true");
    expect(migrationSql).toContain(
      "public.current_user_can_read_call_with_permissions(call_id, ARRAY['view_team_calls']::text[])",
    );
  });

  it("keeps service-only tables behind RLS without broad client policies", async () => {
    const migrationSql = await readMigrationSql();

    for (const table of serviceOnlyTables) {
      expect(migrationSql).toContain(`alter table public.${table} enable row level security`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from public`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from anon`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from authenticated`);
      expect(migrationSql).not.toMatch(
        new RegExp(`create policy "[^"]+" on public\\.${table} .* to (${broadClientRoles.join("|")})`),
      );
    }
  });
});

const workerTestDatabaseUrl = await discoverWorkerTestDatabaseUrl();
const workerTestDb = workerTestDatabaseUrl ? createDb(workerTestDatabaseUrl) : null;
const describeWithDatabase = workerTestDatabaseUrl ? describe : describe.skip;

describeWithDatabase("RLS policy coverage in pg_policies", () => {
  it("has expected policies and service-only RLS coverage", async () => {
    if (!workerTestDb) {
      throw new Error("Missing WORKER_TEST_DATABASE_URL or DATABASE_URL for RLS policy tests");
    }

    const policyResult = await workerTestDb.execute(sql`
      select
        tablename,
        policyname,
        cmd,
        roles
      from pg_policies
      where schemaname = 'public'
        and tablename in (
          'rubrics',
          'rubric_categories',
          'call_scores',
          'invites',
          'call_processing_jobs'
        )
      order by tablename, policyname;
    `);
    const policies = policyResult.rows as PolicyRow[];

    for (const expectedPolicy of expectedPolicies) {
      expect(policies).toContainEqual(expectedPolicy);
    }

    for (const serviceOnlyTable of serviceOnlyTables) {
      expect(
        policies.filter(
          (policy) =>
            policy.tablename === serviceOnlyTable &&
            policy.roles.some((role) =>
              broadClientRoles.includes(role as (typeof broadClientRoles)[number]),
            ),
        ),
      ).toEqual([]);
    }

    const directGrantResult = await workerTestDb.execute(sql`
      select
        table_name,
        grantee,
        privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('invites', 'call_processing_jobs')
        and grantee in ('anon', 'authenticated', 'PUBLIC')
      order by table_name, grantee, privilege_type;
    `);
    const directClientGrants = directGrantResult.rows as DirectTableGrantRow[];

    for (const serviceOnlyTable of serviceOnlyTables) {
      expect(
        directClientGrants.filter(
          (grant) =>
            grant.table_name === serviceOnlyTable &&
            directClientGrantees.includes(grant.grantee as (typeof directClientGrantees)[number]),
        ),
      ).toEqual([]);
    }

    const rlsResult = await workerTestDb.execute(sql`
      select
        relname,
        relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and relname in (
          'rubrics',
          'rubric_categories',
          'call_scores',
          'invites',
          'call_processing_jobs'
        )
      order by relname;
    `);
    const rlsRows = rlsResult.rows as RlsRow[];

    for (const tableName of [
      "rubrics",
      "rubric_categories",
      "call_scores",
      ...serviceOnlyTables,
    ]) {
      expect(rlsRows).toContainEqual({ relname: tableName, relrowsecurity: true });
    }
  });
});
