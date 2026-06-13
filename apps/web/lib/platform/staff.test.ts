import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  grantPlatformStaffAccess,
  revokePlatformStaffAccess,
} from "./staff";

const owner = {
  email: "owner@argos.test",
  role: "owner" as const,
  userId: "owner-1",
};

function createRepository() {
  return {
    createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
    findStaffByUserId: vi.fn(),
    findUserByEmail: vi.fn(),
    revokeStaff: vi.fn().mockResolvedValue(true),
    upsertStaff: vi.fn(),
  };
}

describe("platform staff management service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants owner-audited platform staff access to orgless users", async () => {
    const repository = createRepository();
    const createdAt = new Date("2026-06-11T12:00:00.000Z");
    repository.findUserByEmail.mockResolvedValue({
      email: "operator@argos.test",
      id: "staff-2",
      orgId: null,
    });
    repository.upsertStaff.mockResolvedValue({
      createdAt,
      createdBy: "owner-1",
      revokedAt: null,
      revokedBy: null,
      role: "operator",
      status: "active",
      updatedAt: createdAt,
      userId: "staff-2",
    });

    await expect(
      grantPlatformStaffAccess(repository, owner, {
        email: " Operator@Argos.Test ",
        reason: "SOC coverage",
        role: "operator",
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        auditEvent: { id: "audit-1" },
        staff: {
          email: "operator@argos.test",
          role: "operator",
          status: "active",
          userId: "staff-2",
        },
      },
    });
    expect(repository.findUserByEmail).toHaveBeenCalledWith("operator@argos.test");
    expect(repository.upsertStaff).toHaveBeenCalledWith({
      createdBy: "owner-1",
      role: "operator",
      status: "active",
      userId: "staff-2",
    });
    expect(repository.createAuditEvent).toHaveBeenCalledWith({
      action: "platform.staff.grant",
      metadata: {
        targetEmail: "operator@argos.test",
        targetRole: "operator",
      },
      reason: "SOC coverage",
      resourceId: "staff-2",
      resourceType: "platform_staff",
      staffEmailSnapshot: "owner@argos.test",
      staffRoleSnapshot: "owner",
      staffUserId: "owner-1",
    });
  });

  it("rejects staff grants for users attached to an organization", async () => {
    const repository = createRepository();
    repository.findUserByEmail.mockResolvedValue({
      email: "admin@customer.test",
      id: "user-1",
      orgId: "org-1",
    });

    await expect(
      grantPlatformStaffAccess(repository, owner, {
        email: "admin@customer.test",
        reason: "Support",
        role: "operator",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Platform staff users must not belong to an organization",
    });
    expect(repository.upsertStaff).not.toHaveBeenCalled();
    expect(repository.createAuditEvent).not.toHaveBeenCalled();
  });

  it("requires owner role and reason for staff grants", async () => {
    const repository = createRepository();

    await expect(
      grantPlatformStaffAccess(
        repository,
        { ...owner, role: "operator" },
        { email: "operator@argos.test", reason: "Support", role: "operator" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Platform owner access required",
    });

    await expect(
      grantPlatformStaffAccess(repository, owner, {
        email: "operator@argos.test",
        reason: "",
        role: "operator",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "reason is required",
    });
  });

  it("revokes platform staff with owner audit and self-revoke protection", async () => {
    const repository = createRepository();
    const createdAt = new Date("2026-06-11T12:00:00.000Z");
    repository.findStaffByUserId.mockResolvedValue({
      createdAt,
      createdBy: "owner-1",
      revokedAt: null,
      revokedBy: null,
      role: "operator",
      status: "active",
      updatedAt: createdAt,
      userId: "staff-2",
    });

    await expect(
      revokePlatformStaffAccess(repository, owner, {
        reason: "Offboarded",
        userId: "staff-2",
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        auditEvent: { id: "audit-1" },
        revoked: true,
      },
    });
    expect(repository.revokeStaff).toHaveBeenCalledWith({
      revokedBy: "owner-1",
      userId: "staff-2",
    });
    expect(repository.createAuditEvent).toHaveBeenCalledWith({
      action: "platform.staff.revoke",
      metadata: {
        targetRole: "operator",
        targetStatus: "active",
      },
      reason: "Offboarded",
      resourceId: "staff-2",
      resourceType: "platform_staff",
      staffEmailSnapshot: "owner@argos.test",
      staffRoleSnapshot: "owner",
      staffUserId: "owner-1",
    });

    await expect(
      revokePlatformStaffAccess(repository, owner, {
        reason: "Self revoke",
        userId: "owner-1",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Owners cannot revoke their own platform access",
    });
  });
});
