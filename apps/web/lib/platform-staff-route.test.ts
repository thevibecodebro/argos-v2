import { beforeEach, describe, expect, it, vi } from "vitest";

const createPlatformRepository = vi.fn();
const getPlatformApiAccess = vi.fn();
const grantPlatformStaffAccess = vi.fn();
const revokePlatformStaffAccess = vi.fn();

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/auth", () => ({
  getPlatformApiAccess,
}));

vi.mock("@/lib/platform/staff", () => ({
  grantPlatformStaffAccess,
  revokePlatformStaffAccess,
}));

describe("platform staff route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createPlatformRepository.mockReset();
    getPlatformApiAccess.mockReset();
    grantPlatformStaffAccess.mockReset();
    revokePlatformStaffAccess.mockReset();

    createPlatformRepository.mockReturnValue({ name: "platform-repository" });
    getPlatformApiAccess.mockResolvedValue({
      ok: true,
      staff: {
        role: "owner",
        status: "active",
        userId: "owner-1",
      },
      user: {
        email: "owner@argos.test",
        id: "owner-1",
      },
    });
    grantPlatformStaffAccess.mockResolvedValue({
      ok: true,
      data: {
        auditEvent: { id: "audit-1" },
        staff: { userId: "staff-2" },
      },
    });
    revokePlatformStaffAccess.mockResolvedValue({
      ok: true,
      data: {
        auditEvent: { id: "audit-2" },
        revoked: true,
      },
    });
  });

  it("denies nonstaff access before staff mutations", async () => {
    getPlatformApiAccess.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Platform access required",
    });

    const route = await import("../app/api/platform/staff/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/staff", {
        body: JSON.stringify({
          email: "operator@argos.test",
          reason: "SOC coverage",
          role: "operator",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Platform access required",
    });
    expect(grantPlatformStaffAccess).not.toHaveBeenCalled();
  });

  it("delegates staff grants to the owner-only service", async () => {
    const route = await import("../app/api/platform/staff/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/staff", {
        body: JSON.stringify({
          email: "operator@argos.test",
          reason: "SOC coverage",
          role: "operator",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      auditEvent: { id: "audit-1" },
      staff: { userId: "staff-2" },
    });
    expect(grantPlatformStaffAccess).toHaveBeenCalledWith(
      { name: "platform-repository" },
      {
        email: "owner@argos.test",
        role: "owner",
        userId: "owner-1",
      },
      {
        email: "operator@argos.test",
        reason: "SOC coverage",
        role: "operator",
      },
    );
  });

  it("delegates staff revocation to the owner-only service", async () => {
    const route = await import("../app/api/platform/staff/route");
    const response = await route.DELETE(
      new Request("http://localhost:3000/api/platform/staff", {
        body: JSON.stringify({
          reason: "Offboarded",
          userId: "staff-2",
        }),
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      auditEvent: { id: "audit-2" },
      revoked: true,
    });
    expect(revokePlatformStaffAccess).toHaveBeenCalledWith(
      { name: "platform-repository" },
      {
        email: "owner@argos.test",
        role: "owner",
        userId: "owner-1",
      },
      {
        reason: "Offboarded",
        userId: "staff-2",
      },
    );
  });
});
