export type RuntimeIdentityEnv = Partial<Record<string, string | undefined>>;

export type PrivilegedRuntimeIdentityOptions = {
  databaseUrl?: string | null;
  env: RuntimeIdentityEnv;
  openaiApiKey?: string | null;
  requireDatabase?: boolean;
  requireOpenAi?: boolean;
  requireSupabase?: boolean;
  supabaseUrl?: string | null;
};

const PRODUCTION_ENVIRONMENT = "production";
const DEFAULT_PRODUCTION_FLY_APP_NAME = "argos-v2-worker-jared";

function readEnvValue(env: RuntimeIdentityEnv, key: string) {
  const value = env[key]?.trim();

  return value || null;
}

function normalizeEnvValue(value: string | null) {
  return value?.toLowerCase() ?? null;
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function isProductionFlyApp(env: RuntimeIdentityEnv) {
  const flyAppName = readEnvValue(env, "FLY_APP_NAME");
  const expectedFlyAppName =
    readEnvValue(env, "ARGOS_PRODUCTION_FLY_APP_NAME") ?? DEFAULT_PRODUCTION_FLY_APP_NAME;

  return Boolean(flyAppName && flyAppName === expectedFlyAppName);
}

function isProductionRuntime(env: RuntimeIdentityEnv) {
  const appEnv = normalizeEnvValue(readEnvValue(env, "APP_ENV"));
  const vercelEnv = normalizeEnvValue(readEnvValue(env, "VERCEL_ENV"));
  const nextPublicVercelEnv = normalizeEnvValue(readEnvValue(env, "NEXT_PUBLIC_VERCEL_ENV"));

  return (
    appEnv === PRODUCTION_ENVIRONMENT ||
    vercelEnv === PRODUCTION_ENVIRONMENT ||
    nextPublicVercelEnv === PRODUCTION_ENVIRONMENT ||
    isProductionFlyApp(env)
  );
}

function assertProductionLabel(env: RuntimeIdentityEnv, key: string) {
  const value = normalizeEnvValue(readEnvValue(env, key));

  if (value !== PRODUCTION_ENVIRONMENT) {
    throw new Error(
      `Production environment identity guard failed: expected ${key}=production.`,
    );
  }
}

function assertDeploymentLabelConsistency(env: RuntimeIdentityEnv) {
  const appEnv = normalizeEnvValue(readEnvValue(env, "APP_ENV"));
  const vercelEnv = normalizeEnvValue(readEnvValue(env, "VERCEL_ENV"));
  const nextPublicVercelEnv = normalizeEnvValue(readEnvValue(env, "NEXT_PUBLIC_VERCEL_ENV"));

  if (appEnv === PRODUCTION_ENVIRONMENT && vercelEnv && vercelEnv !== PRODUCTION_ENVIRONMENT) {
    throw new Error(
      `Production environment identity guard failed: APP_ENV=production conflicts with VERCEL_ENV=${vercelEnv}.`,
    );
  }

  if (
    appEnv === PRODUCTION_ENVIRONMENT &&
    nextPublicVercelEnv &&
    nextPublicVercelEnv !== PRODUCTION_ENVIRONMENT
  ) {
    throw new Error(
      `Production environment identity guard failed: APP_ENV=production conflicts with NEXT_PUBLIC_VERCEL_ENV=${nextPublicVercelEnv}.`,
    );
  }
}

export function assertPrivilegedRuntimeIdentity({
  databaseUrl,
  env,
  openaiApiKey,
  requireDatabase = false,
  requireOpenAi = false,
  requireSupabase = false,
  supabaseUrl,
}: PrivilegedRuntimeIdentityOptions) {
  if (!isProductionRuntime(env)) {
    return;
  }

  assertDeploymentLabelConsistency(env);
  assertProductionLabel(env, "APP_ENV");

  if (requireSupabase || hasValue(supabaseUrl)) {
    assertProductionLabel(env, "SUPABASE_ENVIRONMENT");
  }

  if (requireDatabase || hasValue(databaseUrl)) {
    assertProductionLabel(env, "DATABASE_ENVIRONMENT");
  }

  if (requireOpenAi || hasValue(openaiApiKey)) {
    assertProductionLabel(env, "OPENAI_ENVIRONMENT");
  }
}
