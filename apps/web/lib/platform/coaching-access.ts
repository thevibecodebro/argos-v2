import type { PlatformStaffRole } from "./repository";
import {
  normalizeManagedCapabilities,
  type ManagedCapabilityKey,
} from "@/lib/access/managed-capabilities";

export type CoachingAccessGrant = {
  accessModel: "legacy_package" | "managed_capabilities";
  capabilities: ManagedCapabilityKey[];
  contractReference: string;
  endsAt: Date;
  id: string;
  monthlyVoiceMinutesPerSeat: number;
  notes: string | null;
  orgId: string;
  package: "solo" | "team";
  seatLimit: number;
  startsAt: Date;
  status: "active" | "expired" | "paused" | "revoked";
  updatedAt: Date;
  version: number;
};

export class CoachingAccessVersionConflictError extends Error {
  constructor() {
    super("Managed access was changed by another platform operator");
    this.name = "CoachingAccessVersionConflictError";
  }
}

export type CoachingAccessRepository = {
  findActiveStripeSubscriptionForOrg(orgId: string): Promise<{ id: string } | null>;
  findOrganizationBySlug(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
  } | null>;
  findLatestCoachingAccessGrant(orgId: string): Promise<CoachingAccessGrant | null>;
  mutateCoachingAccessWithAudit(input: {
    actor: {
      email: string;
      role: PlatformStaffRole;
      userId: string;
    };
    action: "pause" | "reactivate" | "revoke" | "save";
    accessModel?: "managed_capabilities";
    capabilities?: ManagedCapabilityKey[];
    contractReference?: string;
    endsAt?: Date;
    expectedVersion: number;
    grant: CoachingAccessGrant | null;
    notes?: string | null;
    organization: { id: string; name: string; slug: string };
    package?: "solo" | "team";
    reason: string;
    seatLimit?: number;
    startsAt?: Date;
  }): Promise<CoachingAccessGrant>;
};

type CoachingAccessInput = {
  action?: unknown;
  capabilities?: unknown;
  contractReference?: unknown;
  endsAt?: unknown;
  expectedVersion?: unknown;
  notes?: unknown;
  package?: unknown;
  reason?: unknown;
  seatLimit?: unknown;
  startsAt?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateValue(value: unknown) {
  const valueString = stringValue(value);
  if (!valueString) return null;
  const date = new Date(valueString);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function mutateCoachingAccess(
  repository: CoachingAccessRepository,
  actor: { email: string; role: PlatformStaffRole; userId: string },
  slug: string,
  input: CoachingAccessInput,
) {
  if (actor.role !== "owner" && actor.role !== "operator") {
    return { ok: false as const, status: 403, error: "Platform operator access required" };
  }

  const organization = await repository.findOrganizationBySlug(slug);
  if (!organization) {
    return { ok: false as const, status: 404, error: "Organization not found" };
  }

  const actionValue = stringValue(input.action);
  const action =
    actionValue === "pause" ||
    actionValue === "reactivate" ||
    actionValue === "revoke" ||
    actionValue === "save"
      ? actionValue
      : null;
  const reason = stringValue(input.reason);

  if (!action || !reason) {
    return { ok: false as const, status: 400, error: "action and reason are required" };
  }

  const currentGrant = await repository.findLatestCoachingAccessGrant(organization.id);

  const expectedVersion = Number(input.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { ok: false as const, status: 400, error: "expectedVersion is required" };
  }

  if (
    (currentGrant && expectedVersion !== currentGrant.version) ||
    (!currentGrant && expectedVersion !== 0)
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "Managed access was changed by another platform operator",
      code: "agreement_version_conflict",
    };
  }

  if (action !== "save" && !currentGrant) {
    return { ok: false as const, status: 404, error: "Coaching access not found" };
  }

  let normalized:
    | {
        contractReference: string;
        capabilities: ManagedCapabilityKey[];
        endsAt: Date;
        notes: string | null;
        package: "solo" | "team";
        seatLimit: number;
        startsAt: Date;
      }
    | undefined;

  if (action === "save") {
    const capabilityResult = normalizeManagedCapabilities(input.capabilities);
    if (!capabilityResult.ok) {
      return { ok: false as const, status: 400, error: capabilityResult.error };
    }

    const packageValue = stringValue(input.package);
    const packageName =
      packageValue === "solo" || packageValue === "team" ? packageValue : null;
    const seatLimit = Number(input.seatLimit);
    const startsAt = dateValue(input.startsAt);
    const endsAt = dateValue(input.endsAt);
    const contractReference = stringValue(input.contractReference);

    if (
      !packageName ||
      !Number.isInteger(seatLimit) ||
      seatLimit <= 0 ||
      (packageName === "solo" && seatLimit !== 1) ||
      (packageName === "team" && seatLimit <= 1) ||
      !startsAt ||
      !endsAt ||
      endsAt <= startsAt ||
      !contractReference
    ) {
      return {
        ok: false as const,
        status: 400,
        error:
          "Valid package, seat count, contract dates, and contract reference are required",
      };
    }

    normalized = {
      capabilities: capabilityResult.capabilities,
      contractReference,
      endsAt,
      notes: stringValue(input.notes) || null,
      package: packageName,
      seatLimit,
      startsAt,
    };
  }

  if (action === "save" || action === "reactivate") {
    const activeStripeSubscription =
      await repository.findActiveStripeSubscriptionForOrg(organization.id);
    if (activeStripeSubscription) {
      return {
        ok: false as const,
        status: 409,
        error: "Cancel the active Stripe subscription before enabling coaching access",
      };
    }
  }

  if (
    action === "reactivate" &&
    currentGrant &&
    (currentGrant.status === "revoked" || currentGrant.endsAt <= new Date())
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "Save a new active contract instead of reactivating expired or revoked access",
    };
  }

  let grant: CoachingAccessGrant;
  try {
    grant = await repository.mutateCoachingAccessWithAudit({
      actor,
      action,
      accessModel: action === "save" ? "managed_capabilities" : undefined,
      ...normalized,
      expectedVersion,
      grant: currentGrant,
      organization,
      reason,
    });
  } catch (error) {
    if (error instanceof CoachingAccessVersionConflictError) {
      return {
        ok: false as const,
        status: 409,
        error: error.message,
        code: "agreement_version_conflict",
      };
    }

    throw error;
  }

  return { ok: true as const, data: grant };
}
