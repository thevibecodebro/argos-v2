type WorkerEnvSource = Partial<Record<string, string | undefined>>;

export type WorkerEnv = {
  callProcessingEnabled: boolean;
  databaseUrl: string | null;
  ffmpegBinary: string | null;
  host: string;
  maxSourceBytes: number;
  openaiApiKey: string | null;
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

function readEnv(env: WorkerEnvSource, ...keys: string[]) {
  for (const key of keys) {
    const value = env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function getWorkerEnv(env: WorkerEnvSource = process.env): WorkerEnv {
  const callProcessingEnabled = parseBoolean(env.CALL_PROCESSING_ENABLED, false);
  const databaseUrl = readEnv(env, "DATABASE_URL");
  const ffmpegBinary = readEnv(env, "FFMPEG_BINARY", "CALL_PROCESSING_FFMPEG_BINARY");
  const openaiApiKey = readEnv(env, "OPENAI_API_KEY");
  const supabaseServiceRoleKey = readEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = readEnv(env, "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const maxSourceBytes = parseInteger(
    env.CALL_PROCESSING_MAX_SOURCE_BYTES ?? env.MAX_SOURCE_BYTES,
    500 * 1024 * 1024,
    "CALL_PROCESSING_MAX_SOURCE_BYTES",
  );
  const pollIntervalMs = parseInteger(
    env.CALL_PROCESSING_POLL_INTERVAL_MS ?? env.POLL_INTERVAL_MS,
    5_000,
    "CALL_PROCESSING_POLL_INTERVAL_MS",
  );
  const transcribeConcurrency = parseInteger(
    env.CALL_PROCESSING_TRANSCRIBE_CONCURRENCY ?? env.TRANSCRIBE_CONCURRENCY,
    3,
    "CALL_PROCESSING_TRANSCRIBE_CONCURRENCY",
  );

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

    if (!openaiApiKey) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY");
    }
  }

  return {
    callProcessingEnabled,
    databaseUrl,
    ffmpegBinary,
    host: env.HOST || "0.0.0.0",
    maxSourceBytes,
    openaiApiKey,
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV || "development",
    pollIntervalMs,
    supabaseServiceRoleKey,
    supabaseUrl,
    transcribeConcurrency,
  };
}
