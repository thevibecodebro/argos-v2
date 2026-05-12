export type VoiceCreditGrant = {
  id: string;
  minutesRemaining: number;
  sourceType?: "subscription_included" | "extra_pack";
};

export type VoiceEntitlementsRepository = {
  consumeVoiceCreditGrant(grantId: string, minutes: number): Promise<void>;
  findActiveVoiceCreditGrants(input: {
    orgId: string | null;
    userId: string;
  }): Promise<VoiceCreditGrant[]>;
  findUserBillingScope(authUserId: string): Promise<{
    orgId: string | null;
    userId: string;
  } | null>;
  insertVoiceUsageEvent(input: {
    idempotencyKey: string;
    minutesDebited: number;
    orgId: string | null;
    sessionId: string | null;
    source: "roleplay_realtime" | "roleplay_tts";
    userId: string;
  }): Promise<void>;
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
    source: "roleplay_realtime" | "roleplay_tts";
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
  const grants = await repository.findActiveVoiceCreditGrants(scope);
  const sortedGrants = grants
    .filter((grant) => grant.minutesRemaining > 0)
    .sort((a, b) => getGrantPriority(a) - getGrantPriority(b));
  const availableMinutes = sortedGrants.reduce((sum, grant) => sum + grant.minutesRemaining, 0);

  if (availableMinutes < minutes) {
    return {
      ok: false as const,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    };
  }

  let remaining = minutes;
  for (const grant of sortedGrants) {
    if (remaining <= 0) {
      break;
    }

    const debit = Math.min(remaining, grant.minutesRemaining);
    await repository.consumeVoiceCreditGrant(grant.id, debit);
    remaining -= debit;
  }

  await repository.insertVoiceUsageEvent({
    idempotencyKey: input.idempotencyKey,
    minutesDebited: minutes,
    orgId: scope.orgId,
    sessionId: input.sessionId ?? null,
    source: input.source,
    userId: scope.userId,
  });

  return {
    ok: true as const,
    data: {
      minutesDebited: minutes,
    },
  };
}

function getGrantPriority(grant: VoiceCreditGrant) {
  return grant.sourceType === "extra_pack" ? 1 : 0;
}
