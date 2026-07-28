import { billingPlans, type BillingPlanId } from "./plans";
import {
  resolveVoiceAccess,
  type VoiceCreditGrant,
  type VoiceEntitlementsRepository,
} from "./voice-entitlements";

export type VoiceBalanceState = "critical" | "exhausted" | "healthy" | "low";

export type VoiceBalance = {
  accessEndsAt: string | null;
  accessSource: "coaching_contract" | "stripe_subscription";
  billingPlanId: string;
  canManageBasePlan: boolean;
  canPurchaseMinutes: boolean;
  capacityMinutes: number;
  includedMinutesRemaining: number;
  package: "solo" | "team";
  purchasedMinutesRemaining: number;
  remainingPercentage: number;
  renewalDate: string | null;
  seatCount: number;
  state: VoiceBalanceState;
  totalMinutesRemaining: number;
};

export const voicePackOptions = (
  ["extra-250", "extra-500", "extra-2000"] as const satisfies readonly BillingPlanId[]
).map((planId) => {
  const plan = billingPlans[planId];
  return {
    id: planId,
    minutes: Number(plan.metadata.extra_live_voice_minutes),
    name: plan.name,
    unitAmountCents: plan.price.unitAmountCents,
  };
});

function sumMinutes(
  grants: VoiceCreditGrant[],
  predicate: (grant: VoiceCreditGrant) => boolean,
) {
  return grants
    .filter(predicate)
    .reduce((sum, grant) => sum + Math.max(0, grant.minutesRemaining), 0);
}

function getState(remainingPercentage: number, totalMinutesRemaining: number): VoiceBalanceState {
  if (totalMinutesRemaining <= 0) return "exhausted";
  if (remainingPercentage <= 10) return "critical";
  if (remainingPercentage <= 25) return "low";
  return "healthy";
}

export async function getVoiceBalance(
  repository: VoiceEntitlementsRepository,
  authUserId: string,
) {
  const access = await resolveVoiceAccess(repository, authUserId);
  if (!access.ok) return access;

  const grants = await repository.findVoiceBalanceGrants(access.data.scope);
  const included = grants.filter((grant) => grant.sourceType !== "extra_pack");
  const purchased = grants.filter((grant) => grant.sourceType === "extra_pack");
  const includedMinutesRemaining = sumMinutes(included, () => true);
  const purchasedMinutesRemaining = sumMinutes(purchased, () => true);
  const totalMinutesRemaining =
    includedMinutesRemaining + purchasedMinutesRemaining;
  const capacityMinutes = grants.reduce(
    (sum, grant) => sum + Math.max(0, grant.minutesGranted ?? 0),
    0,
  );
  const remainingPercentage =
    capacityMinutes > 0
      ? Math.max(0, Math.min(100, Math.round((totalMinutesRemaining / capacityMinutes) * 100)))
      : 0;
  const renewalDate =
    included
      .map((grant) => grant.periodEnd)
      .filter((value): value is Date => value instanceof Date)
      .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
  const role = access.data.scope.role ?? null;
  const canManageBilling = !access.data.scope.orgId || role === "admin";
  const entitlement = access.data.entitlement;
  const data: VoiceBalance = {
    accessEndsAt: entitlement.accessEndsAt?.toISOString() ?? null,
    accessSource: entitlement.sourceType,
    billingPlanId: entitlement.billingPlanId,
    canManageBasePlan:
      canManageBilling && entitlement.sourceType === "stripe_subscription",
    canPurchaseMinutes: canManageBilling,
    capacityMinutes,
    includedMinutesRemaining,
    package: entitlement.package,
    purchasedMinutesRemaining,
    remainingPercentage,
    renewalDate: renewalDate?.toISOString() ?? null,
    seatCount: entitlement.seatCount,
    state: getState(remainingPercentage, totalMinutesRemaining),
    totalMinutesRemaining,
  };

  return { ok: true as const, data };
}
