import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookies,
  createPlatformRepository,
  getCachedCurrentUserProfile,
} = vi.hoisted(() => ({
  cookies: vi.fn(),
  createPlatformRepository: vi.fn(),
  getCachedCurrentUserProfile: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedCurrentUserProfile,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

function platformProfile() {
  return {
    email: "platform:staff-1",
    fullName: "Platform Staff",
    id: "staff-1",
    org: {
      id: "org-1",
      logoUrl: null,
      name: "Acme",
      plan: "trial",
      slug: "acme",
    },
    role: "admin",
  };
}

function createPlatformRepositoryMock() {
  return {
    createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
    findActiveAccessSession: vi.fn().mockResolvedValue({
      id: "session-1",
      reason: "Support escalation",
      staffEmailSnapshot: "operator@argos.test",
      staffRoleSnapshot: "operator",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      targetOrgName: "Acme",
      targetOrgSlug: "acme",
    }),
    findStaffByUserId: vi.fn().mockResolvedValue({
      role: "operator",
      status: "active",
      userId: "staff-1",
    }),
  };
}

describe("effective tenant repository auditing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    cookies.mockResolvedValue(new Map([["argos_platform_session", "session-1"]]));
  });

  it("leaves normal tenant repositories unchanged and unaudited", async () => {
    const platformRepository = createPlatformRepositoryMock();
    const repository = {
      findCurrentUserByAuthId: vi.fn(),
      updateThing: vi.fn(),
    };

    getCachedCurrentUserProfile.mockResolvedValue({
      email: "admin@acme.test",
      id: "user-1",
      org: { id: "org-1" },
      role: "admin",
    });
    createPlatformRepository.mockReturnValue(platformRepository);

    const { createEffectiveTenantRepository } = await import("./effective-request");

    await expect(createEffectiveTenantRepository(repository, "user-1")).resolves.toBe(repository);
    expect(createPlatformRepository).not.toHaveBeenCalled();
    expect(platformRepository.createAuditEvent).not.toHaveBeenCalled();
  });

  it("audits mutating tenant repository calls made through a platform switch session", async () => {
    const platformRepository = createPlatformRepositoryMock();
    const repository = {
      findCurrentUserByAuthId: vi.fn(),
      findThing: vi.fn().mockResolvedValue({ id: "thing-1" }),
      updateThing: vi.fn().mockResolvedValue({ id: "thing-1", name: "Updated" }),
    };

    getCachedCurrentUserProfile.mockResolvedValue(platformProfile());
    createPlatformRepository.mockReturnValue(platformRepository);

    const { createEffectiveTenantRepository } = await import("./effective-request");
    const effectiveRepository = await createEffectiveTenantRepository(repository, "staff-1");

    await expect(effectiveRepository.findThing("thing-1")).resolves.toEqual({ id: "thing-1" });
    expect(platformRepository.createAuditEvent).not.toHaveBeenCalled();

    await expect(effectiveRepository.updateThing("thing-1")).resolves.toEqual({
      id: "thing-1",
      name: "Updated",
    });

    expect(platformRepository.createAuditEvent).toHaveBeenCalledWith({
      action: "platform.workspace.repository.update_thing",
      metadata: {
        method: "updateThing",
      },
      reason: "Support escalation",
      resourceId: "thing-1",
      resourceType: "tenant_repository_method",
      sessionId: "session-1",
      staffEmailSnapshot: "operator@argos.test",
      staffRoleSnapshot: "operator",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      targetOrgNameSnapshot: "Acme",
      targetOrgSlugSnapshot: "acme",
    });
  });
});
