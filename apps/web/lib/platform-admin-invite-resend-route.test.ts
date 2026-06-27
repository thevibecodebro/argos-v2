import { beforeEach, describe, expect, it, vi } from "vitest";

const createPlatformRepository = vi.fn();
const getPlatformApiAccess = vi.fn();
const resendPlatformAdminInvite = vi.fn();

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/auth", () => ({
  getPlatformApiAccess,
}));

vi.mock("@/lib/platform/admin-invite-resend", () => ({
  resendPlatformAdminInvite,
}));

describe("platform admin invite resend route", () => {
  beforeEach(() => {
    vi.resetModules();
    createPlatformRepository.mockReset();
    getPlatformApiAccess.mockReset();
    resendPlatformAdminInvite.mockReset();

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
    resendPlatformAdminInvite.mockResolvedValue({
      ok: true,
      data: {
        auditEvent: { id: "audit-1" },
        invite: {
          email: "admin@acme.com",
          expiresAt: new Date("2026-07-02T15:00:00.000Z"),
          extended: false,
        },
      },
    });
  });

  it("denies nonstaff platform admin invite resend", async () => {
    getPlatformApiAccess.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Platform access required",
    });

    const route = await import("../app/api/platform/organizations/[slug]/admin-invite/resend/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/organizations/acme/admin-invite/resend", {
        method: "POST",
      }),
      { params: Promise.resolve({ slug: "acme" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Platform access required",
    });
    expect(resendPlatformAdminInvite).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated platform admin invite resend", async () => {
    getPlatformApiAccess.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const route = await import("../app/api/platform/organizations/[slug]/admin-invite/resend/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/organizations/acme/admin-invite/resend", {
        method: "POST",
      }),
      { params: Promise.resolve({ slug: "acme" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(resendPlatformAdminInvite).not.toHaveBeenCalled();
  });


  it("delegates resend to active platform staff and returns safe invite JSON", async () => {
    const route = await import("../app/api/platform/organizations/[slug]/admin-invite/resend/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/organizations/acme/admin-invite/resend", {
        method: "POST",
      }),
      { params: Promise.resolve({ slug: "acme" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      auditEvent: { id: "audit-1" },
      invite: {
        email: "admin@acme.com",
        expiresAt: "2026-07-02T15:00:00.000Z",
        extended: false,
      },
    });
    expect(JSON.stringify(body)).not.toContain("token");
    expect(JSON.stringify(body)).not.toContain("auth");
    expect(resendPlatformAdminInvite).toHaveBeenCalledWith(
      { name: "platform-repository" },
      {
        email: "operator@argos.ai",
        role: "operator",
        userId: "staff-1",
      },
      { slug: "acme" },
    );
  });
});
