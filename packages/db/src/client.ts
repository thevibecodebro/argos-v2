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

export function createDb(connectionString = getDatabaseUrl()): ArgosDb {
  const pool = new Pool({
    connectionString,
    max: 5,
    ssl: { rejectUnauthorized: false },
  });

  return drizzle({
    client: pool,
    schema,
  });
}

export function getDb(): ArgosDb {
  if (!globalForDatabase.argosDb) {
    globalForDatabase.argosPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 5,
      ssl: { rejectUnauthorized: false },
    });

    globalForDatabase.argosDb = drizzle({
      client: globalForDatabase.argosPool,
      schema,
    });
  }

  return globalForDatabase.argosDb;
}
