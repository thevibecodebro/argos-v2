import type { PlatformStaffRole } from "@/lib/platform/repository";
import type { AppUserRole } from "@/lib/users/roles";

export type OrganizationStatus = "active" | "archived";

export type ArchivableOrganization = {
  archivedAt: Date | null;
  archiveReason: string | null;
  createdAt: Date;
  id: string;
  name: string;
  plan: string;
  slug: string;
  status: OrganizationStatus;
};

type ArchiveAuditEvent = {
  id: string;
};

export type OrganizationArchiveResult = {
  archived: true;
  auditEvent: ArchiveAuditEvent;
  detachedUserCount: number;
  endedSessionCount: number;
  organization: ArchivableOrganization;
};

export type OrganizationArchiveRepository = {
  findOrganizationForArchive(orgId: string): Promise<ArchivableOrganization | null>;
  archiveOrganizationWithAudit(input: {
    action: "organization.archive" | "platform.organization.archive";
    archivedAt: Date;
    archivedBy: string;
    actor: {
      email?: string | null;
      kind: "organization" | "platform";
      role: AppUserRole | PlatformStaffRole;
      userId: string;
    };
    metadata: Record<string, unknown>;
    organization: ArchivableOrganization;
    reason: string;
  }): Promise<OrganizationArchiveResult>;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

type PlatformArchiveActor = {
  email?: string | null;
  role: PlatformStaffRole;
  userId: string;
};

type CurrentAdminArchiveActor = {
  email?: string | null;
  orgId: string | null;
  role: AppUserRole | null;
  userId: string;
};

type ArchiveInput = {
  confirmationSlug?: unknown;
  orgId?: unknown;
  reason?: unknown;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function archiveOrganization(
  repository: OrganizationArchiveRepository,
  input: {
    action: "organization.archive" | "platform.organization.archive";
    actor: {
      email?: string | null;
      kind: "organization" | "platform";
      role: AppUserRole | PlatformStaffRole;
      userId: string;
    };
    confirmationSlug?: unknown;
    metadata: Record<string, unknown>;
    orgId: string;
    reason?: unknown;
  },
  dependencies: { now?: () => Date } = {},
): Promise<ServiceResult<OrganizationArchiveResult>> {
  const reason = getTrimmedString(input.reason);

  if (!reason) {
    return { ok: false, status: 400, error: "reason is required" };
  }

  const organization = await repository.findOrganizationForArchive(input.orgId);

  if (!organization) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  if (organization.status === "archived") {
    return { ok: false, status: 409, error: "Organization is already archived" };
  }

  const confirmationSlug = getTrimmedString(input.confirmationSlug);

  if (confirmationSlug !== organization.slug) {
    return {
      ok: false,
      status: 400,
      error: "confirmationSlug must match the organization slug",
    };
  }

  const data = await repository.archiveOrganizationWithAudit({
    action: input.action,
    archivedAt: dependencies.now?.() ?? new Date(),
    archivedBy: input.actor.userId,
    actor: input.actor,
    metadata: input.metadata,
    organization,
    reason,
  });

  return { ok: true, data };
}

export function archiveOrganizationForPlatform(
  repository: OrganizationArchiveRepository,
  actor: PlatformArchiveActor,
  input: ArchiveInput,
  dependencies: { now?: () => Date } = {},
) {
  const orgId = getTrimmedString(input.orgId);

  if (!orgId) {
    return Promise.resolve({ ok: false as const, status: 400 as const, error: "orgId is required" });
  }

  return archiveOrganization(
    repository,
    {
      action: "platform.organization.archive",
      actor: {
        email: actor.email ?? null,
        kind: "platform",
        role: actor.role,
        userId: actor.userId,
      },
      confirmationSlug: input.confirmationSlug,
      metadata: {
        actorKind: "platform",
        platformRole: actor.role,
      },
      orgId,
      reason: input.reason,
    },
    dependencies,
  );
}

export function archiveOrganizationForCurrentAdmin(
  repository: OrganizationArchiveRepository,
  actor: CurrentAdminArchiveActor,
  input: Omit<ArchiveInput, "orgId">,
  dependencies: { now?: () => Date } = {},
) {
  if (actor.role !== "admin") {
    return Promise.resolve({
      ok: false as const,
      status: 403 as const,
      error: "Only organization admins can archive organizations",
    });
  }

  if (!actor.orgId) {
    return Promise.resolve({
      ok: false as const,
      status: 400 as const,
      error: "You are not part of an organization",
    });
  }

  return archiveOrganization(
    repository,
    {
      action: "organization.archive",
      actor: {
        email: actor.email ?? null,
        kind: "organization",
        role: actor.role,
        userId: actor.userId,
      },
      confirmationSlug: input.confirmationSlug,
      metadata: {
        actorKind: "organization",
      },
      orgId: actor.orgId,
      reason: input.reason,
    },
    dependencies,
  );
}
