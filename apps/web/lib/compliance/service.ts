import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

type ComplianceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

export type ComplianceStatus = {
  hasConsented: boolean;
  consentedAt: string | null;
};

export interface ComplianceRepository {
  createConsentRecord(input: {
    acknowledgedBy: string;
    eventType: string;
    ipAddress: string;
    metadata?: Record<string, unknown> | null;
    orgId: string;
    tosVersion: string;
    userAgent: string;
  }): Promise<{ acknowledgedAt: Date }>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findLatestConsentByOrgId(orgId: string): Promise<{ acknowledgedAt: Date } | null>;
}

function canManageCompliance(role: AppUserRole | null | undefined) {
  return role === "admin" || role === "manager" || role === "executive";
}

export async function getComplianceStatus(
  repository: ComplianceRepository,
  authUserId: string,
): Promise<ComplianceResult<ComplianceStatus>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!viewer.org) {
    return {
      ok: true,
      data: {
        hasConsented: false,
        consentedAt: null,
      },
    };
  }

  const latestConsent = await repository.findLatestConsentByOrgId(viewer.org.id);

  return {
    ok: true,
    data: {
      hasConsented: Boolean(latestConsent),
      consentedAt: latestConsent?.acknowledgedAt.toISOString() ?? null,
    },
  };
}

export async function activateRecordingConsent(
  repository: ComplianceRepository,
  authUserId: string,
  input: {
    eventType?: unknown;
    tosVersion?: unknown;
    metadata?: Record<string, unknown>;
    ipAddress: string;
    userAgent: string;
  },
): Promise<ComplianceResult<{ success: true; consentedAt: string }>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!viewer.org) {
    return {
      ok: false,
      status: 400,
      error: "User must be in an organization",
    };
  }

  if (!canManageCompliance(viewer.role)) {
    return {
      ok: false,
      status: 403,
      error: "Only organization admins can activate call recording consent",
    };
  }

  if (
    typeof input.eventType !== "string" ||
    !input.eventType.trim() ||
    typeof input.tosVersion !== "string" ||
    !input.tosVersion.trim()
  ) {
    return {
      ok: false,
      status: 400,
      error: "eventType and tosVersion are required",
    };
  }

  const record = await repository.createConsentRecord({
    orgId: viewer.org.id,
    acknowledgedBy: viewer.id,
    eventType: input.eventType.trim(),
    tosVersion: input.tosVersion.trim(),
    metadata: input.metadata ?? null,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    ok: true,
    data: {
      success: true,
      consentedAt: record.acknowledgedAt.toISOString(),
    },
  };
}
