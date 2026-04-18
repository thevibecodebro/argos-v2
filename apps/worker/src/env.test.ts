import { describe, expect, it } from "vitest";
import { getWorkerEnv } from "./env";

const callProcessingEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/argos",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  SUPABASE_URL: "https://argos.example.supabase.co",
};

describe("getWorkerEnv", () => {
  it("returns defaults when optional values are missing", () => {
    expect(getWorkerEnv({})).toEqual({
      callProcessingEnabled: false,
      databaseUrl: null,
      ffmpegBinary: null,
      host: "0.0.0.0",
      maxSourceBytes: 500 * 1024 * 1024,
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
      MAX_SOURCE_BYTES: "1048576",
      POLL_INTERVAL_MS: "15000",
      PORT: "9001",
      TRANSCRIBE_CONCURRENCY: "4",
      NODE_ENV: "production",
    })).toEqual({
      callProcessingEnabled: true,
      databaseUrl: "postgres://postgres:postgres@localhost:5432/argos",
      ffmpegBinary: "/usr/local/bin/ffmpeg",
      host: "0.0.0.0",
      maxSourceBytes: 1_048_576,
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
    expect(() => getWorkerEnv({ POLL_INTERVAL_MS: "1.5" })).toThrow(
      "Invalid POLL_INTERVAL_MS environment variable: 1.5",
    );
    expect(() => getWorkerEnv({ POLL_INTERVAL_MS: "0" })).toThrow(
      "Invalid POLL_INTERVAL_MS environment variable: 0",
    );
    expect(() => getWorkerEnv({ TRANSCRIBE_CONCURRENCY: "0" })).toThrow(
      "Invalid TRANSCRIBE_CONCURRENCY environment variable: 0",
    );
  });

  it("throws when call processing is enabled without required environment variables", () => {
    expect(() => getWorkerEnv({
      CALL_PROCESSING_ENABLED: "true",
      DATABASE_URL: callProcessingEnv.DATABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: callProcessingEnv.SUPABASE_SERVICE_ROLE_KEY,
    })).toThrow("Missing required environment variable: SUPABASE_URL");
  });
});
