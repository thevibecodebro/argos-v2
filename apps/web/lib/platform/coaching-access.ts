import type { PlatformStaffRole } from "./repository";

export type CoachingAccessGrant = {
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
};

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
    contractReference?: string;
    endsAt?: Date;
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
  contractReference?: unknown;
  endsAt?: unknown;
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

  if (action !== "save" && !currentGrant) {
    return { ok: false as const, status: 404, error: "Coaching access not found" };
  }

  let normalized:
    | {
        contractReference: string;
        endsAt: Date;
        notes: string | null;
        package: "solo" | "team";
        seatLimit: number;
        startsAt: Date;
      }
    | undefined;

  if (action === "save") {
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

  const grant = await repository.mutateCoachingAccessWithAudit({
    actor,
    action,
    ...normalized,
    grant: currentGrant,
    organization,
    reason,
  });

  return { ok: true as const, data: grant };
}
