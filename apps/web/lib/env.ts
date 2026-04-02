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

function normalizeUrl(url: string): string {
  const withProtocol = url.startsWith("http") ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

function getResolvedSiteUrl(env: WebEnvSource): string {
  const rawSiteUrl =
    env.NEXT_PUBLIC_SITE_URL ??
    env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    env.NEXT_PUBLIC_VERCEL_URL ??
    env.VERCEL_PROJECT_PRODUCTION_URL ??
    env.VERCEL_URL;

  if (!rawSiteUrl) {
    return "http://localhost:3000";
  }

  return normalizeUrl(rawSiteUrl);
}

export function getWebEnv(env: WebEnvSource = process.env): WebEnv {
  return {
    supabaseUrl: getRequiredEnvValue(env, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getRequiredEnvValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    siteUrl: getResolvedSiteUrl(env),
  };
}

export function buildAuthRedirectUrl(
  nextPath: string,
  options: {
    env?: WebEnvSource;
    runtimeOrigin?: string;
  } = {},
): string {
  const baseUrl = options.runtimeOrigin
    ? normalizeUrl(options.runtimeOrigin)
    : getResolvedSiteUrl(options.env ?? process.env);

  return `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
