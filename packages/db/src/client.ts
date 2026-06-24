import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { assertPrivilegedRuntimeIdentity } from "@argos-v2/runtime-identity";
import * as schema from "./schema";

export type ArgosDb = NodePgDatabase<typeof schema>;

const globalForDatabase = globalThis as typeof globalThis & {
  argosDb?: ArgosDb;
  argosPool?: Pool;
};

const SUPABASE_ROOT_2021_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  assertPrivilegedRuntimeIdentity({
    databaseUrl,
    env,
    requireDatabase: true,
  });

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

    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return false;
    }

    if (isSupabasePostgresHost(hostname)) {
      return {
        ca: SUPABASE_ROOT_2021_CA,
        rejectUnauthorized: true,
      };
    }

    if (sslMode) {
      return { rejectUnauthorized: true };
    }
  } catch {
    // Fall through to the hosted-database default.
  }

  return { rejectUnauthorized: true };
}

function isSupabasePostgresHost(hostname: string) {
  return hostname.endsWith(".supabase.co") || hostname.endsWith(".supabase.com");
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
