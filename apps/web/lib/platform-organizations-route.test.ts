import { beforeEach, describe, expect, it, vi } from "vitest";

const createPlatformRepository = vi.fn();
const createPlatformOrganizationWithAdminInvite = vi.fn();
const getPlatformApiAccess = vi.fn();

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/auth", () => ({
  getPlatformApiAccess,
}));

vi.mock("@/lib/platform/organizations", () => ({
  createPlatformOrganizationWithAdminInvite,
}));

describe("platform organizations route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createPlatformRepository.mockReset();
    createPlatformOrganizationWithAdminInvite.mockReset();
    getPlatformApiAccess.mockReset();

    createPlatformRepository.mockReturnValue({ name: "platform-repository" });
    getPlatformApiAccess.mockResolvedValue({
      ok: true,
      staff: {
        userId: "staff-1",
        role: "operator",
        status: "active",
      },
      user: {
        id: "staff-1",
        email: "operator@argos.ai",
      },
    });
    createPlatformOrganizationWithAdminInvite.mockResolvedValue({
      ok: true,
      data: {
        auditEvent: { id: "audit-1" },
        invite: {
          acceptedAt: null,
          createdAt: new Date("2026-06-11T12:00:00.000Z"),
          email: "admin@acme.com",
          expiresAt: new Date("2026-06-18T12:00:00.000Z"),
          id: "invite-1",
          orgId: "org-1",
          role: "admin",
          teamIds: null,
          token: "server-only-token",
        },
        organization: { id: "org-1" },
      },
    });
  });

  it("denies nonstaff platform organization creation", async () => {
    getPlatformApiAccess.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Platform access required",
    });

    const route = await import("../app/api/platform/organizations/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/organizations", {
        method: "POST",
        body: JSON.stringify({
          adminEmail: "admin@acme.com",
          name: "Acme",
          reason: "Customer onboarding request",
          slug: "acme",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Platform access required",
    });
    expect(createPlatformOrganizationWithAdminInvite).not.toHaveBeenCalled();
  });

  it("delegates valid platform organization creation to the service", async () => {
    const route = await import("../app/api/platform/organizations/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/organizations", {
        method: "POST",
        body: JSON.stringify({
          adminEmail: "admin@acme.com",
          name: "Acme",
          reason: "Customer onboarding request",
          slug: "acme",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      auditEvent: { id: "audit-1" },
      invite: {
        acceptedAt: null,
        createdAt: "2026-06-11T12:00:00.000Z",
        email: "admin@acme.com",
        expiresAt: "2026-06-18T12:00:00.000Z",
        id: "invite-1",
        orgId: "org-1",
        role: "admin",
        teamIds: null,
      },
      organization: { id: "org-1" },
    });
    expect(JSON.stringify(body)).not.toContain("server-only-token");
    expect(createPlatformOrganizationWithAdminInvite).toHaveBeenCalledWith(
      { name: "platform-repository" },
      { role: "operator", userId: "staff-1" },
      {
        adminEmail: "admin@acme.com",
        name: "Acme",
        reason: "Customer onboarding request",
        slug: "acme",
      },
    );
  });
});
