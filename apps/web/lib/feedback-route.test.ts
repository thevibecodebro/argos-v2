import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createUsersRepository = vi.fn();
const sendFeedbackEmail = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/feedback/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/feedback/service")>();
  return {
    ...actual,
    sendFeedbackEmail,
  };
});

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

describe("feedback route", () => {
  const usersRepository = {
    findCurrentUserByAuthId: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createUsersRepository.mockReset();
    usersRepository.findCurrentUserByAuthId.mockReset();
    sendFeedbackEmail.mockReset();
    checkRateLimitForPolicy.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createUsersRepository.mockReturnValue(usersRepository);
    usersRepository.findCurrentUserByAuthId.mockResolvedValue({
      displayNameSet: true,
      email: "admin@acme.com",
      firstName: "Admin",
      fullName: "Admin User",
      id: "user-1",
      lastName: "User",
      org: { createdAt: "2026-04-28T00:00:00.000Z", id: "org-1", name: "Acme", plan: "trial", slug: "acme" },
      orgId: "org-1",
      profileImageUrl: null,
      role: "admin",
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      bucketKey: "feedback:user:hash",
      limit: 10,
      remaining: 9,
      requestCount: 1,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 3600,
    });
    sendFeedbackEmail.mockResolvedValue(undefined);
  });

  it("requires an authenticated user", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValueOnce(null);

    const route = await import("../app/api/feedback/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "The upload page keeps failing after retry.",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(checkRateLimitForPolicy).not.toHaveBeenCalled();
    expect(sendFeedbackEmail).not.toHaveBeenCalled();
  });

  it("rate limits feedback submissions per authenticated user", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "feedback:user:hash",
      limit: 10,
      remaining: 0,
      requestCount: 11,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 321,
    });

    const route = await import("../app/api/feedback/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "The upload page keeps failing after retry.",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("321");
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("feedback", {
      type: "user",
      id: "auth-user-1",
    });
    expect(createUsersRepository).not.toHaveBeenCalled();
    expect(sendFeedbackEmail).not.toHaveBeenCalled();
  });

  it("validates the feedback body before sending email", async () => {
    const route = await import("../app/api/feedback/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "short",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "invalid_feedback",
      error: "Feedback must be at least 10 characters.",
    });
    expect(sendFeedbackEmail).not.toHaveBeenCalled();
  });

  it("sends normalized feedback with user and request context", async () => {
    const route = await import("../app/api/feedback/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 Test Browser",
        },
        body: JSON.stringify({
          category: "bug",
          message: "The upload page keeps failing after retry.",
          pagePath: "/upload",
          subject: "Upload retry issue",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sendFeedbackEmail).toHaveBeenCalledWith({
      feedback: {
        category: "bug",
        message: "The upload page keeps failing after retry.",
        pagePath: "/upload",
        subject: "Upload retry issue",
      },
      request: {
        userAgent: "Mozilla/5.0 Test Browser",
      },
      user: {
        email: "admin@acme.com",
        fullName: "Admin User",
        id: "user-1",
        orgName: "Acme",
        role: "admin",
      },
    });
  });
});
