import { and, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import {
  billingCustomersTable,
  billingSubscriptionsTable,
  findActiveCallProcessingSubscription,
  getDb,
  organizationsTable,
  stripeWebhookEventsTable,
  usersTable,
  voiceCreditGrantsTable,
  voiceUsageEventsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type { BillingWebhookRepository, StripeWebhookEvent } from "./webhook-service";
import type {
  ConsumeVoiceMinutesInput,
  ConsumeVoiceMinutesResult,
  VoiceEntitlementsRepository,
} from "./voice-entitlements";
import type { CallProcessingEntitlementsRepository } from "./call-processing-entitlements";

function buildFullName(firstName: string | null, lastName: string | null, email: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || email;
}

function escapeSqlLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export class DrizzleBillingRepository implements BillingWebhookRepository, VoiceEntitlementsRepository, CallProcessingEntitlementsRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }) {
    return findActiveCallProcessingSubscription(this.db, input);
  }

  async findUserBillingScope(authUserId: string) {
    const [user] = await this.db
      .select({
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        orgName: organizationsTable.name,
        orgId: usersTable.orgId,
        userId: usersTable.id,
      })
      .from(usersTable)
      .leftJoin(organizationsTable, eq(usersTable.orgId, organizationsTable.id))
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      fullName: buildFullName(user.firstName, user.lastName, user.email),
      orgName: user.orgName,
      orgId: user.orgId,
      userId: user.userId,
    };
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

  async findBillingCustomerForScope(input: {
    orgId: string | null;
    userId: string;
  }) {
    const ownerCondition = input.orgId
      ? eq(billingCustomersTable.orgId, input.orgId)
      : and(eq(billingCustomersTable.userId, input.userId), isNull(billingCustomersTable.orgId));

    const [customer] = await this.db
      .select({
        stripeCustomerId: billingCustomersTable.stripeCustomerId,
      })
      .from(billingCustomersTable)
      .where(ownerCondition)
      .orderBy(desc(billingCustomersTable.updatedAt))
      .limit(1);

    return customer ?? null;
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

  async reconcileSubscriptionVoiceCreditGrants(input: {
    active: boolean;
    billingPlanId: string;
    expiresAt: Date | null;
    minutesGranted: number;
    orgId: string | null;
    periodEnd: Date | null;
    periodStart: Date | null;
    sourceId: string;
    stripeSubscriptionId: string;
    userId: string;
  }) {
    const ownerCondition = input.orgId
      ? eq(voiceCreditGrantsTable.orgId, input.orgId)
      : and(eq(voiceCreditGrantsTable.userId, input.userId), isNull(voiceCreditGrantsTable.orgId));
    const now = new Date();
    const subscriptionSourcePattern = `${escapeSqlLikePattern(input.stripeSubscriptionId)}:%`;
    const staleGrantConditions = [
      ownerCondition,
      eq(voiceCreditGrantsTable.sourceType, "subscription_included" as const),
      sql`${voiceCreditGrantsTable.sourceId} like ${subscriptionSourcePattern} escape '\\'`,
      eq(voiceCreditGrantsTable.status, "active" as const),
    ];

    if (input.active) {
      staleGrantConditions.push(ne(voiceCreditGrantsTable.sourceId, input.sourceId));
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(voiceCreditGrantsTable)
        .set({
          expiresAt: now,
          minutesRemaining: 0,
          status: "expired",
          updatedAt: now,
        })
        .where(and(...staleGrantConditions));

      if (!input.active) {
        return;
      }

      const consumedMinutes = sql`greatest(${voiceCreditGrantsTable.minutesGranted} - ${voiceCreditGrantsTable.minutesRemaining}, 0)`;
      const reconciledRemainingMinutes = sql`greatest(${input.minutesGranted} - ${consumedMinutes}, 0)`;

      await tx
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
          sourceType: "subscription_included",
          userId: input.userId,
        })
        .onConflictDoUpdate({
          target: [voiceCreditGrantsTable.sourceType, voiceCreditGrantsTable.sourceId],
          set: {
            billingPlanId: input.billingPlanId,
            expiresAt: input.expiresAt,
            minutesGranted: input.minutesGranted,
            minutesRemaining: reconciledRemainingMinutes,
            periodEnd: input.periodEnd,
            periodStart: input.periodStart,
            status: sql`case when ${reconciledRemainingMinutes} <= 0 then 'depleted' else 'active' end`,
            updatedAt: now,
          },
        });
    });
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

  async consumeVoiceMinutesAtomically(
    input: ConsumeVoiceMinutesInput,
  ): Promise<ConsumeVoiceMinutesResult> {
    return this.db.transaction(async (tx) => {
      const existingUsage = await this.findVoiceUsageEventByIdempotencyKeyIn(
        tx,
        input.idempotencyKey,
      );

      if (existingUsage) {
        return {
          ok: true as const,
          data: {
            minutesDebited: existingUsage.minutesDebited,
          },
        };
      }

      const ownerCondition = input.orgId
        ? eq(voiceCreditGrantsTable.orgId, input.orgId)
        : and(eq(voiceCreditGrantsTable.userId, input.userId), isNull(voiceCreditGrantsTable.orgId));

      const grants = await tx
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
        .orderBy(
          sql`case when ${voiceCreditGrantsTable.sourceType} = 'extra_pack' then 1 else 0 end`,
          desc(voiceCreditGrantsTable.createdAt),
        )
        .for("update");

      const usageAfterGrantLock = await this.findVoiceUsageEventByIdempotencyKeyIn(
        tx,
        input.idempotencyKey,
      );

      if (usageAfterGrantLock) {
        return {
          ok: true as const,
          data: {
            minutesDebited: usageAfterGrantLock.minutesDebited,
          },
        };
      }

      const availableMinutes = grants.reduce(
        (sum, grant) => sum + Math.max(0, grant.minutesRemaining),
        0,
      );

      if (availableMinutes < input.minutes) {
        return {
          ok: false as const,
          status: 402,
          code: "voice_minutes_exhausted",
          error: "No live voice minutes are available for this workspace.",
        };
      }

      const [usageEvent] = await tx
        .insert(voiceUsageEventsTable)
        .values({
          idempotencyKey: input.idempotencyKey,
          minutesDebited: input.minutes,
          orgId: input.orgId,
          sessionId: input.sessionId,
          source: input.source,
          userId: input.userId,
        })
        .onConflictDoNothing()
        .returning({ minutesDebited: voiceUsageEventsTable.minutesDebited });

      if (!usageEvent) {
        const duplicateUsage = await this.findVoiceUsageEventByIdempotencyKeyIn(
          tx,
          input.idempotencyKey,
        );

        if (duplicateUsage) {
          return {
            ok: true as const,
            data: {
              minutesDebited: duplicateUsage.minutesDebited,
            },
          };
        }

        throw new Error("Voice usage event conflict could not be resolved.");
      }

      let remaining = input.minutes;
      for (const grant of grants) {
        if (remaining <= 0) {
          break;
        }

        const debit = Math.min(remaining, grant.minutesRemaining);
        await tx
          .update(voiceCreditGrantsTable)
          .set({
            minutesRemaining: sql`greatest(${voiceCreditGrantsTable.minutesRemaining} - ${debit}, 0)`,
            status: sql`case when ${voiceCreditGrantsTable.minutesRemaining} - ${debit} <= 0 then 'depleted' else ${voiceCreditGrantsTable.status} end`,
            updatedAt: new Date(),
          })
          .where(eq(voiceCreditGrantsTable.id, grant.id));

        remaining -= debit;
      }

      return {
        ok: true as const,
        data: {
          minutesDebited: input.minutes,
        },
      };
    });
  }

  async findVoiceUsageEventByIdempotencyKey(idempotencyKey: string) {
    return this.findVoiceUsageEventByIdempotencyKeyIn(this.db, idempotencyKey);
  }

  private async findVoiceUsageEventByIdempotencyKeyIn(
    db: Pick<ArgosDb, "select">,
    idempotencyKey: string,
  ) {
    const [event] = await db
      .select({
        minutesDebited: voiceUsageEventsTable.minutesDebited,
      })
      .from(voiceUsageEventsTable)
      .where(eq(voiceUsageEventsTable.idempotencyKey, idempotencyKey))
      .limit(1);

    return event ?? null;
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
