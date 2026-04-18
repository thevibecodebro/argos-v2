import { describe, expect, it, vi } from "vitest";
import { discoverWorkerTestDatabaseUrl } from "./database-env";

describe("discoverWorkerTestDatabaseUrl", () => {
  it("prefers an explicit worker test database url", async () => {
    await expect(
      discoverWorkerTestDatabaseUrl({
        env: {
          WORKER_TEST_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:64322/test",
          DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        },
        probeConnection: vi.fn().mockResolvedValue(false),
      }),
    ).resolves.toBe("postgresql://postgres:postgres@127.0.0.1:64322/test");
  });

  it("accepts an explicit local DATABASE_URL", async () => {
    await expect(
      discoverWorkerTestDatabaseUrl({
        env: {
          DATABASE_URL: "postgresql://postgres:postgres@localhost:54322/postgres",
        },
        probeConnection: vi.fn().mockResolvedValue(false),
      }),
    ).resolves.toBe("postgresql://postgres:postgres@localhost:54322/postgres");
  });

  it("does not implicitly use a non-local DATABASE_URL", async () => {
    const probeConnection = vi.fn().mockResolvedValue(false);

    await expect(
      discoverWorkerTestDatabaseUrl({
        env: {
          DATABASE_URL: "postgresql://postgres:postgres@db.example.com:5432/postgres",
        },
        probeConnection,
      }),
    ).resolves.toBeNull();

    expect(probeConnection).toHaveBeenCalledWith(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    );
  });

  it("falls back to the local Supabase postgres when reachable", async () => {
    const probeConnection = vi.fn().mockResolvedValue(true);

    await expect(
      discoverWorkerTestDatabaseUrl({
        env: {},
        probeConnection,
      }),
    ).resolves.toBe("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  });
});
