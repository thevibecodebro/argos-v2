import { PLATFORM_SESSION_COOKIE_NAME } from "./effective-actor";
import type { PlatformStaffRole } from "./repository";

type CookieSource =
  | Map<string, string>
  | {
      get(name: string): { value?: string } | string | undefined;
    };

export type PlatformMutationAuditContext = {
  reason: string;
  sessionId: string;
  staffEmailSnapshot: string | null;
  staffRoleSnapshot: PlatformStaffRole | null;
  staffUserId: string;
  targetOrgId: string;
  targetOrgNameSnapshot: string | null;
  targetOrgSlugSnapshot: string | null;
};

export type PlatformMutationAuditRepository = {
  createAuditEvent(input: {
    action: string;
    metadata?: Record<string, unknown>;
    reason: string;
    resourceId?: string | null;
    resourceType: string;
    sessionId?: string | null;
    staffEmailSnapshot?: string | null;
    staffRoleSnapshot?: PlatformStaffRole | null;
    staffUserId?: string | null;
    targetOrgId?: string | null;
    targetOrgNameSnapshot?: string | null;
    targetOrgSlugSnapshot?: string | null;
  }): Promise<unknown>;
  findActiveAccessSession(sessionId: string, staffUserId: string): Promise<{
    id: string;
    reason: string;
    staffEmailSnapshot?: string | null;
    staffRoleSnapshot?: PlatformStaffRole | null;
    staffUserId: string | null;
    targetOrgId: string | null;
    targetOrgName?: string | null;
    targetOrgNameSnapshot?: string | null;
    targetOrgSlug?: string | null;
    targetOrgSlugSnapshot?: string | null;
  } | null>;
  findStaffByUserId(userId: string): Promise<{
    role: PlatformStaffRole;
    status: "active" | "revoked";
    userId: string;
  } | null>;
};

function getCookieValue(cookies: CookieSource, name: string) {
  const value = cookies instanceof Map ? cookies.get(name) : cookies.get(name);

  if (typeof value === "string") {
    return value.trim() || null;
  }

  return value?.value?.trim() || null;
}

export async function getPlatformMutationAuditContext(
  repository: PlatformMutationAuditRepository,
  input: {
    authUserId: string;
    cookies: CookieSource;
  },
): Promise<PlatformMutationAuditContext | null> {
  const sessionId = getCookieValue(input.cookies, PLATFORM_SESSION_COOKIE_NAME);

  if (!sessionId) {
    return null;
  }

  const staff = await repository.findStaffByUserId(input.authUserId);

  if (staff?.status !== "active") {
    return null;
  }

  const session = await repository.findActiveAccessSession(sessionId, input.authUserId);

  if (!session?.targetOrgId) {
    return null;
  }

  return {
    reason: session.reason,
    sessionId: session.id,
    staffEmailSnapshot: session.staffEmailSnapshot ?? null,
    staffRoleSnapshot: session.staffRoleSnapshot ?? staff.role,
    staffUserId: input.authUserId,
    targetOrgId: session.targetOrgId,
    targetOrgNameSnapshot: session.targetOrgName ?? session.targetOrgNameSnapshot ?? null,
    targetOrgSlugSnapshot: session.targetOrgSlug ?? session.targetOrgSlugSnapshot ?? null,
  };
}

export async function auditPlatformWorkspaceMutation(
  repository: PlatformMutationAuditRepository,
  context: PlatformMutationAuditContext | null,
  event: {
    action: string;
    metadata?: Record<string, unknown>;
    resourceId?: string | null;
    resourceType: string;
  },
) {
  if (!context) {
    return null;
  }

  return repository.createAuditEvent({
    action: event.action,
    metadata: event.metadata ?? {},
    reason: context.reason,
    resourceId: event.resourceId ?? null,
    resourceType: event.resourceType,
    sessionId: context.sessionId,
    staffEmailSnapshot: context.staffEmailSnapshot,
    staffRoleSnapshot: context.staffRoleSnapshot,
    staffUserId: context.staffUserId,
    targetOrgId: context.targetOrgId,
    targetOrgNameSnapshot: context.targetOrgNameSnapshot,
    targetOrgSlugSnapshot: context.targetOrgSlugSnapshot,
  });
}
