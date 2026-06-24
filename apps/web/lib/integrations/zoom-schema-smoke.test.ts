import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/zoomIntegrations.ts",
);
const migrationPath = join(
  __dirname,
  "../../../../supabase/migrations/202606240003_zoom_account_id_unique.sql",
);

function readSchema() {
  return readFileSync(schemaPath, "utf8");
}

function readMigration() {
  return readFileSync(migrationPath, "utf8");
}

describe("Zoom integration tenant boundary schema", () => {
  it("requires unique Zoom account IDs in the Drizzle schema", () => {
    const schema = readSchema();

    expect(schema).toMatch(/unique\("zoom_integrations_account_id_unique"\)\.on\(table\.zoomAccountId\)/);
  });

  it("migrates existing databases to unique Zoom account IDs", () => {
    const migration = readMigration();

    expect(migration).toMatch(/zoom_integrations_account_id_unique/i);
    expect(migration).toMatch(/public\.zoom_integrations/i);
    expect(migration).toMatch(/zoom_account_id/i);
    expect(migration).toMatch(/unique/i);
  });
});
