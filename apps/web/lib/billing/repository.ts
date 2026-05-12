import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import {
  billingCustomersTable,
  billingSubscriptionsTable,
  getDb,
  stripeWebhookEventsTable,
  usersTable,
  voiceCreditGrantsTable,
  voiceUsageEventsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type { BillingWebhookRepository, StripeWebhookEvent } from "./webhook-service";
import type { VoiceEntitlementsRepository } from "./voice-entitlements";

export class DrizzleBillingRepository implements BillingWebhookRepository, VoiceEntitlementsRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findUserBillingScope(authUserId: string) {
    const [user] = await this.db
      .select({
        orgId: usersTable.orgId,
        userId: usersTable.id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    return user ?? null;
  }

  async insertStripeWebhookEvent(input: {
    eventId: string;
    eventType: string;
    payload: StripeWebhookEvent;
  }) {
    const [inserted] = await this.db
      .insert(stripeWebhookEventsTable)
      .values({
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload,
      })
      .onConflictDoNothing()
      .returning({ id: stripeWebhookEventsTable.id });

    return Boolean(inserted);
  }

  async upsertBillingCustomer(input: {
    orgId: string | null;
    stripeCustomerId: string;
    userId: string;
  }) {
    await this.db
      .insert(billingCustomersTable)
      .values({
        orgId: input.orgId,
        stripeCustomerId: input.stripeCustomerId,
        userId: input.userId,
      })
      .onConflictDoUpdate({
        target: billingCustomersTable.stripeCustomerId,
        set: {
          orgId: input.orgId,
          updatedAt: new Date(),
          userId: input.userId,
        },
      });
  }

  async upsertBillingSubscription(input: {
    billingPlanId: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    orgId: string | null;
    seatCount: number;
    status: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    userId: string;
  }) {
    await this.db
      .insert(billingSubscriptionsTable)
      .values({
        billingPlanId: input.billingPlanId,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        currentPeriodEnd: input.currentPeriodEnd,
        currentPeriodStart: input.currentPeriodStart,
        orgId: input.orgId,
        seatCount: input.seatCount,
        status: input.status,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        userId: input.userId,
      })
      .onConflictDoUpdate({
        target: billingSubscriptionsTable.stripeSubscriptionId,
        set: {
          billingPlanId: input.billingPlanId,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          currentPeriodEnd: input.currentPeriodEnd,
          currentPeriodStart: input.currentPeriodStart,
          orgId: input.orgId,
          seatCount: input.seatCount,
          status: input.status,
          stripeCustomerId: input.stripeCustomerId,
          updatedAt: new Date(),
          userId: input.userId,
        },
      });
  }

  async createVoiceCreditGrant(input: {
    billingPlanId: string;
    expiresAt: Date | null;
    minutesGranted: number;
    orgId: string | null;
    periodEnd: Date | null;
    periodStart: Date | null;
    sourceId: string;
    sourceType: "subscription_included" | "extra_pack";
    userId: string;
  }) {
    await this.db
      .insert(voiceCreditGrantsTable)
      .values({
        billingPlanId: input.billingPlanId,
        expiresAt: input.expiresAt,
        minutesGranted: input.minutesGranted,
        minutesRemaining: input.minutesGranted,
        orgId: input.orgId,
        periodEnd: input.periodEnd,
        periodStart: input.periodStart,
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        userId: input.userId,
      })
      .onConflictDoNothing();
  }

  async findActiveVoiceCreditGrants(input: {
    orgId: string | null;
    userId: string;
  }) {
    const ownerCondition = input.orgId
      ? eq(voiceCreditGrantsTable.orgId, input.orgId)
      : and(eq(voiceCreditGrantsTable.userId, input.userId), isNull(voiceCreditGrantsTable.orgId));

    return this.db
      .select({
        id: voiceCreditGrantsTable.id,
        minutesRemaining: voiceCreditGrantsTable.minutesRemaining,
        sourceType: voiceCreditGrantsTable.sourceType,
      })
      .from(voiceCreditGrantsTable)
      .where(
        and(
          ownerCondition,
          eq(voiceCreditGrantsTable.status, "active"),
          gt(voiceCreditGrantsTable.minutesRemaining, 0),
          or(isNull(voiceCreditGrantsTable.expiresAt), gt(voiceCreditGrantsTable.expiresAt, new Date())),
        ),
      )
      .orderBy(desc(voiceCreditGrantsTable.createdAt));
  }

  async consumeVoiceCreditGrant(grantId: string, minutes: number) {
    await this.db
      .update(voiceCreditGrantsTable)
      .set({
        minutesRemaining: sql`greatest(${voiceCreditGrantsTable.minutesRemaining} - ${minutes}, 0)`,
        status: sql`case when ${voiceCreditGrantsTable.minutesRemaining} - ${minutes} <= 0 then 'depleted' else ${voiceCreditGrantsTable.status} end`,
        updatedAt: new Date(),
      })
      .where(eq(voiceCreditGrantsTable.id, grantId));
  }

  async insertVoiceUsageEvent(input: {
    idempotencyKey: string;
    minutesDebited: number;
    orgId: string | null;
    sessionId: string | null;
    source: "roleplay_realtime" | "roleplay_tts";
    userId: string;
  }) {
    await this.db
      .insert(voiceUsageEventsTable)
      .values({
        idempotencyKey: input.idempotencyKey,
        minutesDebited: input.minutesDebited,
        orgId: input.orgId,
        sessionId: input.sessionId,
        source: input.source,
        userId: input.userId,
      })
      .onConflictDoNothing();
  }
}
