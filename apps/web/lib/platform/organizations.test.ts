import { describe, expect, it, vi } from "vitest";
import {
  createPlatformOrganizationWithAdminInvite,
  type PlatformOrganizationRepository,
} from "./organizations";

const createdAt = new Date("2026-06-11T10:00:00.000Z");
const expiresAt = new Date("2026-06-18T10:00:00.000Z");

const organization = {
  id: "org-1",
  name: "Acme",
  slug: "acme",
  plan: "trial",
  createdAt,
};

const invite = {
  id: "invite-1",
  orgId: "org-1",
  email: "admin@acme.com",
  role: "admin" as const,
  token: "invite-token-1",
  teamIds: null,
  expiresAt,
  acceptedAt: null,
  createdAt,
};

const auditEvent = {
  id: "audit-1",
  staffUserId: "staff-1",
  targetOrgId: "org-1",
  sessionId: null,
  staffEmailSnapshot: null,
  staffRoleSnapshot: null,
  targetOrgNameSnapshot: "Acme",
  targetOrgSlugSnapshot: "acme",
  action: "platform.organization.create",
  resourceType: "organization",
  resourceId: "org-1",
  reason: "Customer onboarding request",
  metadata: { initialAdminEmail: "admin@acme.com" },
  createdAt,
};

function createRepository(overrides: Partial<PlatformOrganizationRepository> = {}) {
  return {
    createOrganizationWithAdminInviteAndAudit: vi.fn().mockResolvedValue({
      auditEvent,
      invite,
      organization,
    }),
    findOrganizationBySlug: vi.fn().mockResolvedValue(null),
    ...overrides,
  } satisfies PlatformOrganizationRepository;
}

describe("createPlatformOrganizationWithAdminInvite", () => {
  it("requires a reason for platform writes", async () => {
    const repository = createRepository();

    await expect(
      createPlatformOrganizationWithAdminInvite(
        repository,
        { userId: "staff-1", role: "operator" },
        {
          adminEmail: "admin@acme.com",
          name: "Acme",
          reason: " ",
          slug: "acme",
        },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "reason is required",
    });

    expect(repository.findOrganizationBySlug).not.toHaveBeenCalled();
    expect(repository.createOrganizationWithAdminInviteAndAudit).not.toHaveBeenCalled();
  });

  it("rejects invalid initial admin email addresses", async () => {
    const repository = createRepository();

    await expect(
      createPlatformOrganizationWithAdminInvite(
        repository,
        { userId: "staff-1", role: "owner" },
        {
          adminEmail: "not-an-email",
          name: "Acme",
          reason: "Customer onboarding request",
          slug: "acme",
        },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "A valid initial admin email address is required",
    });

    expect(repository.findOrganizationBySlug).not.toHaveBeenCalled();
    expect(repository.createOrganizationWithAdminInviteAndAudit).not.toHaveBeenCalled();
  });

  it("rejects duplicate organization slugs", async () => {
    const repository = createRepository({
      findOrganizationBySlug: vi.fn().mockResolvedValue(organization),
    });

    await expect(
      createPlatformOrganizationWithAdminInvite(
        repository,
        { userId: "staff-1", role: "operator" },
        {
          adminEmail: "admin@acme.com",
          name: "Acme",
          reason: "Customer onboarding request",
          slug: "Acme",
        },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Organization slug already taken",
    });

    expect(repository.findOrganizationBySlug).toHaveBeenCalledWith("acme");
    expect(repository.createOrganizationWithAdminInviteAndAudit).not.toHaveBeenCalled();
  });

  it("creates an organization, initial admin invite, and audit event without attaching staff to the org", async () => {
    const repository = createRepository();

    await expect(
      createPlatformOrganizationWithAdminInvite(
        repository,
        { userId: "staff-1", role: "operator" },
        {
          adminEmail: " Admin@Acme.com ",
          name: " Acme ",
          plan: "team",
          reason: " Customer onboarding request ",
          slug: " Acme ",
        },
        {
          createToken: () => "invite-token-1",
          now: () => new Date("2026-06-11T10:00:00.000Z"),
        },
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        auditEvent,
        invite,
        organization,
      },
    });

    expect(repository.createOrganizationWithAdminInviteAndAudit).toHaveBeenCalledWith({
      adminEmail: "admin@acme.com",
      inviteExpiresAt: expiresAt,
      inviteToken: "invite-token-1",
      name: "Acme",
      plan: "team",
      reason: "Customer onboarding request",
      slug: "acme",
      staffUserId: "staff-1",
    });
    expect(repository.createOrganizationWithAdminInviteAndAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: "staff-1" }),
    );
  });
});
