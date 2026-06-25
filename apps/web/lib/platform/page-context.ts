import { cookies } from "next/headers";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
  PlatformConsoleStaffMember,
  PlatformRecentSession,
} from "@/components/platform/platform-types";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { getPlatformSessionCookieValue } from "@/lib/platform/effective-actor";

export async function getPlatformPageContext({ pathname }: { pathname: string }) {
  const { staff, user } = await requirePlatformStaffAccess({ pathname });
  const repository = createPlatformRepository();
  const cookieStore = await cookies();
  const activeSessionId = getPlatformSessionCookieValue(cookieStore);
  const activeSession = activeSessionId
    ? await repository.findActiveAccessSession(activeSessionId, staff.userId)
    : null;

  return {
    activeSession: activeSession ? serializeActivePlatformSession(activeSession) : null,
    currentUserEmail: user.email ?? user.id,
    repository,
    staff,
    user,
  };
}

export function serializeDate(value: Date) {
  return value.toISOString();
}

export function serializeOrganization(
  organization: {
    archivedAt?: Date | null;
    createdAt: Date;
    id: string;
    name: string;
    plan: string;
    slug: string;
    status?: "active" | "archived";
  },
): PlatformConsoleOrganization {
  return {
    archivedAt: organization.archivedAt ? serializeDate(organization.archivedAt) : null,
    createdAt: serializeDate(organization.createdAt),
    id: organization.id,
    name: organization.name,
    plan: organization.plan,
    slug: organization.slug,
    status: organization.status ?? "active",
  };
}

export function serializeStaffMember(
  member: {
    createdAt: Date;
    email: string | null;
    role: "owner" | "operator";
    status: "active" | "revoked";
    updatedAt: Date;
    userId: string;
  },
): PlatformConsoleStaffMember {
  return {
    createdAt: serializeDate(member.createdAt),
    email: member.email,
    role: member.role,
    status: member.status,
    updatedAt: serializeDate(member.updatedAt),
    userId: member.userId,
  };
}

export function serializeRecentSession(
  session: {
    endedAt: Date | null;
    expiresAt: Date;
    id: string;
    reason: string;
    staffEmailSnapshot: string | null;
    startedAt: Date;
    status: "active" | "ended" | "expired";
    targetOrgNameSnapshot: string | null;
    targetOrgSlugSnapshot: string | null;
  },
  now = new Date(),
): PlatformRecentSession {
  return {
    endedAt: session.endedAt ? serializeDate(session.endedAt) : null,
    expiresAt: serializeDate(session.expiresAt),
    id: session.id,
    reason: session.reason,
    staffEmailSnapshot: session.staffEmailSnapshot,
    startedAt: serializeDate(session.startedAt),
    status: normalizeRecentSessionStatus(session, now),
    targetOrgName: session.targetOrgNameSnapshot ?? "Customer organization",
    targetOrgSlug: session.targetOrgSlugSnapshot ?? "customer",
  };
}

function normalizeRecentSessionStatus(
  session: {
    endedAt: Date | null;
    expiresAt: Date;
    status: "active" | "ended" | "expired";
  },
  now: Date,
): "active" | "ended" | "expired" {
  if (session.status === "active") {
    if (session.endedAt) {
      return "ended";
    }

    if (session.expiresAt <= now) {
      return "expired";
    }
  }

  return session.status;
}

export function serializeActivePlatformSession(activeSession: {
  expiresAt: Date;
  id: string;
  reason: string;
  targetOrgId: string | null;
  targetOrgName?: string | null;
  targetOrgNameSnapshot: string | null;
  targetOrgSlug?: string | null;
  targetOrgSlugSnapshot: string | null;
}): PlatformConsoleActiveSession {
  return {
    expiresAt: serializeDate(activeSession.expiresAt),
    id: activeSession.id,
    reason: activeSession.reason,
    targetOrgId: activeSession.targetOrgId,
    targetOrgName:
      activeSession.targetOrgName ??
      activeSession.targetOrgNameSnapshot ??
      "Customer organization",
    targetOrgSlug:
      activeSession.targetOrgSlug ??
      activeSession.targetOrgSlugSnapshot ??
      activeSession.targetOrgId ??
      "customer",
  };
}
