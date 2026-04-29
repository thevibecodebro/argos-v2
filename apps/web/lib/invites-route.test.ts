import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createInvitesRepository = vi.fn();
const createUsersRepository = vi.fn();
const sendInvite = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/invites/create-repository", () => ({
  createInvitesRepository,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/invites/service", () => ({
  sendInvite,
  listPendingInvites: vi.fn(),
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

describe("invites route", () => {
  const usersRepository = {
    findCurrentUserByAuthId: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createInvitesRepository.mockReset();
    createUsersRepository.mockReset();
    usersRepository.findCurrentUserByAuthId.mockReset();
    sendInvite.mockReset();
    checkRateLimitForPolicy.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createInvitesRepository.mockReturnValue({});
    createUsersRepository.mockReturnValue(usersRepository);
    usersRepository.findCurrentUserByAuthId.mockResolvedValue({
      id: "auth-user-1",
      email: "admin@acme.com",
      orgId: "org-1",
      role: "admin",
      org: { id: "org-1", name: "Acme", slug: "acme", plan: "trial", createdAt: "2026-04-28T00:00:00.000Z" },
      displayNameSet: true,
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      requestCount: 1,
      retryAfterSeconds: 3600,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "invites:org:hash",
    });
  });

  it("returns 429 when the org invite limit is exceeded", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      limit: 10,
      remaining: 0,
      requestCount: 11,
      retryAfterSeconds: 321,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "invites:org:hash",
    });

    const route = await import("../app/api/invites/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "rep@acme.com",
          role: "rep",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("321");
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 321,
    });
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("invites", {
      type: "org",
      id: "org-1",
    });
    expect(sendInvite).not.toHaveBeenCalled();
  });
});
