import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type ArgosDb = NodePgDatabase<typeof schema>;

const globalForDatabase = globalThis as typeof globalThis & {
  argosDb?: ArgosDb;
  argosPool?: Pool;
};

function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return databaseUrl;
}

export function resolvePgSsl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");

    if (sslMode === "disable") {
      return false;
    }

    if (sslMode) {
      return { rejectUnauthorized: true };
    }

    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return false;
    }
  } catch {
    // Fall through to the hosted-database default.
  }

  return { rejectUnauthorized: true };
}

export function createDb(connectionString = getDatabaseUrl()): ArgosDb {
  const pool = new Pool({
    connectionString,
    max: 5,
    ssl: resolvePgSsl(connectionString),
  });

  return drizzle({
    client: pool,
    schema,
  });
}

export function getDb(): ArgosDb {
  if (!globalForDatabase.argosDb) {
    const databaseUrl = getDatabaseUrl();

    globalForDatabase.argosPool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      ssl: resolvePgSsl(databaseUrl),
    });

    globalForDatabase.argosDb = drizzle({
      client: globalForDatabase.argosPool,
      schema,
    });
  }

  return globalForDatabase.argosDb;
}
