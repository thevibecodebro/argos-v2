type WorkerEnvSource = Partial<Record<string, string | undefined>>;

export type WorkerEnv = {
  callProcessingEnabled: boolean;
  databaseUrl: string | null;
  ffmpegBinary: string | null;
  host: string;
  maxSourceBytes: number;
  port: number;
  nodeEnv: string;
  pollIntervalMs: number;
  supabaseServiceRoleKey: string | null;
  supabaseUrl: string | null;
  transcribeConcurrency: number;
};

function parsePort(value: string | undefined): number {
  if (!value) {
    return 8787;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid PORT environment variable: ${value}`);
  }

  const port = Number.parseInt(value, 10);

  if (port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: ${value}`);
  }

  return port;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

function parseInteger(
  value: string | undefined,
  defaultValue: number,
  label: string,
): number {
  if (!value) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label} environment variable: ${value}`);
  }

  const parsed = Number.parseInt(value, 10);

  if (parsed < 1) {
    throw new Error(`Invalid ${label} environment variable: ${value}`);
  }

  return parsed;
}

function readEnv(
  env: WorkerEnvSource,
  key: "DATABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_URL",
) {
  return env[key]?.trim() || null;
}

export function getWorkerEnv(env: WorkerEnvSource = process.env): WorkerEnv {
  const callProcessingEnabled = parseBoolean(env.CALL_PROCESSING_ENABLED, false);
  const databaseUrl = readEnv(env, "DATABASE_URL");
  const supabaseServiceRoleKey = readEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = readEnv(env, "SUPABASE_URL");

  if (callProcessingEnabled) {
    if (!databaseUrl) {
      throw new Error("Missing required environment variable: DATABASE_URL");
    }

    if (!supabaseServiceRoleKey) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!supabaseUrl) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }
  }

  return {
    callProcessingEnabled,
    databaseUrl,
    ffmpegBinary: env.FFMPEG_BINARY?.trim() || null,
    host: env.HOST || "0.0.0.0",
    maxSourceBytes: parseInteger(env.MAX_SOURCE_BYTES, 500 * 1024 * 1024, "MAX_SOURCE_BYTES"),
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV || "development",
    pollIntervalMs: parseInteger(env.POLL_INTERVAL_MS, 5_000, "POLL_INTERVAL_MS"),
    supabaseServiceRoleKey,
    supabaseUrl,
    transcribeConcurrency: parseInteger(env.TRANSCRIBE_CONCURRENCY, 3, "TRANSCRIBE_CONCURRENCY"),
  };
}
