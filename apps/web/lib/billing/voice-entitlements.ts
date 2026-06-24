export type VoiceCreditGrant = {
  id: string;
  minutesRemaining: number;
  sourceType?: "subscription_included" | "extra_pack";
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
  findActiveVoiceCreditGrants(input: {
    orgId: string | null;
    userId: string;
  }): Promise<VoiceCreditGrant[]>;
  findUserBillingScope(authUserId: string): Promise<{
    orgId: string | null;
    userId: string;
  } | null>;
};

export async function getVoiceEntitlementStatus(
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

  const grants = await repository.findActiveVoiceCreditGrants(scope);
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
      orgId: scope.orgId,
      userId: scope.userId,
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
  const scope = await repository.findUserBillingScope(authUserId);

  if (!scope) {
    return {
      ok: false as const,
      status: 404,
      code: "billing_scope_not_found",
      error: "Billing workspace not found for this account.",
    };
  }

  const minutes = Math.max(1, Math.ceil(input.minutes));
  return repository.consumeVoiceMinutesAtomically({
    idempotencyKey: input.idempotencyKey,
    minutes,
    orgId: scope.orgId,
    sessionId: input.sessionId ?? null,
    source: input.source,
    userId: scope.userId,
  });
}
