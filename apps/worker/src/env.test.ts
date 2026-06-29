import { describe, expect, it } from "vitest";
import { getWorkerEnv } from "./env";

const callProcessingEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/argos",
  OPENAI_API_KEY: "openai-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  SUPABASE_URL: "https://argos.example.supabase.co",
};

describe("getWorkerEnv", () => {
  it("returns defaults when optional values are missing", () => {
    expect(getWorkerEnv({})).toEqual({
      callProcessingEnabled: false,
      databaseUrl: null,
      ffmpegBinary: null,
      ghlImportEnabled: false,
      ghlImportPollIntervalMs: 5_000,
      ghlSyncIntervalMs: 15 * 60 * 1000,
      ghlSyncPollIntervalMs: 60_000,
      host: "0.0.0.0",
      maxSourceBytes: 500 * 1024 * 1024,
      openaiApiKey: null,
      port: 8787,
      nodeEnv: "development",
      pollIntervalMs: 5_000,
      supabaseServiceRoleKey: null,
      supabaseUrl: null,
      transcribeConcurrency: 3,
    });
  });

  it("parses numeric and boolean overrides", () => {
    expect(getWorkerEnv({
      ...callProcessingEnv,
      CALL_PROCESSING_ENABLED: "true",
      FFMPEG_BINARY: "/usr/local/bin/ffmpeg",
      CALL_PROCESSING_MAX_SOURCE_BYTES: "1048576",
      CALL_PROCESSING_POLL_INTERVAL_MS: "15000",
      PORT: "9001",
      CALL_PROCESSING_TRANSCRIBE_CONCURRENCY: "4",
      NODE_ENV: "production",
    })).toEqual({
      callProcessingEnabled: true,
      databaseUrl: "postgres://postgres:postgres@localhost:5432/argos",
      ffmpegBinary: "/usr/local/bin/ffmpeg",
      ghlImportEnabled: false,
      ghlImportPollIntervalMs: 5_000,
      ghlSyncIntervalMs: 15 * 60 * 1000,
      ghlSyncPollIntervalMs: 60_000,
      host: "0.0.0.0",
      maxSourceBytes: 1_048_576,
      openaiApiKey: "openai-key",
      port: 9001,
      nodeEnv: "production",
      pollIntervalMs: 15_000,
      supabaseServiceRoleKey: "service-role-key",
      supabaseUrl: "https://argos.example.supabase.co",
      transcribeConcurrency: 4,
    });
  });

  it("throws when PORT is invalid", () => {
    expect(() => getWorkerEnv({ PORT: "abc" })).toThrow(
      "Invalid PORT environment variable: abc",
    );
  });

  it("throws when numeric env values are malformed or out of range", () => {
    expect(() => getWorkerEnv({ PORT: "9001abc" })).toThrow(
      "Invalid PORT environment variable: 9001abc",
    );
    expect(() => getWorkerEnv({ PORT: "-1" })).toThrow(
      "Invalid PORT environment variable: -1",
    );
    expect(() => getWorkerEnv({ CALL_PROCESSING_POLL_INTERVAL_MS: "1.5" })).toThrow(
      "Invalid CALL_PROCESSING_POLL_INTERVAL_MS environment variable: 1.5",
    );
    expect(() => getWorkerEnv({ CALL_PROCESSING_POLL_INTERVAL_MS: "0" })).toThrow(
      "Invalid CALL_PROCESSING_POLL_INTERVAL_MS environment variable: 0",
    );
    expect(() => getWorkerEnv({ CALL_PROCESSING_TRANSCRIBE_CONCURRENCY: "0" })).toThrow(
      "Invalid CALL_PROCESSING_TRANSCRIBE_CONCURRENCY environment variable: 0",
    );
  });

  it("throws when call processing is enabled without required environment variables", () => {
    expect(() => getWorkerEnv({
      CALL_PROCESSING_ENABLED: "true",
      DATABASE_URL: callProcessingEnv.DATABASE_URL,
      OPENAI_API_KEY: callProcessingEnv.OPENAI_API_KEY,
      SUPABASE_SERVICE_ROLE_KEY: callProcessingEnv.SUPABASE_SERVICE_ROLE_KEY,
    })).toThrow("Missing required environment variable: SUPABASE_URL");
  });

  it("accepts the prefixed worker tuning variables and NEXT_PUBLIC_SUPABASE_URL fallback", () => {
    expect(getWorkerEnv({
      CALL_PROCESSING_ENABLED: "true",
      DATABASE_URL: callProcessingEnv.DATABASE_URL,
      OPENAI_API_KEY: callProcessingEnv.OPENAI_API_KEY,
      SUPABASE_SERVICE_ROLE_KEY: callProcessingEnv.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: callProcessingEnv.SUPABASE_URL,
      CALL_PROCESSING_MAX_SOURCE_BYTES: "2097152",
      CALL_PROCESSING_POLL_INTERVAL_MS: "9000",
      CALL_PROCESSING_TRANSCRIBE_CONCURRENCY: "2",
    })).toEqual({
      callProcessingEnabled: true,
      databaseUrl: "postgres://postgres:postgres@localhost:5432/argos",
      ffmpegBinary: null,
      ghlImportEnabled: false,
      ghlImportPollIntervalMs: 5_000,
      ghlSyncIntervalMs: 15 * 60 * 1000,
      ghlSyncPollIntervalMs: 60_000,
      host: "0.0.0.0",
      maxSourceBytes: 2_097_152,
      openaiApiKey: "openai-key",
      port: 8787,
      nodeEnv: "development",
      pollIntervalMs: 9_000,
      supabaseServiceRoleKey: "service-role-key",
      supabaseUrl: "https://argos.example.supabase.co",
      transcribeConcurrency: 2,
    });
  });

  it("prefers the call-processing OpenAI key over the legacy shared key", () => {
    expect(getWorkerEnv({
      CALL_PROCESSING_ENABLED: "true",
      DATABASE_URL: callProcessingEnv.DATABASE_URL,
      OPENAI_API_KEY: callProcessingEnv.OPENAI_API_KEY,
      OPENAI_CALL_PROCESSING_API_KEY: "call-processing-openai-key",
      SUPABASE_SERVICE_ROLE_KEY: callProcessingEnv.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL: callProcessingEnv.SUPABASE_URL,
    }).openaiApiKey).toBe("call-processing-openai-key");
  });

  it("requires production identity labels before enabling privileged worker clients", () => {
    expect(() =>
      getWorkerEnv({
        ...callProcessingEnv,
        APP_ENV: "production",
        CALL_PROCESSING_ENABLED: "true",
        DATABASE_ENVIRONMENT: "preview",
        OPENAI_ENVIRONMENT: "production",
        SUPABASE_ENVIRONMENT: "production",
      }),
    ).toThrow("DATABASE_ENVIRONMENT=production");

    expect(() =>
      getWorkerEnv({
        ...callProcessingEnv,
        APP_ENV: "production",
        CALL_PROCESSING_ENABLED: "true",
        DATABASE_ENVIRONMENT: "production",
        OPENAI_ENVIRONMENT: "preview",
        SUPABASE_ENVIRONMENT: "production",
      }),
    ).toThrow("OPENAI_ENVIRONMENT=production");
  });

  it("accepts declared production identities for privileged worker clients", () => {
    expect(getWorkerEnv({
      ...callProcessingEnv,
      APP_ENV: "production",
      CALL_PROCESSING_ENABLED: "true",
      DATABASE_ENVIRONMENT: "production",
      OPENAI_ENVIRONMENT: "production",
      SUPABASE_ENVIRONMENT: "production",
    })).toMatchObject({
      callProcessingEnabled: true,
      databaseUrl: callProcessingEnv.DATABASE_URL,
      openaiApiKey: callProcessingEnv.OPENAI_API_KEY,
      supabaseServiceRoleKey: callProcessingEnv.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: callProcessingEnv.SUPABASE_URL,
    });
  });

  it("rejects production worker resources when APP_ENV is not production", () => {
    expect(() =>
      getWorkerEnv({
        CALL_PROCESSING_ENABLED: "true",
        APP_ENV: "development",
        DATABASE_URL: "postgres://postgres:postgres@db.mlluqkmmcfqjmjqoparf.supabase.co:5432/postgres",
        DATABASE_ENVIRONMENT: "development",
        OPENAI_API_KEY: "openai-key",
        OPENAI_ENVIRONMENT: "development",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        SUPABASE_ENVIRONMENT: "development",
        ARGOS_PRODUCTION_SUPABASE_PROJECT_REF: "mlluqkmmcfqjmjqoparf",
        ARGOS_PRODUCTION_DATABASE_HOST: "db.mlluqkmmcfqjmjqoparf.supabase.co",
      }),
    ).toThrow("production Supabase resource requires APP_ENV=production");
  });

  it("rejects production worker pooler database resources when APP_ENV is not production", () => {
    expect(() =>
      getWorkerEnv({
        CALL_PROCESSING_ENABLED: "true",
        APP_ENV: "development",
        DATABASE_URL: "postgres://postgres.mlluqkmmcfqjmjqoparf:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
        DATABASE_ENVIRONMENT: "development",
        OPENAI_API_KEY: "openai-key",
        OPENAI_ENVIRONMENT: "development",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_URL: "https://preview-project.supabase.co",
        SUPABASE_ENVIRONMENT: "development",
        ARGOS_PRODUCTION_SUPABASE_PROJECT_REF: "mlluqkmmcfqjmjqoparf",
      }),
    ).toThrow("production database resource requires APP_ENV=production");
  });

  it("enables GHL import with database and Supabase credentials but without OpenAI", () => {
    expect(getWorkerEnv({
      GHL_IMPORT_ENABLED: "true",
      DATABASE_URL: callProcessingEnv.DATABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: callProcessingEnv.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL: callProcessingEnv.SUPABASE_URL,
      GHL_IMPORT_POLL_INTERVAL_MS: "7000",
      GHL_SYNC_INTERVAL_MS: "120000",
      GHL_SYNC_POLL_INTERVAL_MS: "30000",
    })).toMatchObject({
      callProcessingEnabled: false,
      ghlImportEnabled: true,
      ghlImportPollIntervalMs: 7_000,
      ghlSyncIntervalMs: 120_000,
      ghlSyncPollIntervalMs: 30_000,
      openaiApiKey: null,
    });
  });
});
