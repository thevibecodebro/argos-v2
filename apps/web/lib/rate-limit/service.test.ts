import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  checkRateLimit,
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
  type RateLimitRepository,
} from "./service";

function makeRepository(
  requestCount: number,
): RateLimitRepository & { incrementBucket: ReturnType<typeof vi.fn> } {
  return {
    incrementBucket: vi.fn().mockImplementation(async (input) => ({
      requestCount,
      windowStart: input.windowStart,
      windowSeconds: input.windowSeconds,
    })),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rate limit service", () => {
  it("hashes subjects into fixed-window bucket keys before incrementing", async () => {
    const repository = makeRepository(3);
    const now = new Date("2026-04-28T10:15:30.250Z");
    vi.stubEnv("ARGOS_RATE_LIMIT_HASH_SECRET", "unit-test-rate-limit-secret");
    const digest = createHmac("sha256", "unit-test-rate-limit-secret")
      .update("org:org-1")
      .digest("hex");

    const result = await checkRateLimit(repository, {
      limit: 10,
      now,
      policy: "invites",
      subject: { type: "org", id: "org-1" },
      window: "hour",
    });

    expect(result.allowed).toBe(true);
    expect(repository.incrementBucket).toHaveBeenCalledTimes(1);
    expect(repository.incrementBucket).toHaveBeenCalledWith({
      bucketKey: `invites:org:${digest}`,
      windowSeconds: 60 * 60,
      windowStart: new Date("2026-04-28T10:00:00.000Z"),
    });
    expect(repository.incrementBucket.mock.calls[0]?.[0].bucketKey).not.toContain("org-1");
  });

  it("returns retry metadata when the incremented bucket exceeds the configured limit", async () => {
    const repository = makeRepository(11);
    const result = await checkRateLimit(repository, {
      limit: 10,
      now: new Date("2026-04-28T10:15:30.250Z"),
      policy: "invites",
      subject: { type: "org", id: "org-1" },
      window: "hour",
    });

    expect(result).toMatchObject({
      allowed: false,
      limit: 10,
      remaining: 0,
      requestCount: 11,
      retryAfterSeconds: 2670,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
    });
  });

  it("uses the production policy defaults for app-level checks", async () => {
    const repository = makeRepository(21);

    const result = await checkRateLimitForPolicy(
      "trainingAi",
      { type: "org", id: "org-1" },
      {
        now: new Date("2026-04-28T10:15:30.250Z"),
        repository,
      },
    );

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(20);
    expect(result.retryAfterSeconds).toBe(49470);
    expect(repository.incrementBucket).toHaveBeenCalledWith({
      bucketKey: expect.stringMatching(/^trainingAi:org:[a-f0-9]{64}$/),
      windowSeconds: 24 * 60 * 60,
      windowStart: new Date("2026-04-28T00:00:00.000Z"),
    });
  });

  it("serializes limited results as 429 JSON with Retry-After", async () => {
    const response = rateLimitExceededResponse({
      allowed: false,
      bucketKey: "uploads:user:hash",
      limit: 20,
      remaining: 0,
      requestCount: 21,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 42,
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    await expect(response.json()).resolves.toEqual({
      code: "rate_limit_exceeded",
      error: "Too many requests. Try again later.",
      retryAfterSeconds: 42,
    });
  });
});
