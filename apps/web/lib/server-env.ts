import { getWebEnv } from "./env";

type ServerEnvSource = Partial<Record<string, string | undefined>>;

export function getServerEnv(env: ServerEnvSource = process.env) {
  const { supabaseUrl, supabaseAnonKey, siteUrl } = getWebEnv(env);
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    siteUrl,
    supabaseServiceRoleKey,
    databaseUrl: env.DATABASE_URL,
  };
}
