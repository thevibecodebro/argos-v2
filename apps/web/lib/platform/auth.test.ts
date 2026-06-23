import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, redirect } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import {
  getPlatformApiAccess,
  getPlatformStaffAfterProvisioning,
  requirePlatformStaffAccess,
} from "./auth";

const activeStaff = {
  userId: "auth-user-1",
  role: "owner",
  status: "active",
  createdBy: null,
  revokedBy: null,
  createdAt: new Date("2026-06-11T10:00:00.000Z"),
  updatedAt: new Date("2026-06-11T10:00:00.000Z"),
  revokedAt: null,
} as const;

const revokedStaff = {
  ...activeStaff,
  status: "revoked",
  revokedAt: new Date("2026-06-11T11:00:00.000Z"),
} as const;

const activeOperatorStaff = {
  ...activeStaff,
  role: "operator",
} as const;

function createRepository(
  staff:
    | typeof activeStaff
    | typeof activeOperatorStaff
    | typeof revokedStaff
    | null = activeStaff,
) {
  return {
    findStaffByUserId: vi.fn().mockResolvedValue(staff),
    upsertStaff: vi.fn().mockResolvedValue(activeStaff),
  };
}

function mockSupabaseSession(input: {
  user: { id: string; email?: string | null } | null;
  currentLevel?: "aal1" | "aal2" | null;
  totpFactors?: Array<{ id: string; status?: string }>;
}) {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: input.user },
    error: null,
  });
  const getAuthenticatorAssuranceLevel = vi.fn().mockResolvedValue({
    data: { currentLevel: input.currentLevel ?? "aal2" },
    error: null,
  });
  const listFactors = vi.fn().mockResolvedValue({
    data: { totp: input.totpFactors ?? [] },
    error: null,
  });

  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser,
      mfa: {
        getAuthenticatorAssuranceLevel,
        listFactors,
      },
    },
  });

  return {
    getAuthenticatorAssuranceLevel,
    getUser,
    listFactors,
  };
}

describe("getPlatformStaffAfterProvisioning", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("upserts a platform owner when the provisioned Supabase user matches the platform bootstrap env", async () => {
    vi.stubEnv(
      "ARGOS_PLATFORM_BOOTSTRAP_OWNER_EMAILS",
      " owner@argos.ai, second-owner@argos.ai ",
    );
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "");
    const repository = createRepository(null);

    await expect(
      getPlatformStaffAfterProvisioning(repository, {
        id: "auth-user-1",
        email: "Owner@Argos.ai",
      }),
    ).resolves.toEqual(activeStaff);

    expect(repository.upsertStaff).toHaveBeenCalledWith({
      userId: "auth-user-1",
      role: "owner",
      status: "active",
      createdBy: null,
    });
    expect(repository.findStaffByUserId).toHaveBeenCalledWith("auth-user-1");
  });

  it("does not reactivate an env-listed revoked platform staff record", async () => {
    vi.stubEnv("ARGOS_PLATFORM_BOOTSTRAP_OWNER_EMAILS", "owner@argos.ai");
    const repository = createRepository(revokedStaff);

    await expect(
      getPlatformStaffAfterProvisioning(repository, {
        id: "auth-user-1",
        email: "owner@argos.ai",
      }),
    ).resolves.toEqual(revokedStaff);

    expect(repository.findStaffByUserId).toHaveBeenCalledWith("auth-user-1");
    expect(repository.upsertStaff).not.toHaveBeenCalled();
  });

  it("does not reuse the organization onboarding bootstrap env for platform staff", async () => {
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "owner@argos.ai");
    vi.stubEnv("ARGOS_PLATFORM_BOOTSTRAP_OWNER_EMAILS", "");
    const repository = createRepository(null);

    await expect(
      getPlatformStaffAfterProvisioning(repository, {
        id: "auth-user-1",
        email: "owner@argos.ai",
      }),
    ).resolves.toBeNull();

    expect(repository.upsertStaff).not.toHaveBeenCalled();
    expect(repository.findStaffByUserId).toHaveBeenCalledWith("auth-user-1");
  });

  it("upserts a platform owner when the provisioned user matches the trusted owner env", async () => {
    vi.stubEnv(
      "ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS",
      " jaredalannewman@gmail.com, email@jasonbrentking.com ",
    );
    const repository = createRepository(null);

    await expect(
      getPlatformStaffAfterProvisioning(repository, {
        id: "auth-user-1",
        email: "JaredAlanNewman@gmail.com",
      }),
    ).resolves.toEqual(activeStaff);

    expect(repository.upsertStaff).toHaveBeenCalledWith({
      userId: "auth-user-1",
      role: "owner",
      status: "active",
      createdBy: null,
    });
  });
});

describe("requirePlatformStaffAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirect.mockImplementation((href: string) => {
      throw new Error(`NEXT_REDIRECT:${href}`);
    });
  });

  it("redirects anonymous platform requests to login", async () => {
    mockSupabaseSession({ user: null });
    const repository = createRepository(null);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/login?next=%2Fplatform");

    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fplatform");
    expect(repository.findStaffByUserId).not.toHaveBeenCalled();
  });

  it("denies authenticated users who are not platform staff", async () => {
    mockSupabaseSession({ user: { id: "auth-user-1", email: "rep@argos.ai" } });
    const repository = createRepository(null);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");

    expect(repository.findStaffByUserId).toHaveBeenCalledWith("auth-user-1");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("denies revoked platform staff", async () => {
    mockSupabaseSession({ user: { id: "auth-user-1", email: "owner@argos.ai" } });
    const repository = createRepository(revokedStaff);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");

    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("redirects active staff without AAL2 and without a verified TOTP factor to MFA setup", async () => {
    mockSupabaseSession({
      user: { id: "auth-user-1", email: "owner@argos.ai" },
      currentLevel: "aal1",
      totpFactors: [{ id: "factor-unverified", status: "unverified" }],
    });
    const repository = createRepository(activeStaff);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/platform/mfa/setup");

    expect(redirect).toHaveBeenCalledWith("/platform/mfa/setup");
  });

  it("requires AAL2 for trusted active platform owners on platform pages", async () => {
    vi.stubEnv(
      "ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS",
      "jaredalannewman@gmail.com,email@jasonbrentking.com",
    );
    const user = { id: "auth-user-1", email: "jaredalannewman@gmail.com" };
    const mfa = mockSupabaseSession({
      user,
      currentLevel: "aal1",
      totpFactors: [{ id: "factor-unverified", status: "unverified" }],
    });
    const repository = createRepository(activeStaff);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/platform/mfa/setup");

    expect(mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalled();
    expect(mfa.listFactors).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/platform/mfa/setup");
  });

  it("does not bypass MFA for trusted emails unless the staff role is owner", async () => {
    vi.stubEnv("ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS", "jaredalannewman@gmail.com");
    mockSupabaseSession({
      user: { id: "auth-user-1", email: "jaredalannewman@gmail.com" },
      currentLevel: "aal1",
      totpFactors: [{ id: "factor-verified", status: "verified" }],
    });
    const repository = createRepository(activeOperatorStaff);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/platform/mfa/verify");

    expect(redirect).toHaveBeenCalledWith("/platform/mfa/verify");
  });

  it("redirects active staff without AAL2 and with a verified TOTP factor to MFA verify", async () => {
    mockSupabaseSession({
      user: { id: "auth-user-1", email: "owner@argos.ai" },
      currentLevel: "aal1",
      totpFactors: [{ id: "factor-verified", status: "verified" }],
    });
    const repository = createRepository(activeStaff);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).rejects.toThrow("NEXT_REDIRECT:/platform/mfa/verify");

    expect(redirect).toHaveBeenCalledWith("/platform/mfa/verify");
  });

  it("allows active staff with AAL2", async () => {
    const user = { id: "auth-user-1", email: "owner@argos.ai" };
    const mfa = mockSupabaseSession({ user, currentLevel: "aal2" });
    const repository = createRepository(activeStaff);

    await expect(
      requirePlatformStaffAccess({ repository, pathname: "/platform" }),
    ).resolves.toEqual({
      user,
      staff: activeStaff,
    });

    expect(mfa.listFactors).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("requires AAL2 for trusted active platform owners on platform APIs", async () => {
    vi.stubEnv("ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS", "email@jasonbrentking.com");
    const user = { id: "auth-user-1", email: "email@jasonbrentking.com" };
    const mfa = mockSupabaseSession({ user, currentLevel: "aal1" });
    const repository = createRepository(activeStaff);

    await expect(getPlatformApiAccess({ repository })).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Platform multi-factor authentication required",
    });

    expect(mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalled();
  });
});
