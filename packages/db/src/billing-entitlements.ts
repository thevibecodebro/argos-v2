import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import type { ArgosDb } from "./client";
import { billingSubscriptionsTable, softwareAccessGrantsTable } from "./schema";

const ACTIVE_PROCESSING_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;
const ACTIVE_PAID_SUBSCRIPTION_STATUSES = ["active"] as const;

export type ActiveCallProcessingSubscription = {
  id: string;
  sourceType: "coaching_contract" | "stripe_subscription";
};

export type CallProcessingSubscriptionScope = {
  orgId: string | null;
  userId: string | null;
  now?: Date;
};

export async function findActiveCallProcessingSubscription(
  db: ArgosDb,
  input: CallProcessingSubscriptionScope,
): Promise<ActiveCallProcessingSubscription | null> {
  return findActiveSubscription(db, input, ACTIVE_PROCESSING_SUBSCRIPTION_STATUSES);
}

export type ActiveTrainingAiSubscription = {
  id: string;
  sourceType: "coaching_contract" | "stripe_subscription";
};

export type TrainingAiSubscriptionScope = {
  orgId: string | null;
  userId: string | null;
  now?: Date;
};

export async function findActiveTrainingAiSubscription(
  db: ArgosDb,
  input: TrainingAiSubscriptionScope,
): Promise<ActiveTrainingAiSubscription | null> {
  return findActiveSubscription(db, input, ACTIVE_PAID_SUBSCRIPTION_STATUSES);
}

async function findActiveSubscription(
  db: ArgosDb,
  input: CallProcessingSubscriptionScope | TrainingAiSubscriptionScope,
  statuses: readonly string[],
): Promise<{
  id: string;
  sourceType: "coaching_contract" | "stripe_subscription";
} | null> {
  const ownerCondition = input.orgId
    ? eq(billingSubscriptionsTable.orgId, input.orgId)
    : input.userId
      ? and(eq(billingSubscriptionsTable.userId, input.userId), isNull(billingSubscriptionsTable.orgId))
      : null;

  if (!ownerCondition) {
    return null;
  }

  const now = input.now ?? new Date();
  if (input.orgId) {
    const [coachingGrant] = await db
      .select({
        id: softwareAccessGrantsTable.id,
      })
      .from(softwareAccessGrantsTable)
      .where(
        and(
          eq(softwareAccessGrantsTable.orgId, input.orgId),
          eq(softwareAccessGrantsTable.status, "active"),
          lte(softwareAccessGrantsTable.startsAt, now),
          gt(softwareAccessGrantsTable.endsAt, now),
        ),
      )
      .orderBy(desc(softwareAccessGrantsTable.updatedAt))
      .limit(1);

    if (coachingGrant) {
      return {
        id: coachingGrant.id,
        sourceType: "coaching_contract",
      };
    }
  }

  const [subscription] = await db
    .select({
      id: billingSubscriptionsTable.id,
    })
    .from(billingSubscriptionsTable)
    .where(
      and(
        ownerCondition,
        inArray(billingSubscriptionsTable.status, statuses),
        or(
          isNull(billingSubscriptionsTable.currentPeriodEnd),
          gt(billingSubscriptionsTable.currentPeriodEnd, now),
        ),
      ),
    )
    .orderBy(desc(billingSubscriptionsTable.updatedAt))
    .limit(1);

  return subscription
    ? {
        ...subscription,
        sourceType: "stripe_subscription" as const,
      }
    : null;
}
