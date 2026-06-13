import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  platformAccessSessionsTable,
  platformAuditEventsTable,
  platformStaffTable,
} from "@argos-v2/db";

const migrationPath = join(
  __dirname,
  "../../../../supabase/migrations/202606110001_platform_admin.sql",
);
const schemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/platform.ts",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8");
}

function readSchema() {
  return readFileSync(schemaPath, "utf8");
}

function extractTableDefinition(sql: string, tableName: string) {
  const match = sql.match(new RegExp(`create table if not exists public\\.${tableName} \\([\\s\\S]*?\\n\\);`, "i"));

  return match?.[0] ?? "";
}

describe("platform admin schema exports", () => {
  it("exports platform admin persistence tables", () => {
    expect(platformStaffTable).toBeTruthy();
    expect(platformAccessSessionsTable).toBeTruthy();
    expect(platformAuditEventsTable).toBeTruthy();
  });

  it("binds sessions to platform staff without history-erasing cascades", () => {
    const schema = readSchema();

    expect(schema).toMatch(/staffUserId:[\s\S]*references\(\(\) => platformStaffTable\.userId, \{ onDelete: "set null" \}\)/);
    expect(schema).toMatch(/targetOrgId:[\s\S]*references\(\(\) => organizationsTable\.id, \{ onDelete: "set null" \}\)/);
    expect(schema).toMatch(/staffEmailSnapshot: text\("staff_email_snapshot"\)/);
    expect(schema).toMatch(/staffRoleSnapshot: text\("staff_role_snapshot"/);
    expect(schema).toMatch(/targetOrgNameSnapshot: text\("target_org_name_snapshot"\)/);
    expect(schema).toMatch(/targetOrgSlugSnapshot: text\("target_org_slug_snapshot"\)/);
  });
});

describe("platform admin migration", () => {
  it("creates all platform admin tables idempotently", () => {
    const migration = readMigration();

    expect(migration).toMatch(/create table if not exists public\.platform_staff/i);
    expect(migration).toMatch(/create table if not exists public\.platform_access_sessions/i);
    expect(migration).toMatch(/create table if not exists public\.platform_audit_events/i);
    expect(migration).toMatch(/default gen_random_uuid\(\)/i);
  });

  it("keeps privileged session history when staff users or organizations are detached", () => {
    const migration = readMigration();
    const sessionsTable = extractTableDefinition(migration, "platform_access_sessions");

    expect(sessionsTable).toMatch(/staff_user_id uuid references public\.platform_staff\(user_id\) on delete set null/i);
    expect(sessionsTable).toMatch(/target_org_id uuid references public\.organizations\(id\) on delete set null/i);
    expect(sessionsTable).not.toMatch(/on delete cascade/i);
  });

  it("stores staff and organization snapshots on sessions and audit events", () => {
    const migration = readMigration();
    const sessionsTable = extractTableDefinition(migration, "platform_access_sessions");
    const auditEventsTable = extractTableDefinition(migration, "platform_audit_events");

    for (const tableDefinition of [sessionsTable, auditEventsTable]) {
      expect(tableDefinition).toMatch(/staff_email_snapshot text/i);
      expect(tableDefinition).toMatch(/staff_role_snapshot text/i);
      expect(tableDefinition).toMatch(/target_org_name_snapshot text/i);
      expect(tableDefinition).toMatch(/target_org_slug_snapshot text/i);
    }
    expect(auditEventsTable).toMatch(/staff_user_id uuid references public\.platform_staff\(user_id\) on delete set null/i);
  });

  it("adds enum check constraints with safe idempotent blocks", () => {
    const migration = readMigration();

    expect(migration).toMatch(/do \$\$/i);
    expect(migration).toMatch(/platform_staff_role_check/i);
    expect(migration).toMatch(/platform_staff_status_check/i);
    expect(migration).toMatch(/platform_access_sessions_status_check/i);
    expect(migration).not.toMatch(/add constraint if not exists/i);
  });

  it("adds platform admin indexes for staff, active sessions, and audit lookups", () => {
    const migration = readMigration();

    expect(migration).toMatch(/platform_staff_status_role_idx/i);
    expect(migration).toMatch(/platform_staff_created_by_idx/i);
    expect(migration).toMatch(/platform_staff_revoked_by_idx/i);
    expect(migration).toMatch(/platform_access_sessions_staff_status_expires_idx/i);
    expect(migration).toMatch(/platform_access_sessions_target_org_idx/i);
    expect(migration).toMatch(/platform_access_sessions_active_lookup_idx/i);
    expect(migration).toMatch(/platform_audit_events_target_org_created_at_idx/i);
    expect(migration).toMatch(/platform_audit_events_staff_created_at_idx/i);
    expect(migration).toMatch(/platform_audit_events_session_id_idx/i);
    expect(migration).toMatch(/platform_audit_events_resource_idx/i);
  });

  it("enables RLS and grants no direct public, anon, or authenticated access", () => {
    const migration = readMigration();

    for (const table of [
      "platform_staff",
      "platform_access_sessions",
      "platform_audit_events",
    ]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table} from public`, "i"));
      expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table} from anon`, "i"));
      expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table} from authenticated`, "i"));
    }
    expect(migration).not.toMatch(/create policy/i);
  });
});
