import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const archiveOrganizationForCurrentAdmin = vi.fn();
const createOnboardingRepository = vi.fn();
const createPlatformRepository = vi.fn();
const createOrganizationForUser = vi.fn();
const createUsersRepository = vi.fn();
const findCurrentUserByAuthId = vi.fn();
const joinOrganizationForUser = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/onboarding/create-repository", () => ({
  createOnboardingRepository,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/onboarding/service", () => ({
  createOrganizationForUser,
  joinOrganizationForUser,
}));

vi.mock("@/lib/organizations/archive", () => ({
  archiveOrganizationForCurrentAdmin,
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

describe("organizations routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    archiveOrganizationForCurrentAdmin.mockReset();
    getAuthenticatedSupabaseUser.mockReset();
    createOnboardingRepository.mockReset();
    createPlatformRepository.mockReset();
    createOrganizationForUser.mockReset();
    createUsersRepository.mockReset();
    findCurrentUserByAuthId.mockReset();
    joinOrganizationForUser.mockReset();
    checkRateLimitForPolicy.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createOnboardingRepository.mockReturnValue({});
    createPlatformRepository.mockReturnValue({ kind: "platform-repository" });
    createUsersRepository.mockReturnValue({ findCurrentUserByAuthId });
    findCurrentUserByAuthId.mockResolvedValue({
      email: "admin@acme.test",
      id: "auth-user-1",
      orgId: "org-1",
      role: "admin",
    });
    archiveOrganizationForCurrentAdmin.mockResolvedValue({
      ok: true,
      data: {
        archived: true,
        auditEvent: { id: "audit-1" },
        detachedUserCount: 2,
        endedSessionCount: 1,
        organization: { id: "org-1", status: "archived" },
      },
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      bucketKey: "organization:user:hash",
      limit: 10,
      remaining: 9,
      requestCount: 1,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 3600,
    });
  });

  it("rate limits organization creation per authenticated user before creating the organization", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "organizationCreate:user:hash",
      limit: 5,
      remaining: 0,
      requestCount: 6,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 321,
    });

    const route = await import("../app/api/organizations/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Acme", slug: "acme" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("321");
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("organizationCreate", {
      type: "user",
      id: "auth-user-1",
    });
    expect(createOnboardingRepository).not.toHaveBeenCalled();
    expect(createOrganizationForUser).not.toHaveBeenCalled();
  });

  it("rate limits organization joins per authenticated user before joining", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "organizationJoin:user:hash",
      limit: 10,
      remaining: 0,
      requestCount: 11,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 222,
    });

    const route = await import("../app/api/organizations/join/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/organizations/join", {
        method: "POST",
        body: JSON.stringify({ slug: "acme" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("222");
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("organizationJoin", {
      type: "user",
      id: "auth-user-1",
    });
    expect(createOnboardingRepository).not.toHaveBeenCalled();
    expect(joinOrganizationForUser).not.toHaveBeenCalled();
  });

  it("denies unauthenticated organization archival", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValueOnce(null);

    const route = await import("../app/api/organizations/route");
    const response = await route.DELETE(
      new Request("http://localhost:3000/api/organizations", {
        method: "DELETE",
        body: JSON.stringify({
          confirmationSlug: "acme",
          reason: "Closing account",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(archiveOrganizationForCurrentAdmin).not.toHaveBeenCalled();
  });

  it("delegates organization archival to the current admin organization", async () => {
    const route = await import("../app/api/organizations/route");
    const response = await route.DELETE(
      new Request("http://localhost:3000/api/organizations", {
        method: "DELETE",
        body: JSON.stringify({
          confirmationSlug: "acme",
          reason: "Closing account",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      archived: true,
      auditEvent: { id: "audit-1" },
      detachedUserCount: 2,
      endedSessionCount: 1,
      organization: { id: "org-1", status: "archived" },
    });
    expect(archiveOrganizationForCurrentAdmin).toHaveBeenCalledWith(
      { kind: "platform-repository" },
      {
        email: "admin@acme.test",
        orgId: "org-1",
        role: "admin",
        userId: "auth-user-1",
      },
      {
        confirmationSlug: "acme",
        reason: "Closing account",
      },
    );
  });
});
