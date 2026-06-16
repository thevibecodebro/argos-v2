import type { PlatformStaffRole } from "./repository";
import { isTrustedPlatformOwnerEmail } from "./trusted-owner";

type PlatformStaffRecord = {
  createdAt: Date;
  createdBy: string | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  role: PlatformStaffRole;
  status: "active" | "revoked";
  updatedAt: Date;
  userId: string;
};

type PlatformUserLookup = {
  email: string;
  id: string;
  orgId: string | null;
};

type PlatformAuditRecord = {
  id: string;
};

type PlatformServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export type PlatformStaffActor = {
  email: string | null | undefined;
  role: PlatformStaffRole;
  userId: string;
};

export type PlatformStaffManagementRepository = {
  createAuditEvent(input: {
    action: string;
    metadata?: Record<string, unknown>;
    reason: string;
    resourceId?: string | null;
    resourceType: string;
    staffEmailSnapshot?: string | null;
    staffRoleSnapshot?: PlatformStaffRole | null;
    staffUserId?: string | null;
  }): Promise<PlatformAuditRecord>;
  findStaffByUserId(userId: string): Promise<PlatformStaffRecord | null>;
  findUserByEmail(email: string): Promise<PlatformUserLookup | null>;
  revokeStaff(input: {
    revokedBy: string | null;
    userId: string;
  }): Promise<boolean>;
  upsertStaff(input: {
    createdBy?: string | null;
    role: PlatformStaffRole;
    status?: "active" | "revoked";
    userId: string;
  }): Promise<PlatformStaffRecord>;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRole(value: unknown): PlatformStaffRole | null {
  return value === "owner" || value === "operator" ? value : null;
}

function requireOwner(actor: PlatformStaffActor): PlatformServiceResult<never> | null {
  if (actor.role !== "owner") {
    return { ok: false, status: 403, error: "Platform owner access required" };
  }

  return null;
}

function requireReason(value: unknown): PlatformServiceResult<never> | string {
  const reason = getTrimmedString(value);

  if (!reason) {
    return { ok: false, status: 400, error: "reason is required" };
  }

  return reason;
}

export async function grantPlatformStaffAccess(
  repository: PlatformStaffManagementRepository,
  actor: PlatformStaffActor,
  input: {
    email?: unknown;
    reason?: unknown;
    role?: unknown;
  },
): Promise<PlatformServiceResult<{ auditEvent: PlatformAuditRecord; staff: PlatformStaffRecord & { email: string } }>> {
  const ownerError = requireOwner(actor);

  if (ownerError) {
    return ownerError;
  }

  const reason = requireReason(input.reason);

  if (typeof reason !== "string") {
    return reason;
  }

  const email = normalizeEmail(getTrimmedString(input.email));

  if (!email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "A valid staff email address is required" };
  }

  const role = parseRole(input.role);

  if (!role) {
    return { ok: false, status: 400, error: "role must be owner or operator" };
  }

  const targetUser = await repository.findUserByEmail(email);

  if (!targetUser) {
    return { ok: false, status: 404, error: "User must sign in before platform access can be granted" };
  }

  const trustedOrganizationAttachedOwner =
    role === "owner" && isTrustedPlatformOwnerEmail(targetUser.email);

  if (targetUser.orgId && !trustedOrganizationAttachedOwner) {
    return { ok: false, status: 409, error: "Platform staff users must not belong to an organization" };
  }

  const staff = await repository.upsertStaff({
    createdBy: actor.userId,
    role,
    status: "active",
    userId: targetUser.id,
  });
  const auditEvent = await repository.createAuditEvent({
    action: "platform.staff.grant",
    metadata: {
      targetEmail: targetUser.email,
      targetRole: role,
    },
    reason,
    resourceId: targetUser.id,
    resourceType: "platform_staff",
    staffEmailSnapshot: actor.email ?? null,
    staffRoleSnapshot: actor.role,
    staffUserId: actor.userId,
  });

  return {
    ok: true,
    data: {
      auditEvent,
      staff: {
        ...staff,
        email: targetUser.email,
      },
    },
  };
}

export async function revokePlatformStaffAccess(
  repository: PlatformStaffManagementRepository,
  actor: PlatformStaffActor,
  input: {
    reason?: unknown;
    userId?: unknown;
  },
): Promise<PlatformServiceResult<{ auditEvent: PlatformAuditRecord; revoked: boolean }>> {
  const ownerError = requireOwner(actor);

  if (ownerError) {
    return ownerError;
  }

  const reason = requireReason(input.reason);

  if (typeof reason !== "string") {
    return reason;
  }

  const userId = getTrimmedString(input.userId);

  if (!userId) {
    return { ok: false, status: 400, error: "userId is required" };
  }

  if (userId === actor.userId) {
    return { ok: false, status: 409, error: "Owners cannot revoke their own platform access" };
  }

  const existing = await repository.findStaffByUserId(userId);

  if (!existing) {
    return { ok: false, status: 404, error: "Platform staff user not found" };
  }

  const revoked = await repository.revokeStaff({
    revokedBy: actor.userId,
    userId,
  });
  const auditEvent = await repository.createAuditEvent({
    action: "platform.staff.revoke",
    metadata: {
      targetRole: existing.role,
      targetStatus: existing.status,
    },
    reason,
    resourceId: userId,
    resourceType: "platform_staff",
    staffEmailSnapshot: actor.email ?? null,
    staffRoleSnapshot: actor.role,
    staffUserId: actor.userId,
  });

  return {
    ok: true,
    data: {
      auditEvent,
      revoked,
    },
  };
}
