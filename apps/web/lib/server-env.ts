import { assertPrivilegedRuntimeIdentity } from "@argos-v2/runtime-identity";
import { getWebEnv } from "./env";

type ServerEnvSource = Partial<Record<string, string | undefined>>;

export function getServerEnv(env: ServerEnvSource = process.env) {
  const { supabaseUrl, supabaseAnonKey, siteUrl } = getWebEnv(env);
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  assertPrivilegedRuntimeIdentity({
    databaseUrl: env.DATABASE_URL,
    env,
    requireDatabase: Boolean(env.DATABASE_URL?.trim()),
    requireSupabase: true,
    supabaseUrl,
  });

  return {
    supabaseUrl,
    supabaseAnonKey,
    siteUrl,
    supabaseServiceRoleKey,
    databaseUrl: env.DATABASE_URL,
  };
}
