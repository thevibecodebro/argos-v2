import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClient = vi.fn();
const ensureUserProvisioned = vi.fn();
const SupabaseProvisioningRepository = vi.fn();
const isRetryableSupabaseAuthError = vi.fn();
const logAuthTransportFailure = vi.fn();
const createPlatformRepository = vi.fn();
const getPlatformStaffAfterProvisioning = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/provisioning/service", () => ({
  ensureUserProvisioned,
}));

vi.mock("@/lib/provisioning/repository", () => ({
  SupabaseProvisioningRepository,
}));

vi.mock("@/lib/supabase/auth-errors", () => ({
  isRetryableSupabaseAuthError,
}));

vi.mock("@/lib/supabase/auth-observability", () => ({
  logAuthTransportFailure,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/auth", () => ({
  getPlatformStaffAfterProvisioning,
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    createSupabaseServerClient.mockReset();
    ensureUserProvisioned.mockReset();
    SupabaseProvisioningRepository.mockReset();
    isRetryableSupabaseAuthError.mockReset();
    logAuthTransportFailure.mockReset();
    createPlatformRepository.mockReset();
    getPlatformStaffAfterProvisioning.mockReset();
    createPlatformRepository.mockReturnValue({
      findStaffByUserId: vi.fn(),
      upsertStaff: vi.fn(),
    });
    getPlatformStaffAfterProvisioning.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not reflect an untrusted forwarded host in production redirects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "founder@argos.ai",
              id: "auth-user-1",
            },
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue(undefined);

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/dashboard", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/dashboard");
  });

  it("keeps callback next path-only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "founder@argos.ai",
              id: "auth-user-1",
            },
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue(undefined);

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=https://evil.example"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/dashboard");
  });

  it("sends newly provisioned users without an organization to onboarding for protected destinations", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "new-rep@argos.ai",
              id: "auth-user-2",
            },
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue({
      created: true,
      orgId: null,
      userId: "auth-user-2",
    });

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/dashboard"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/onboarding");
  });

  it("sends orgless active platform staff to the platform entry point after provisioning", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    const authUser = {
      email: "owner@argos.ai",
      id: "auth-user-4",
    };
    const platformRepository = {
      findStaffByUserId: vi.fn(),
      upsertStaff: vi.fn(),
    };

    createPlatformRepository.mockReturnValue(platformRepository);
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: authUser,
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue({
      created: false,
      orgId: null,
      userId: "auth-user-4",
    });
    getPlatformStaffAfterProvisioning.mockResolvedValue({
      userId: "auth-user-4",
      role: "owner",
      status: "active",
      createdBy: null,
      revokedBy: null,
      createdAt: new Date("2026-06-11T10:00:00.000Z"),
      updatedAt: new Date("2026-06-11T10:00:00.000Z"),
      revokedAt: null,
    });

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/dashboard"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/platform/dashboard");
    expect(getPlatformStaffAfterProvisioning).toHaveBeenCalledWith(platformRepository, authUser);
    expect(ensureUserProvisioned.mock.invocationCallOrder[0]).toBeLessThan(
      getPlatformStaffAfterProvisioning.mock.invocationCallOrder[0],
    );
  });

  it("preserves nested platform destinations for orgless active platform staff", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    const authUser = {
      email: "owner@argos.ai",
      id: "auth-user-44",
    };
    const platformRepository = {
      findStaffByUserId: vi.fn(),
      upsertStaff: vi.fn(),
    };

    createPlatformRepository.mockReturnValue(platformRepository);
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: authUser,
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue({
      created: false,
      orgId: null,
      userId: "auth-user-44",
    });
    getPlatformStaffAfterProvisioning.mockResolvedValue({
      userId: "auth-user-44",
      role: "operator",
      status: "active",
      createdBy: null,
      revokedBy: null,
      createdAt: new Date("2026-06-11T10:00:00.000Z"),
      updatedAt: new Date("2026-06-11T10:00:00.000Z"),
      revokedAt: null,
    });

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/platform/staff"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/platform/staff");
    expect(getPlatformStaffAfterProvisioning).toHaveBeenCalledWith(platformRepository, authUser);
  });

  it("sends orgless revoked platform staff to onboarding after provisioning", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    const authUser = {
      email: "owner@argos.ai",
      id: "auth-user-5",
    };
    const platformRepository = {
      findStaffByUserId: vi.fn(),
      upsertStaff: vi.fn(),
    };

    createPlatformRepository.mockReturnValue(platformRepository);
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: authUser,
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue({
      created: false,
      orgId: null,
      userId: "auth-user-5",
    });
    getPlatformStaffAfterProvisioning.mockResolvedValue({
      userId: "auth-user-5",
      role: "owner",
      status: "revoked",
      createdBy: null,
      revokedBy: "auth-user-0",
      createdAt: new Date("2026-06-11T10:00:00.000Z"),
      updatedAt: new Date("2026-06-11T10:30:00.000Z"),
      revokedAt: new Date("2026-06-11T10:30:00.000Z"),
    });

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/platform"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/onboarding");
    expect(getPlatformStaffAfterProvisioning).toHaveBeenCalledWith(platformRepository, authUser);
  });

  it("keeps non-protected invite destinations for users without an organization", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "invited-rep@argos.ai",
              id: "auth-user-3",
            },
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue({
      created: true,
      orgId: null,
      userId: "auth-user-3",
    });

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/invite/invite-token"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/invite/invite-token");
  });
});
