import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import type { ArgosDb } from "./client";
import { billingSubscriptionsTable } from "./schema";

const ACTIVE_PROCESSING_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export type ActiveCallProcessingSubscription = {
  id: string;
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
  const ownerCondition = input.orgId
    ? eq(billingSubscriptionsTable.orgId, input.orgId)
    : input.userId
      ? and(eq(billingSubscriptionsTable.userId, input.userId), isNull(billingSubscriptionsTable.orgId))
      : null;

  if (!ownerCondition) {
    return null;
  }

  const now = input.now ?? new Date();
  const [subscription] = await db
    .select({
      id: billingSubscriptionsTable.id,
    })
    .from(billingSubscriptionsTable)
    .where(
      and(
        ownerCondition,
        inArray(billingSubscriptionsTable.status, ACTIVE_PROCESSING_SUBSCRIPTION_STATUSES),
        or(
          isNull(billingSubscriptionsTable.currentPeriodEnd),
          gt(billingSubscriptionsTable.currentPeriodEnd, now),
        ),
      ),
    )
    .orderBy(desc(billingSubscriptionsTable.updatedAt))
    .limit(1);

  return subscription ?? null;
}
