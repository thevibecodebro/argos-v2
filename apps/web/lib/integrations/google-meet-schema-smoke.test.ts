import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const integrationsSchemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/googleMeetIntegrations.ts",
);
const importsSchemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/googleMeetImports.ts",
);
const schemaIndexPath = join(__dirname, "../../../../packages/db/src/schema/index.ts");
const callJobsSchemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/callProcessingJobs.ts",
);
const migrationPath = join(
  __dirname,
  "../../../../supabase/migrations/202607100002_google_meet_ingestion.sql",
);
const lifecycleMigrationPath = join(
  __dirname,
  "../../../../supabase/migrations/202607150001_google_meet_data_lifecycle.sql",
);

describe("Google Meet ingestion schema", () => {
  it("defines and exports the integration and import Drizzle schemas", () => {
    const integrations = readFileSync(integrationsSchemaPath, "utf8");
    const imports = readFileSync(importsSchemaPath, "utf8");
    const schemaIndex = readFileSync(schemaIndexPath, "utf8");

    expect(schemaIndex).toContain('export * from "./googleMeetIntegrations";');
    expect(schemaIndex).toContain('export * from "./googleMeetImports";');
    expect(integrations).toMatch(/pgTable\(\s*"google_meet_integrations"/);
    expect(integrations).toMatch(/orgId:[\s\S]*\.unique\(\)[\s\S]*onDelete: "cascade"/);
    expect(integrations).toMatch(/connectedUserId:[\s\S]*onDelete: "set null"/);
    expect(integrations).toMatch(/unique\("google_meet_integrations_google_user_unique"\)\.on\(table\.googleUserId\)/);
    expect(integrations).toMatch(/syncEnabled:[\s\S]*\.notNull\(\)\.default\(false\)/);
    expect(integrations).toMatch(/consentConfirmedBy:[\s\S]*onDelete: "set null"/);
    expect(integrations).toMatch(/defaultRepId:[\s\S]*onDelete: "set null"/);

    expect(imports).toMatch(/pgTable\(\s*"google_meet_imports"/);
    expect(imports).toContain('"title_filter_unconfigured"');
    expect(imports).toContain('"title_no_include_match"');
    expect(imports).toMatch(/titleSource: text\("title_source", \{ enum: GOOGLE_MEET_TITLE_SOURCES \}\)/);
    expect(imports).toMatch(/unique\("google_meet_imports_recording_unique"\)\.on\(table\.orgId, table\.recordingName\)/);
    expect(imports).toMatch(/index\("google_meet_imports_status_next_run_idx"\)\.on\(table\.status, table\.nextRunAt\)/);
    expect(imports).toMatch(/index\("google_meet_imports_lock_expires_idx"\)\.on\(table\.lockExpiresAt\)/);
    expect(imports).toMatch(/index\("google_meet_imports_call_id_idx"\)\.on\(table\.callId\)/);
  });

  it("creates constrained private tables and updates the job origin check", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const callJobsSchema = readFileSync(callJobsSchemaPath, "utf8");

    expect(callJobsSchema).toContain('"google_meet_recording"');
    expect(migration).toMatch(/call_processing_jobs_source_origin_check[\s\S]*'google_meet_recording'/i);
    expect(migration).toMatch(/create table if not exists public\.google_meet_integrations/i);
    expect(migration).toMatch(/connected_user_id uuid references public\.users\(id\) on delete set null/i);
    expect(migration).toMatch(/google_user_id text[\s\S]*unique \(google_user_id\)/i);
    expect(migration).toMatch(/create table if not exists public\.google_meet_imports/i);
    expect(migration).toMatch(/unique \(org_id, recording_name\)/i);
    expect(migration).toMatch(/title_source text check \(title_source in \('calendar', 'drive'\)\)/i);
    expect(migration).toMatch(/status text not null default 'pending' check \(status in \('pending', 'running', 'retrying', 'imported', 'skipped', 'failed'\)\)/i);

    for (const table of ["google_meet_integrations", "google_meet_imports"]) {
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
      for (const role of ["public", "anon", "authenticated"]) {
        expect(migration).toMatch(
          new RegExp(`revoke all on table public\\.${table} from ${role}`, "i"),
        );
      }
    }
    expect(migration).not.toMatch(/create policy/i);
  });

  it("keeps the required skip-reason constraint synchronized", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const imports = readFileSync(importsSchemaPath, "utf8");
    const reasons = [
      "no_connected_integration",
      "sync_disabled",
      "consent_missing",
      "billing_inactive",
      "no_owner",
      "title_filter_unconfigured",
      "title_missing",
      "title_excluded",
      "title_no_include_match",
      "recording_not_ready",
      "unauthorized_after_refresh",
    ];

    for (const reason of reasons) {
      expect(imports).toContain(`"${reason}"`);
      expect(migration).toContain(`'${reason}'`);
    }
  });

  it("keeps deletion tombstones while redacting provider metadata", () => {
    const imports = readFileSync(importsSchemaPath, "utf8");
    const migration = readFileSync(lifecycleMigrationPath, "utf8");

    expect(imports).toContain('"deleted"');
    expect(imports).toMatch(
      /integrationId:[\s\S]*references\(\(\) => googleMeetIntegrationsTable\.id, \{ onDelete: "set null" \}\)/,
    );
    expect(migration).toMatch(
      /foreign key \(integration_id\)[\s\S]*on delete set null/i,
    );
    expect(migration).toMatch(/status in \([\s\S]*'deleted'[\s\S]*\)/i);
  });
});
