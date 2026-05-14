import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const checkRateLimitForPolicy = vi.fn();
const createInvitesRepository = vi.fn();
const createOnboardingRepository = vi.fn();
const transaction = vi.fn();
const getDb = vi.fn(() => ({ transaction }));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: (result: { retryAfterSeconds: number }) =>
    Response.json(
      {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
}));

vi.mock("@/lib/invites/create-repository", () => ({
  createInvitesRepository,
}));

vi.mock("@/lib/onboarding/create-repository", () => ({
  createOnboardingRepository,
}));

vi.mock("@argos-v2/db", () => ({
  getDb,
}));

describe("invite accept route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    checkRateLimitForPolicy.mockReset();
    createInvitesRepository.mockReset();
    createOnboardingRepository.mockReset();
    transaction.mockReset();
    getDb.mockClear();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      bucketKey: "inviteAccept:user:hash",
      limit: 20,
      remaining: 19,
      requestCount: 1,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 3600,
    });
  });

  it("rate limits invite acceptance per authenticated user before lookup or transaction", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "inviteAccept:user:hash",
      limit: 20,
      remaining: 0,
      requestCount: 21,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 123,
    });

    const route = await import("../app/api/invites/[token]/accept/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/invites/invite-token/accept", {
        method: "POST",
      }),
      { params: Promise.resolve({ token: "invite-token" }) },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("123");
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("inviteAccept", {
      type: "user",
      id: "auth-user-1",
    });
    expect(createInvitesRepository).not.toHaveBeenCalled();
    expect(createOnboardingRepository).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
