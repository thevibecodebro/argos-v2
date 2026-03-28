type WebEnvSource = Partial<Record<string, string | undefined>>;

export type WebEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
};

function getRequiredEnvValue(env: WebEnvSource, key: string): string {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getWebEnv(env: WebEnvSource = process.env): WebEnv {
  return {
    supabaseUrl: getRequiredEnvValue(env, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getRequiredEnvValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    siteUrl: getRequiredEnvValue(env, "NEXT_PUBLIC_SITE_URL"),
  };
}
