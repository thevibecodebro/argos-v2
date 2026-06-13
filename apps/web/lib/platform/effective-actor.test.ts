import { describe, expect, it, vi } from "vitest";
import {
  PLATFORM_SESSION_COOKIE_NAME,
  resolveEffectiveActor,
  type EffectiveActorRepository,
} from "./effective-actor";

const regularUser = {
  id: "user-1",
  email: "admin@acme.com",
  role: "admin" as const,
  firstName: "Admin",
  lastName: "User",
  org: {
    id: "org-1",
    name: "Acme",
    slug: "acme",
    plan: "trial",
    logoUrl: null,
  },
};

const platformStaff = {
  userId: "staff-1",
  role: "operator" as const,
  status: "active" as const,
  createdBy: null,
  revokedBy: null,
  createdAt: new Date("2026-06-11T10:00:00.000Z"),
  updatedAt: new Date("2026-06-11T10:00:00.000Z"),
  revokedAt: null,
};

const platformSession = {
  id: "session-1",
  staffUserId: "staff-1",
  targetOrgId: "org-1",
  targetOrgName: "Acme",
  targetOrgSlug: "acme",
  reason: "Support request",
  status: "active" as const,
  startedAt: new Date("2026-06-11T10:00:00.000Z"),
  expiresAt: new Date("2026-06-11T11:00:00.000Z"),
  endedAt: null,
};

function createRepository(overrides: Partial<EffectiveActorRepository> = {}) {
  return {
    findCurrentUserByAuthId: vi.fn().mockResolvedValue(regularUser),
    findActiveAccessSession: vi.fn().mockResolvedValue(platformSession),
    findStaffByUserId: vi.fn().mockResolvedValue(platformStaff),
    ...overrides,
  } satisfies EffectiveActorRepository;
}

describe("resolveEffectiveActor", () => {
  it("keeps regular users unchanged without a platform session cookie", async () => {
    const repository = createRepository();

    await expect(
      resolveEffectiveActor(repository, {
        authUserId: "user-1",
        cookies: new Map(),
      }),
    ).resolves.toEqual({
      kind: "user",
      profile: regularUser,
      platform: null,
    });

    expect(repository.findCurrentUserByAuthId).toHaveBeenCalledWith("user-1");
    expect(repository.findStaffByUserId).not.toHaveBeenCalled();
    expect(repository.findActiveAccessSession).not.toHaveBeenCalled();
  });

  it("returns platform-switched staff as an effective org admin", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
    });

    await expect(
      resolveEffectiveActor(repository, {
        authUserId: "staff-1",
        cookies: new Map([[PLATFORM_SESSION_COOKIE_NAME, "session-1"]]),
      }),
    ).resolves.toEqual({
      kind: "platform",
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
      platform: {
        reason: "Support request",
        sessionId: "session-1",
        staffUserId: "staff-1",
      },
    });

    expect(repository.findStaffByUserId).toHaveBeenCalledWith("staff-1");
    expect(repository.findActiveAccessSession).toHaveBeenCalledWith("session-1", "staff-1");
  });

  it("does not grant access for revoked staff", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
      findStaffByUserId: vi.fn().mockResolvedValue({
        ...platformStaff,
        status: "revoked",
      }),
    });

    await expect(
      resolveEffectiveActor(repository, {
        authUserId: "staff-1",
        cookies: new Map([[PLATFORM_SESSION_COOKIE_NAME, "session-1"]]),
      }),
    ).resolves.toBeNull();

    expect(repository.findActiveAccessSession).not.toHaveBeenCalled();
  });

  it("does not grant access for expired or missing sessions", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
      findActiveAccessSession: vi.fn().mockResolvedValue(null),
    });

    await expect(
      resolveEffectiveActor(repository, {
        authUserId: "staff-1",
        cookies: new Map([[PLATFORM_SESSION_COOKIE_NAME, "expired-session"]]),
      }),
    ).resolves.toBeNull();
  });

  it("falls back to regular user access when a nonstaff user has a stale platform cookie", async () => {
    const repository = createRepository({
      findStaffByUserId: vi.fn().mockResolvedValue(null),
    });

    await expect(
      resolveEffectiveActor(repository, {
        authUserId: "user-1",
        cookies: new Map([[PLATFORM_SESSION_COOKIE_NAME, "stale-session"]]),
      }),
    ).resolves.toEqual({
      kind: "user",
      profile: regularUser,
      platform: null,
    });

    expect(repository.findCurrentUserByAuthId).toHaveBeenCalledWith("user-1");
    expect(repository.findActiveAccessSession).not.toHaveBeenCalled();
  });
});
