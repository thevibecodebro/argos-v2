import { describe, expect, it, vi } from "vitest";
import {
  archiveOrganizationForCurrentAdmin,
  archiveOrganizationForPlatform,
  type OrganizationArchiveRepository,
} from "./archive";

const createdAt = new Date("2026-06-11T10:00:00.000Z");
const archivedAt = new Date("2026-06-25T10:00:00.000Z");

const activeOrganization = {
  archivedAt: null,
  archiveReason: null,
  id: "org-1",
  name: "Acme",
  plan: "trial",
  slug: "acme",
  status: "active" as const,
  createdAt,
};

const archivedOrganization = {
  ...activeOrganization,
  archivedAt,
  archiveReason: "Duplicate customer workspace",
  status: "archived" as const,
};

const archiveResult = {
  archived: true as const,
  auditEvent: { id: "audit-1" },
  detachedUserCount: 3,
  endedSessionCount: 2,
  organization: archivedOrganization,
};

function createRepository(overrides: Partial<OrganizationArchiveRepository> = {}) {
  return {
    archiveOrganizationWithAudit: vi.fn().mockResolvedValue(archiveResult),
    findOrganizationForArchive: vi.fn().mockResolvedValue(activeOrganization),
    ...overrides,
  } satisfies OrganizationArchiveRepository;
}

describe("archiveOrganizationForPlatform", () => {
  it("requires a reason and matching confirmation slug", async () => {
    const repository = createRepository();

    await expect(
      archiveOrganizationForPlatform(
        repository,
        { email: "operator@argos.test", role: "operator", userId: "staff-1" },
        { confirmationSlug: "acme", orgId: "org-1", reason: " " },
      ),
    ).resolves.toEqual({ ok: false, status: 400, error: "reason is required" });

    await expect(
      archiveOrganizationForPlatform(
        repository,
        { email: "operator@argos.test", role: "operator", userId: "staff-1" },
        { confirmationSlug: "wrong", orgId: "org-1", reason: "Duplicate workspace" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "confirmationSlug must match the organization slug",
    });

    expect(repository.archiveOrganizationWithAudit).not.toHaveBeenCalled();
  });

  it("allows platform owners and operators to archive active organizations", async () => {
    const ownerRepository = createRepository();
    const operatorRepository = createRepository();

    await expect(
      archiveOrganizationForPlatform(
        ownerRepository,
        { email: "owner@argos.test", role: "owner", userId: "owner-1" },
        { confirmationSlug: "acme", orgId: "org-1", reason: "Duplicate workspace" },
        { now: () => archivedAt },
      ),
    ).resolves.toEqual({ ok: true, data: archiveResult });

    await expect(
      archiveOrganizationForPlatform(
        operatorRepository,
        { email: "operator@argos.test", role: "operator", userId: "operator-1" },
        { confirmationSlug: "acme", orgId: "org-1", reason: "Duplicate workspace" },
        { now: () => archivedAt },
      ),
    ).resolves.toEqual({ ok: true, data: archiveResult });

    expect(ownerRepository.archiveOrganizationWithAudit).toHaveBeenCalledWith({
      action: "platform.organization.archive",
      archivedAt,
      archivedBy: "owner-1",
      actor: {
        email: "owner@argos.test",
        kind: "platform",
        role: "owner",
        userId: "owner-1",
      },
      metadata: {
        actorKind: "platform",
        platformRole: "owner",
      },
      organization: activeOrganization,
      reason: "Duplicate workspace",
    });
    expect(operatorRepository.archiveOrganizationWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform.organization.archive",
        actor: {
          email: "operator@argos.test",
          kind: "platform",
          role: "operator",
          userId: "operator-1",
        },
      }),
    );
  });

  it("rejects organizations that are already archived", async () => {
    const repository = createRepository({
      findOrganizationForArchive: vi.fn().mockResolvedValue(archivedOrganization),
    });

    await expect(
      archiveOrganizationForPlatform(
        repository,
        { email: "operator@argos.test", role: "operator", userId: "staff-1" },
        { confirmationSlug: "acme", orgId: "org-1", reason: "Duplicate workspace" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Organization is already archived",
    });
  });
});

describe("archiveOrganizationForCurrentAdmin", () => {
  it("allows org admins to archive their own organization", async () => {
    const repository = createRepository();

    await expect(
      archiveOrganizationForCurrentAdmin(
        repository,
        {
          email: "admin@acme.test",
          orgId: "org-1",
          role: "admin",
          userId: "admin-1",
        },
        { confirmationSlug: "acme", reason: "Closing account" },
        { now: () => archivedAt },
      ),
    ).resolves.toEqual({ ok: true, data: archiveResult });

    expect(repository.archiveOrganizationWithAudit).toHaveBeenCalledWith({
      action: "organization.archive",
      archivedAt,
      archivedBy: "admin-1",
      actor: {
        email: "admin@acme.test",
        kind: "organization",
        role: "admin",
        userId: "admin-1",
      },
      metadata: {
        actorKind: "organization",
      },
      organization: activeOrganization,
      reason: "Closing account",
    });
  });

  it("rejects non-admin users", async () => {
    const repository = createRepository();

    await expect(
      archiveOrganizationForCurrentAdmin(
        repository,
        {
          email: "manager@acme.test",
          orgId: "org-1",
          role: "manager",
          userId: "manager-1",
        },
        { confirmationSlug: "acme", reason: "Closing account" },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Only organization admins can archive organizations",
    });

    expect(repository.findOrganizationForArchive).not.toHaveBeenCalled();
  });
});
