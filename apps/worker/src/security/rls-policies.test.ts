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

type RawPolicyRow = Omit<PolicyRow, "roles"> & {
  roles: string[] | string;
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

const coreServiceOnlyTables = ["invites", "call_processing_jobs"] as const;
const ghlServiceOnlyTables = ["ghl_user_mappings", "ghl_call_imports"] as const;
const serviceOnlyTables = [...coreServiceOnlyTables, ...ghlServiceOnlyTables] as const;
const broadClientRoles = ["authenticated", "anon", "public"] as const;
const directClientGrantees = ["anon", "authenticated", "PUBLIC"] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePgArray(value: string[] | string) {
  if (Array.isArray(value)) {
    return value;
  }

  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((role) => role.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function normalizePolicyRows(rows: RawPolicyRow[]): PolicyRow[] {
  return rows.map((row) => ({
    ...row,
    roles: normalizePgArray(row.roles),
  }));
}

async function readMigrationSql() {
  const migrationPath = join(
    process.cwd(),
    "../../supabase/migrations/202604280003_rls_policy_hardening.sql",
  );

  return normalizeWhitespace(await readFile(migrationPath, "utf8"));
}

async function readGhlMigrationSql() {
  const migrationPath = join(
    process.cwd(),
    "../../supabase/migrations/202606180001_ghl_call_ingestion.sql",
  );

  return normalizeWhitespace(await readFile(migrationPath, "utf8"));
}

async function readRoleplaySessionReferenceMigrationSql() {
  const migrationPath = join(
    process.cwd(),
    "../../supabase/migrations/202606230001_roleplay_session_reference_rls.sql",
  );

  return normalizeWhitespace(await readFile(migrationPath, "utf8"));
}

async function readCallsTeamScopeMigrationSql() {
  const migrationPath = join(
    process.cwd(),
    "../../supabase/migrations/202606230002_calls_team_scope_rls.sql",
  );

  return normalizeWhitespace(await readFile(migrationPath, "utf8"));
}

async function readIntegrationTokenSelectMigrationSql() {
  const migrationPath = join(
    process.cwd(),
    "../../supabase/migrations/202606230003_integration_token_select_rls.sql",
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

    for (const table of coreServiceOnlyTables) {
      expect(migrationSql).toContain(`alter table public.${table} enable row level security`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from public`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from anon`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from authenticated`);
      expect(migrationSql).not.toMatch(
        new RegExp(`create policy "[^"]+" on public\\.${table} .* to (${broadClientRoles.join("|")})`),
      );
    }
  });

  it("keeps GHL service-only import tables behind RLS without broad client policies", async () => {
    const migrationSql = await readGhlMigrationSql();

    for (const table of ghlServiceOnlyTables) {
      expect(migrationSql).toContain(`alter table public.${table} enable row level security`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from public`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from anon`);
      expect(migrationSql).toContain(`revoke all on table public.${table} from authenticated`);
      expect(migrationSql).not.toMatch(
        new RegExp(`create policy "[^"]+" on public\\.${table} .* to (${broadClientRoles.join("|")})`),
      );
    }
  });

  it("binds roleplay session source call and rubric references to the caller organization", async () => {
    const migrationSql = await readRoleplaySessionReferenceMigrationSql();

    expect(migrationSql).toContain('drop policy if exists "roleplay_sessions_can_write_team_scope"');
    expect(migrationSql).toContain('create policy "roleplay_sessions_can_write_team_scope"');
    expect(migrationSql).toContain("on public.roleplay_sessions");
    expect(migrationSql).toContain("for insert to authenticated");
    expect(migrationSql).toContain("org_id = public.current_user_org_id()");
    expect(migrationSql).toContain("rep_id = auth.uid()");
    expect(migrationSql).toContain("source_call_id is null or exists");
    expect(migrationSql).toContain("from public.calls");
    expect(migrationSql).toContain("calls.id = roleplay_sessions.source_call_id");
    expect(migrationSql).toContain("calls.org_id = public.current_user_org_id()");
    expect(migrationSql).toContain("rubric_id is null or exists");
    expect(migrationSql).toContain("from public.rubrics");
    expect(migrationSql).toContain("rubrics.id = roleplay_sessions.rubric_id");
    expect(migrationSql).toContain("rubrics.org_id = public.current_user_org_id()");
  });

  it("replaces org-wide call reads with team-scoped call reads", async () => {
    const migrationSql = await readCallsTeamScopeMigrationSql();

    expect(migrationSql).toContain('drop policy if exists "org_members_can_read_calls"');
    expect(migrationSql).toContain('drop policy if exists "calls_can_read_team_scope"');
    expect(migrationSql).toContain('create policy "calls_can_read_team_scope"');
    expect(migrationSql).toContain("on public.calls");
    expect(migrationSql).toContain("for select to authenticated");
    expect(migrationSql).toContain("org_id = public.current_user_org_id()");
    expect(migrationSql).toContain(
      "public.current_user_can_read_rep_with_permissions( rep_id, ARRAY['view_team_calls']::text[] )",
    );
    expect(migrationSql).not.toContain("using (org_id = public.current_user_org_id())");
  });

  it("requires admin role for direct integration token table reads", async () => {
    const migrationSql = await readIntegrationTokenSelectMigrationSql();

    for (const table of ["zoom_integrations", "ghl_integrations"]) {
      expect(migrationSql).toContain(`drop policy if exists "org_members_can_read_${table}"`);
      expect(migrationSql).toContain(`drop policy if exists "${table}_can_read_admin_scope"`);
      expect(migrationSql).toContain(`create policy "${table}_can_read_admin_scope"`);
      expect(migrationSql).toContain(`on public.${table}`);
    }

    expect(migrationSql).toContain("for select to authenticated");
    expect(migrationSql).toContain("org_id = public.current_user_org_id()");
    expect(migrationSql).toContain("and public.current_user_role() = 'admin'");
    expect(migrationSql).toContain("add column if not exists connected_user_id uuid");
    expect(migrationSql).toContain("drop constraint if exists zoom_integrations_org_id_unique");
    expect(migrationSql).toContain("zoom_integrations_org_connected_user_unique");
    expect(migrationSql).not.toContain("using ( org_id = public.current_user_org_id() );");
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
          'call_processing_jobs',
          'ghl_user_mappings',
          'ghl_call_imports'
        )
      order by tablename, policyname;
    `);
    const policies = normalizePolicyRows(policyResult.rows as RawPolicyRow[]);

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
        and table_name in ('invites', 'call_processing_jobs', 'ghl_user_mappings', 'ghl_call_imports')
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
          'call_processing_jobs',
          'ghl_user_mappings',
          'ghl_call_imports'
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
