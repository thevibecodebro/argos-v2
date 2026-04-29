#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import {
  parseTokenEncryptionKey,
  planTokenRotationForRow,
} from "./rotation-core.mjs";

const apply = process.argv.includes("--apply");

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const key = resolveTokenEncryptionKey();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const tables = [
  {
    name: "zoom_integrations",
    tokenColumns: ["access_token", "refresh_token", "webhook_token"],
  },
  {
    name: "ghl_integrations",
    tokenColumns: ["access_token", "refresh_token"],
  },
];

let scannedRows = 0;
let rowsNeedingRotation = 0;
let updatedRows = 0;
let corruptTokenValues = 0;

for (const table of tables) {
  const columns = ["id", "org_id", ...table.tokenColumns].join(",");
  const { data, error } = await supabase.from(table.name).select(columns);

  if (error) {
    console.error(`Failed to read ${table.name}: ${error.message}`);
    process.exit(1);
  }

  for (const row of data ?? []) {
    scannedRows += 1;
    const { corruptColumns, updates } = planTokenRotationForRow(row, table.tokenColumns, key);

    if (Object.keys(updates).length === 0) {
      for (const column of corruptColumns) {
        corruptTokenValues += 1;
        console.error(`Corrupt encrypted token in ${table.name} row id=${row.id} org_id=${row.org_id} column=${column}`);
      }
      continue;
    }

    if (corruptColumns.length > 0) {
      for (const column of corruptColumns) {
        corruptTokenValues += 1;
        console.error(`Corrupt encrypted token in ${table.name} row id=${row.id} org_id=${row.org_id} column=${column}`);
      }
      console.error(`Skipping rotation updates for ${table.name} row id=${row.id} because it has corrupt encrypted token data.`);
      continue;
    }

    rowsNeedingRotation += 1;
    console.log(`${apply ? "Rotating" : "Would rotate"} ${table.name} row id=${row.id} org_id=${row.org_id}`);

    if (!apply) {
      continue;
    }

    updates.updated_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from(table.name)
      .update(updates)
      .eq("id", row.id);

    if (updateError) {
      console.error(`Failed to update ${table.name} row id=${row.id}: ${updateError.message}`);
      process.exit(1);
    }

    updatedRows += 1;
  }
}

console.log(
  JSON.stringify({
    apply,
    scannedRows,
    rowsNeedingRotation,
    corruptTokenValues,
    updatedRows,
  }),
);

if (corruptTokenValues > 0) {
  console.error("Corrupt encrypted token values require manual repair before rotation can be considered complete.");
  process.exitCode = 1;
}

if (!apply) {
  console.log("Dry run only. Re-run with --apply to update plaintext rows.");
}

function resolveTokenEncryptionKey() {
  const rawKey = process.env.ARGOS_TOKEN_ENCRYPTION_KEY?.trim();

  try {
    return parseTokenEncryptionKey(rawKey);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid ARGOS_TOKEN_ENCRYPTION_KEY.");
    process.exit(1);
  }
}
