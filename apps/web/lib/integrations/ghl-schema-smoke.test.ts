import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = join(
  __dirname,
  "../../../../packages/db/src/schema/ghlIntegrations.ts",
);
const migrationPath = join(
  __dirname,
  "../../../../supabase/migrations/202606240002_ghl_location_id_unique.sql",
);

function readSchema() {
  return readFileSync(schemaPath, "utf8");
}

function readMigration() {
  return readFileSync(migrationPath, "utf8");
}

describe("GHL integration tenant boundary schema", () => {
  it("requires unique GHL locations in the Drizzle schema", () => {
    const schema = readSchema();

    expect(schema).toMatch(/unique\("ghl_integrations_location_id_unique"\)\.on\(table\.locationId\)/);
  });

  it("migrates existing databases to unique GHL locations", () => {
    const migration = readMigration();

    expect(migration).toMatch(/ghl_integrations_location_id_unique/i);
    expect(migration).toMatch(/public\.ghl_integrations/i);
    expect(migration).toMatch(/location_id/i);
    expect(migration).toMatch(/unique/i);
  });
});
