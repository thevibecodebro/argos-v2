import { sql } from "drizzle-orm";
import { createDb } from "@argos-v2/db";

type EnvSource = Partial<Record<string, string | undefined>>;

type DiscoverWorkerTestDatabaseUrlInput = {
  env?: EnvSource;
  probeConnection?: (databaseUrl: string) => Promise<boolean>;
};

const LOCAL_SUPABASE_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function readEnv(env: EnvSource, key: "DATABASE_URL" | "WORKER_TEST_DATABASE_URL") {
  return env[key]?.trim() || null;
}

function isLocalDatabaseUrl(databaseUrl: string) {
  try {
    const { hostname } = new URL(databaseUrl);
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

async function defaultProbeConnection(databaseUrl: string) {
  try {
    const db = createDb(databaseUrl);
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function discoverWorkerTestDatabaseUrl(
  input: DiscoverWorkerTestDatabaseUrlInput = {},
) {
  const env = input.env ?? process.env;
  const probeConnection = input.probeConnection ?? defaultProbeConnection;
  const explicitWorkerTestDatabaseUrl = readEnv(env, "WORKER_TEST_DATABASE_URL");

  if (explicitWorkerTestDatabaseUrl) {
    return explicitWorkerTestDatabaseUrl;
  }

  const explicitDatabaseUrl = readEnv(env, "DATABASE_URL");

  if (explicitDatabaseUrl && isLocalDatabaseUrl(explicitDatabaseUrl)) {
    return explicitDatabaseUrl;
  }

  if (await probeConnection(LOCAL_SUPABASE_DATABASE_URL)) {
    return LOCAL_SUPABASE_DATABASE_URL;
  }

  return null;
}
