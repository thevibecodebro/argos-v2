import {
  getCoachingVoiceGrantSourceId,
  getCoachingVoicePeriod,
  type SoftwareAccessEntitlement,
} from "./software-access";

export type VoiceCreditGrant = {
  id: string;
  billingPlanId?: string;
  expiresAt?: Date | null;
  minutesGranted?: number;
  minutesRemaining: number;
  periodEnd?: Date | null;
  periodStart?: Date | null;
  sourceType?: "subscription_included" | "coaching_included" | "extra_pack";
  updatedAt?: Date;
};

type VoiceUsageSource = "roleplay_realtime" | "roleplay_tts";

export type ConsumeVoiceMinutesInput = {
  idempotencyKey: string;
  minutes: number;
  orgId: string | null;
  sessionId: string | null;
  source: VoiceUsageSource;
  userId: string;
};

export type ConsumeVoiceMinutesResult =
  | {
      ok: true;
      data: {
        minutesDebited: number;
      };
    }
  | {
      ok: false;
      status: 402;
      code: "voice_minutes_exhausted";
      error: string;
    };

export type VoiceEntitlementsRepository = {
  consumeVoiceMinutesAtomically(input: ConsumeVoiceMinutesInput): Promise<ConsumeVoiceMinutesResult>;
  ensureCoachingVoiceCreditGrant(input: {
    billingPlanId: string;
    expiresAt: Date;
    minutesGranted: number;
    orgId: string;
    periodEnd: Date;
    periodStart: Date;
    sourceId: string;
    userId: string;
  }): Promise<void>;
  findActiveSoftwareAccess(input: {
    orgId: string | null;
    userId: string;
  }): Promise<SoftwareAccessEntitlement | null>;
  findActiveVoiceCreditGrants(input: {
    orgId: string | null;
    userId: string;
  }): Promise<VoiceCreditGrant[]>;
  findVoiceBalanceGrants(input: {
    orgId: string | null;
    userId: string;
  }): Promise<VoiceCreditGrant[]>;
  findUserBillingScope(authUserId: string): Promise<{
    orgId: string | null;
    role?: string | null;
    userId: string;
  } | null>;
};

export async function resolveVoiceAccess(
  repository: VoiceEntitlementsRepository,
  authUserId: string,
) {
  const scope = await repository.findUserBillingScope(authUserId);

  if (!scope) {
    return {
      ok: false as const,
      status: 404,
      code: "billing_scope_not_found",
      error: "Billing workspace not found for this account.",
    };
  }

  const entitlement = await repository.findActiveSoftwareAccess(scope);

  if (!entitlement) {
    return {
      ok: false as const,
      status: 402,
      code: "software_access_required",
      error: "Active Argos software access is required for live voice.",
    };
  }

  if (
    entitlement.sourceType === "coaching_contract" &&
    scope.orgId &&
    entitlement.accessStartsAt &&
    entitlement.accessEndsAt
  ) {
    const period = getCoachingVoicePeriod(
      entitlement.accessStartsAt,
      entitlement.accessEndsAt,
    );

    if (period) {
      await repository.ensureCoachingVoiceCreditGrant({
        billingPlanId: `coaching-${entitlement.package}`,
        expiresAt: period.periodEnd,
        minutesGranted: entitlement.seatCount * entitlement.voiceMinutesPerSeat,
        orgId: scope.orgId,
        periodEnd: period.periodEnd,
        periodStart: period.periodStart,
        sourceId: getCoachingVoiceGrantSourceId(
          entitlement.sourceId,
          period.periodStart,
        ),
        userId: scope.userId,
      });
    }
  }

  return {
    ok: true as const,
    data: {
      entitlement,
      scope,
    },
  };
}

export async function getVoiceEntitlementStatus(
  repository: VoiceEntitlementsRepository,
  authUserId: string,
) {
  const access = await resolveVoiceAccess(repository, authUserId);
  if (!access.ok) return access;

  const grants = await repository.findActiveVoiceCreditGrants(access.data.scope);
  const availableMinutes = grants.reduce(
    (sum, grant) => sum + Math.max(0, grant.minutesRemaining),
    0,
  );

  if (availableMinutes <= 0) {
    return {
      ok: false as const,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    };
  }

  return {
    ok: true as const,
    data: {
      availableMinutes,
      orgId: access.data.scope.orgId,
      userId: access.data.scope.userId,
    },
  };
}

export async function consumeVoiceMinutes(
  repository: VoiceEntitlementsRepository,
  authUserId: string,
  input: {
    idempotencyKey: string;
    minutes: number;
    sessionId?: string | null;
    source: VoiceUsageSource;
  },
) {
  const access = await resolveVoiceAccess(repository, authUserId);
  if (!access.ok) return access;

  const minutes = Math.max(1, Math.ceil(input.minutes));
  return repository.consumeVoiceMinutesAtomically({
    idempotencyKey: input.idempotencyKey,
    minutes,
    orgId: access.data.scope.orgId,
    sessionId: input.sessionId ?? null,
    source: input.source,
    userId: access.data.scope.userId,
  });
}
