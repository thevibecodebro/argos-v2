import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/organizationIngestionTitleFilters.ts",
);
const schemaIndexPath = join(
  __dirname,
  "../../../../packages/db/src/schema/index.ts",
);
const auditEventSchemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/auditEvents.ts",
);
const migrationPath = join(
  __dirname,
  "../../../../supabase/migrations/202607100001_organization_ingestion_title_filters.sql",
);

describe("organization ingestion title filter schema", () => {
  it("defines and exports the tenant-scoped Drizzle table", () => {
    const schema = readFileSync(schemaPath, "utf8");
    const schemaIndex = readFileSync(schemaIndexPath, "utf8");

    expect(schemaIndex).toContain('export * from "./organizationIngestionTitleFilters";');
    expect(schema).toMatch(/pgTable\(\s*"organization_ingestion_title_filters"/);
    expect(schema).toMatch(/id: uuid\("id"\)\.primaryKey\(\)\.defaultRandom\(\)/);
    expect(schema).toMatch(/orgId:[\s\S]*organizationsTable\.id, \{ onDelete: "cascade" \}/);
    expect(schema).toMatch(/kind: text\("kind", \{ enum: \["include", "exclude"\] \}\)\.notNull\(\)/);
    expect(schema).toMatch(/phrase: text\("phrase"\)\.notNull\(\)/);
    expect(schema).toMatch(/normalizedPhrase: text\("normalized_phrase"\)\.notNull\(\)/);
    expect(schema).toMatch(
      /createdBy:[\s\S]*usersTable\.id, \{\s*onDelete: "set null",?\s*\}/,
    );
    expect(schema).toMatch(/createdAt:[\s\S]*\.notNull\(\)\.defaultNow\(\)/);
    expect(schema).toMatch(/updatedAt:[\s\S]*\.notNull\(\)\.defaultNow\(\)/);
    expect(schema).toMatch(
      /unique\("organization_ingestion_title_filters_org_kind_normalized_unique"\)\.on\([\s\S]*table\.orgId,[\s\S]*table\.kind,[\s\S]*table\.normalizedPhrase/,
    );
  });

  it("creates the table with constraints and no direct client access", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const table = "organization_ingestion_title_filters";

    expect(migration).toMatch(
      /create table if not exists public\.organization_ingestion_title_filters/i,
    );
    expect(migration).toMatch(/id uuid primary key default gen_random_uuid\(\)/i);
    expect(migration).toMatch(
      /org_id uuid not null references public\.organizations\(id\) on delete cascade/i,
    );
    expect(migration).toMatch(/kind text not null check \(kind in \('include', 'exclude'\)\)/i);
    expect(migration).toMatch(/phrase text not null/i);
    expect(migration).toMatch(/normalized_phrase text not null/i);
    expect(migration).toMatch(
      /created_by uuid references public\.users\(id\) on delete set null/i,
    );
    expect(migration).toMatch(
      /unique \(org_id, kind, normalized_phrase\)/i,
    );
    expect(migration).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );

    for (const role of ["public", "anon", "authenticated"]) {
      expect(migration).toMatch(
        new RegExp(`revoke all on table public\\.${table} from ${role}`, "i"),
      );
    }

    expect(migration).not.toMatch(/create policy/i);
  });

  it("permits title filter audit events while preserving existing call audit types", () => {
    const auditEventSchema = readFileSync(auditEventSchemaPath, "utf8");
    const migration = readFileSync(migrationPath, "utf8");

    expect(auditEventSchema).toMatch(
      /eventType: text\("event_type", \{\s*enum: \[\s*"call_exported",\s*"call_deleted",\s*"ingestion_title_filters_updated",?\s*\],\s*\}\)\.notNull\(\)/,
    );
    expect(auditEventSchema).toMatch(
      /resourceType: text\("resource_type", \{\s*enum: \[\s*"call",\s*"organization",?\s*\],\s*\}\)\.notNull\(\)/,
    );
    expect(migration).toMatch(
      /alter table public\.audit_events\s+drop constraint if exists audit_events_event_type_check/i,
    );
    expect(migration).toMatch(
      /add constraint audit_events_event_type_check\s+check \(event_type in \(\s*'call_exported',\s*'call_deleted',\s*'ingestion_title_filters_updated'\s*\)\)/i,
    );
    expect(migration).toMatch(
      /alter table public\.audit_events\s+drop constraint if exists audit_events_resource_type_check/i,
    );
    expect(migration).toMatch(
      /add constraint audit_events_resource_type_check\s+check \(resource_type in \(\s*'call',\s*'organization'\s*\)\)/i,
    );
  });
});
