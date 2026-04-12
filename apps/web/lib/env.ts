type WebEnvSource = Partial<Record<string, string | undefined>>;
const requiredWebEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;
type RequiredWebEnvKey = (typeof requiredWebEnvKeys)[number];

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

export function getMissingWebEnvKeys(
  env: WebEnvSource = process.env,
): RequiredWebEnvKey[] {
  return requiredWebEnvKeys.filter((key) => !env[key]);
}

export function getWebEnvConfigurationError(
  env: WebEnvSource = process.env,
): string | null {
  const missingKeys = getMissingWebEnvKeys(env);

  if (missingKeys.length === 0) {
    return null;
  }

  return `Auth is not configured for this environment. Missing: ${missingKeys.join(", ")}.`;
}

export function getDevelopmentStartupEnvError(options: {
  env?: WebEnvSource;
  nodeEnv?: string;
} = {}): string | null {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;

  if (nodeEnv !== "development") {
    return null;
  }

  return getWebEnvConfigurationError(options.env ?? process.env);
}

function getBrowserRuntimeEnvSource(): WebEnvSource {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };
}

export function getBrowserWebEnv(): WebEnv {
  return getWebEnv(getBrowserRuntimeEnvSource());
}

export function getBrowserWebEnvConfigurationError(): string | null {
  return getWebEnvConfigurationError(getBrowserRuntimeEnvSource());
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
