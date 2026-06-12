import { randomUUID } from "node:crypto";
import type { PlatformStaffRole } from "./repository";

type PlatformOrganization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
};

type PlatformInvite = {
  id: string;
  orgId: string;
  email: string;
  role: "admin" | "executive" | "manager" | "rep";
  token: string;
  teamIds: string[] | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

type PlatformAuditEvent = {
  id: string;
  staffUserId: string | null;
  targetOrgId: string | null;
  sessionId: string | null;
  staffEmailSnapshot: string | null;
  staffRoleSnapshot: PlatformStaffRole | null;
  targetOrgNameSnapshot: string | null;
  targetOrgSlugSnapshot: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

type PlatformServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 409; error: string };

export type PlatformOrganizationActor = {
  userId: string;
  role: PlatformStaffRole;
};

export type PlatformOrganizationRepository = {
  findOrganizationBySlug(slug: string): Promise<PlatformOrganization | null>;
  createOrganizationWithAdminInviteAndAudit(input: {
    name: string;
    slug: string;
    plan: string;
    adminEmail: string;
    inviteToken: string;
    inviteExpiresAt: Date;
    staffUserId: string;
    reason: string;
  }): Promise<{
    organization: PlatformOrganization;
    invite: PlatformInvite;
    auditEvent: PlatformAuditEvent;
  }>;
};

type CreatePlatformOrganizationInput = {
  name?: unknown;
  slug?: unknown;
  plan?: unknown;
  adminEmail?: unknown;
  reason?: unknown;
};

type CreatePlatformOrganizationDependencies = {
  createToken?: () => string;
  now?: () => Date;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSlug(slug: string): string | null {
  if (!slug) {
    return "slug is required";
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "slug must only contain lowercase letters, numbers, and hyphens";
  }

  return null;
}

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createPlatformOrganizationWithAdminInvite(
  repository: PlatformOrganizationRepository,
  actor: PlatformOrganizationActor,
  input: CreatePlatformOrganizationInput,
  dependencies: CreatePlatformOrganizationDependencies = {},
): Promise<
  PlatformServiceResult<{
    organization: PlatformOrganization;
    invite: PlatformInvite;
    auditEvent: PlatformAuditEvent;
  }>
> {
  if (actor.role !== "owner" && actor.role !== "operator") {
    return { ok: false, status: 403, error: "Platform operator access required" };
  }

  const reason = getTrimmedString(input.reason);

  if (!reason) {
    return { ok: false, status: 400, error: "reason is required" };
  }

  const name = getTrimmedString(input.name);

  if (!name) {
    return { ok: false, status: 400, error: "name is required" };
  }

  const slug = getTrimmedString(input.slug).toLowerCase();
  const slugError = validateSlug(slug);

  if (slugError) {
    return { ok: false, status: 400, error: slugError };
  }

  const adminEmail = normalizeEmail(getTrimmedString(input.adminEmail));

  if (!adminEmail || !isValidEmail(adminEmail)) {
    return {
      ok: false,
      status: 400,
      error: "A valid initial admin email address is required",
    };
  }

  const existing = await repository.findOrganizationBySlug(slug);

  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "Organization slug already taken",
    };
  }

  const now = dependencies.now?.() ?? new Date();
  const inviteExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const plan = getTrimmedString(input.plan) || "trial";

  const data = await repository.createOrganizationWithAdminInviteAndAudit({
    adminEmail,
    inviteExpiresAt,
    inviteToken: dependencies.createToken?.() ?? randomUUID(),
    name,
    plan,
    reason,
    slug,
    staffUserId: actor.userId,
  });

  return {
    ok: true,
    data,
  };
}
