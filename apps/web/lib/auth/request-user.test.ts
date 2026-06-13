import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createDashboardRepository,
  createPlatformRepository,
  createUsersRepository,
  cookies,
  getPlatformSessionCookieValue,
  getAuthenticatedSupabaseUser,
  getCurrentUserDetails,
  getCurrentUserProfile,
  resolveEffectiveActor,
} = vi.hoisted(() => ({
  createDashboardRepository: vi.fn(),
  createPlatformRepository: vi.fn(),
  createUsersRepository: vi.fn(),
  cookies: vi.fn(),
  getPlatformSessionCookieValue: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
  getCurrentUserDetails: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  resolveEffectiveActor: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("react", () => ({
  cache: <T extends (...args: any[]) => unknown>(fn: T) => {
    const memoized = new Map<string, Promise<unknown>>();

    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);

      if (!memoized.has(key)) {
        memoized.set(key, Promise.resolve(fn(...args)));
      }

      return memoized.get(key) as ReturnType<T>;
    }) as T;
  },
}));

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/dashboard/create-repository", () => ({
  createDashboardRepository,
}));

vi.mock("@/lib/dashboard/service", () => ({
  getCurrentUserProfile,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/effective-actor", () => ({
  getPlatformSessionCookieValue,
  resolveEffectiveActor,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails,
}));

describe("request-user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cookies.mockResolvedValue(new Map());
    getPlatformSessionCookieValue.mockReturnValue(null);
  });

  it("dedupes authenticated user lookups within a request", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const { getCachedAuthenticatedSupabaseUser } = await import("./request-user");
    const [first, second] = await Promise.all([
      getCachedAuthenticatedSupabaseUser(),
      getCachedAuthenticatedSupabaseUser(),
    ]);

    expect(first).toEqual({ id: "auth-user-1" });
    expect(second).toEqual(first);
    expect(getAuthenticatedSupabaseUser).toHaveBeenCalledTimes(1);
  });

  it("dedupes current-user profile lookups for the same auth user", async () => {
    const repository = { kind: "dashboard" };
    createDashboardRepository.mockReturnValue(repository);
    getCurrentUserProfile.mockResolvedValue({ id: "user-1", role: "manager" });

    const { getCachedCurrentUserProfile } = await import("./request-user");
    const [first, second] = await Promise.all([
      getCachedCurrentUserProfile("auth-user-1"),
      getCachedCurrentUserProfile("auth-user-1"),
    ]);

    expect(first).toEqual({ id: "user-1", role: "manager" });
    expect(second).toEqual(first);
    expect(createDashboardRepository).toHaveBeenCalledTimes(1);
    expect(getCurrentUserProfile).toHaveBeenCalledTimes(1);
    expect(getCurrentUserProfile).toHaveBeenCalledWith(repository, "auth-user-1");
  });

  it("resolves platform-switched staff as the effective current-user profile", async () => {
    const cookieStore = new Map([["argos_platform_session", "session-1"]]);
    const dashboardRepository = {
      findCurrentUserByAuthId: vi.fn(),
    };
    const platformRepository = {
      findActiveAccessSession: vi.fn(),
      findStaffByUserId: vi.fn(),
    };

    cookies.mockResolvedValue(cookieStore);
    getPlatformSessionCookieValue.mockReturnValue("session-1");
    createDashboardRepository.mockReturnValue(dashboardRepository);
    createPlatformRepository.mockReturnValue(platformRepository);
    resolveEffectiveActor.mockResolvedValue({
      kind: "platform",
      platform: {
        reason: "Support request",
        sessionId: "session-1",
        staffUserId: "staff-1",
      },
      profile: {
        id: "staff-1",
        email: "platform:staff-1",
        role: "admin",
        firstName: null,
        lastName: null,
        org: {
          id: "org-1",
          name: "Acme",
          slug: "acme",
          plan: "trial",
          logoUrl: null,
        },
      },
    });

    const { getCachedCurrentUserProfile } = await import("./request-user");

    await expect(getCachedCurrentUserProfile("staff-1")).resolves.toEqual({
      id: "staff-1",
      email: "platform:staff-1",
      role: "admin",
      fullName: "platform:staff-1",
      org: {
        id: "org-1",
        name: "Acme",
        slug: "acme",
        plan: "trial",
        logoUrl: null,
      },
    });

    expect(getCurrentUserProfile).not.toHaveBeenCalled();
    expect(resolveEffectiveActor).toHaveBeenCalledWith(
      {
        findActiveAccessSession: expect.any(Function),
        findCurrentUserByAuthId: expect.any(Function),
        findStaffByUserId: expect.any(Function),
      },
      {
        authUserId: "staff-1",
        cookies: cookieStore,
      },
    );
  });

  it("dedupes current-user detail lookups for the same auth user", async () => {
    const repository = { kind: "users" };
    createUsersRepository.mockReturnValue(repository);
    getCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: { id: "user-1", role: "admin" },
    });

    const { getCachedCurrentUserDetails } = await import("./request-user");
    const [first, second] = await Promise.all([
      getCachedCurrentUserDetails("auth-user-1"),
      getCachedCurrentUserDetails("auth-user-1"),
    ]);

    expect(first).toEqual({
      ok: true,
      data: { id: "user-1", role: "admin" },
    });
    expect(second).toEqual(first);
    expect(createUsersRepository).toHaveBeenCalledTimes(1);
    expect(getCurrentUserDetails).toHaveBeenCalledTimes(1);
    expect(getCurrentUserDetails).toHaveBeenCalledWith(repository, "auth-user-1");
  });
});
