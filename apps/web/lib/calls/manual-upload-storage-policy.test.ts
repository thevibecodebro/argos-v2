import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  __dirname,
  "../../../../supabase/migrations/20260908015148_allow_scoped_manual_recording_uploads.sql",
);

describe("manual recording upload storage policy", () => {
  it("binds direct storage inserts to exact prepared targets and current capability access", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /create table if not exists public\.manual_recording_upload_targets/i,
    );
    expect(migration).toMatch(
      /alter table public\.manual_recording_upload_targets enable row level security/i,
    );
    expect(migration).toMatch(
      /revoke all on table public\.manual_recording_upload_targets\s+from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /upload_target\.storage_path = storage_object_name/i,
    );
    expect(migration).toMatch(/upload_target\.auth_user_id = auth\.uid\(\)/i);
    expect(migration).toMatch(/upload_target\.expires_at > now\(\)/i);
    expect(migration).toMatch(/capability\.capability_key = 'call_upload'/i);
    expect(migration).toMatch(
      /private\.current_user_can_upload_calls\(name\)/i,
    );
  });
});
