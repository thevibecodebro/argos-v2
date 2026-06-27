import { describe, expect, it, vi } from "vitest";
import { resendPlatformAdminInvite, type PlatformAdminInviteResendRepository } from "./admin-invite-resend";

const now = new Date("2026-06-25T15:00:00.000Z");
const expiresAt = new Date("2026-07-02T15:00:00.000Z");
const expiredAt = new Date("2026-06-24T15:00:00.000Z");

const organization = {
  createdAt: new Date("2026-06-20T15:00:00.000Z"),
  id: "org-1",
  name: "JDL Ventures",
  plan: "trial",
  slug: "jdlventures",
  status: "active" as const,
};

const invite = {
  acceptedAt: null,
  createdAt: new Date("2026-06-25T14:42:06.596Z"),
  email: "jason@jdlventures.com",
  expiresAt,
  id: "invite-1",
  orgId: "org-1",
  role: "admin" as const,
  teamIds: null,
  token: "server-only-token",
};

const auditEvent = {
  id: "audit-1",
  staffUserId: "staff-1",
  targetOrgId: "org-1",
  sessionId: null,
  staffEmailSnapshot: "operator@argos.ai",
  staffRoleSnapshot: "operator" as const,
  targetOrgNameSnapshot: "JDL Ventures",
  targetOrgSlugSnapshot: "jdlventures",
  action: "platform.organization.admin_invite.resend",
  resourceType: "invite",
  resourceId: "invite-1",
  reason: "Platform admin invite resend",
  metadata: {},
  createdAt: now,
};

function createRepository(
  overrides: Partial<PlatformAdminInviteResendRepository> = {},
): PlatformAdminInviteResendRepository {
  return {
    countAdminMembersForOrganization: vi.fn().mockResolvedValue(0),
    createAuditEvent: vi.fn().mockResolvedValue(auditEvent),
    extendInviteExpiration: vi.fn().mockResolvedValue(undefined),
    findLatestAdminInviteForOrganization: vi.fn().mockResolvedValue(invite),
    findOrganizationBySlug: vi.fn().mockResolvedValue(organization),
    ...overrides,
  };
}

describe("resendPlatformAdminInvite", () => {
  it("resends a pending admin invite without exposing token or action link", async () => {
    const repository = createRepository();
    const generateAuthInviteLink = vi.fn().mockResolvedValue("https://auth.example.com/invite-link");
    const sendInviteEmail = vi.fn().mockResolvedValue(undefined);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    const result = await resendPlatformAdminInvite(
      repository,
      {
        email: "operator@argos.ai",
        role: "operator",
        userId: "staff-1",
      },
      { slug: "jdlventures" },
      { generateAuthInviteLink, now: () => now, sendInviteEmail },
    );

    expect(result).toEqual({
      ok: true,
      data: {
        auditEvent,
        invite: {
          email: "jason@jdlventures.com",
          expiresAt,
          extended: false,
        },
      },
    });
    expect(repository.findOrganizationBySlug).toHaveBeenCalledWith("jdlventures");
    expect(repository.countAdminMembersForOrganization).toHaveBeenCalledWith("org-1");
    expect(generateAuthInviteLink).toHaveBeenCalledWith({
      email: "jason@jdlventures.com",
      redirectTo: "https://app.argos.ai/invite/server-only-token",
      metadata: {
        argosInviteToken: "server-only-token",
        argosOrganizationId: "org-1",
        argosRole: "admin",
      },
    });
    expect(sendInviteEmail).toHaveBeenCalledWith(
      "jason@jdlventures.com",
      "https://auth.example.com/invite-link",
      "JDL Ventures",
      "admin",
    );
    expect(repository.createAuditEvent).toHaveBeenCalledWith({
      action: "platform.organization.admin_invite.resend",
      metadata: {
        email: "jason@jdlventures.com",
        extended: false,
        expiresAt: expiresAt.toISOString(),
      },
      reason: "Platform admin invite resend",
      resourceId: "invite-1",
      resourceType: "invite",
      staffEmailSnapshot: "operator@argos.ai",
      staffRoleSnapshot: "operator",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      targetOrgNameSnapshot: "JDL Ventures",
      targetOrgSlugSnapshot: "jdlventures",
    });
    expect(JSON.stringify(result)).not.toContain("server-only-token");
    expect(JSON.stringify(result)).not.toContain("auth.example.com");
  });

  it("extends an expired pending admin invite before resending", async () => {
    const repository = createRepository({
      findLatestAdminInviteForOrganization: vi.fn().mockResolvedValue({
        ...invite,
        expiresAt: expiredAt,
      }),
    });

    const result = await resendPlatformAdminInvite(
      repository,
      { email: "operator@argos.ai", role: "operator", userId: "staff-1" },
      { slug: "jdlventures" },
      {
        generateAuthInviteLink: vi.fn().mockResolvedValue("https://auth.example.com/invite-link"),
        now: () => now,
        sendInviteEmail: vi.fn().mockResolvedValue(undefined),
      },
    );

    const nextExpiry = new Date("2026-07-02T15:00:00.000Z");

    expect(result.ok).toBe(true);
    expect(repository.extendInviteExpiration).toHaveBeenCalledWith("invite-1", nextExpiry);
    if (result.ok) {
      expect(result.data.invite).toEqual({
        email: "jason@jdlventures.com",
        expiresAt: nextExpiry,
        extended: true,
      });
    }
  });

  it("rejects resend when the organization already has an active admin", async () => {
    const repository = createRepository({
      countAdminMembersForOrganization: vi.fn().mockResolvedValue(1),
    });

    await expect(
      resendPlatformAdminInvite(
        repository,
        { email: "operator@argos.ai", role: "operator", userId: "staff-1" },
        { slug: "jdlventures" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Organization already has an active admin",
    });
    expect(repository.findLatestAdminInviteForOrganization).not.toHaveBeenCalled();
  });

  it("rejects resend when there is no pending admin invite", async () => {
    const repository = createRepository({
      findLatestAdminInviteForOrganization: vi.fn().mockResolvedValue(null),
    });

    await expect(
      resendPlatformAdminInvite(
        repository,
        { email: "operator@argos.ai", role: "operator", userId: "staff-1" },
        { slug: "jdlventures" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Pending admin invite not found",
    });
  });

  it("rejects archived organizations", async () => {
    const repository = createRepository({
      findOrganizationBySlug: vi.fn().mockResolvedValue({
        ...organization,
        status: "archived" as const,
      }),
    });

    await expect(
      resendPlatformAdminInvite(
        repository,
        { email: "operator@argos.ai", role: "operator", userId: "staff-1" },
        { slug: "jdlventures" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Organization not found",
    });
  });
});
