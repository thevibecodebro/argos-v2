import type { PlatformStaffRole } from "./repository";

type PlatformSessionRecord = {
  id: string;
  staffUserId: string | null;
  targetOrgId: string | null;
  reason: string;
  status: "active" | "ended" | "expired";
  startedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
};

type PlatformAuditRecord = {
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
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export type PlatformSessionRepository = {
  createAccessSessionWithAuditEvent(input: {
    staffUserId: string;
    targetOrgId: string;
    reason: string;
    expiresAt: Date;
    audit: {
      action: string;
      resourceType: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    };
  }): Promise<{
    auditEvent: PlatformAuditRecord;
    session: PlatformSessionRecord;
  }>;
  endAccessSession(sessionId: string, staffUserId: string): Promise<boolean>;
};

type PlatformSessionActor = {
  userId: string;
  role: PlatformStaffRole;
};

type CreatePlatformSessionInput = {
  orgId?: unknown;
  reason?: unknown;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createPlatformSwitchSession(
  repository: PlatformSessionRepository,
  actor: PlatformSessionActor,
  input: CreatePlatformSessionInput,
  dependencies: { now?: () => Date } = {},
): Promise<
  PlatformServiceResult<{
    auditEvent: PlatformAuditRecord;
    session: PlatformSessionRecord;
  }>
> {
  if (actor.role !== "owner" && actor.role !== "operator") {
    return { ok: false, status: 403, error: "Platform operator access required" };
  }

  const orgId = getTrimmedString(input.orgId);

  if (!orgId) {
    return { ok: false, status: 400, error: "orgId is required" };
  }

  const reason = getTrimmedString(input.reason);

  if (!reason) {
    return { ok: false, status: 400, error: "reason is required" };
  }

  const now = dependencies.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const data = await repository.createAccessSessionWithAuditEvent({
    staffUserId: actor.userId,
    targetOrgId: orgId,
    reason,
    expiresAt,
    audit: {
      action: "platform.session.create",
      resourceType: "organization",
      resourceId: orgId,
      metadata: {},
    },
  });

  return {
    ok: true,
    data,
  };
}

export async function endPlatformSwitchSession(
  repository: PlatformSessionRepository,
  input: { sessionId?: string | null; staffUserId: string },
): Promise<PlatformServiceResult<{ ended: boolean }>> {
  const sessionId = input.sessionId?.trim();

  if (!sessionId) {
    return { ok: true, data: { ended: false } };
  }

  const ended = await repository.endAccessSession(sessionId, input.staffUserId);

  return {
    ok: true,
    data: { ended },
  };
}
