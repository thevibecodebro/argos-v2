import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { roleplaySessionsTable } from "./roleplay";
import { usersTable } from "./users";

export const billingCustomersTable = pgTable(
  "billing_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_customers_stripe_customer_id_uq").on(table.stripeCustomerId),
    index("billing_customers_org_id_idx").on(table.orgId),
    index("billing_customers_user_id_idx").on(table.userId),
  ],
);

export const billingSubscriptionsTable = pgTable(
  "billing_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    billingPlanId: text("billing_plan_id").notNull(),
    status: text("status").notNull(),
    seatCount: integer("seat_count").notNull().default(1),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_subscriptions_stripe_subscription_id_uq").on(table.stripeSubscriptionId),
    index("billing_subscriptions_org_id_idx").on(table.orgId),
    index("billing_subscriptions_user_id_idx").on(table.userId),
    check("billing_subscriptions_seat_count_positive", sql`${table.seatCount} > 0`),
  ],
);

export const stripeWebhookEventsTable = pgTable(
  "stripe_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stripe_webhook_events_event_id_uq").on(table.eventId),
    index("stripe_webhook_events_event_type_idx").on(table.eventType),
  ],
);

export const voiceCreditGrantsTable = pgTable(
  "voice_credit_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    billingPlanId: text("billing_plan_id").notNull(),
    sourceType: text("source_type", {
      enum: ["subscription_included", "extra_pack"],
    }).notNull(),
    sourceId: text("source_id").notNull(),
    minutesGranted: integer("minutes_granted").notNull(),
    minutesRemaining: integer("minutes_remaining").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: text("status", {
      enum: ["active", "depleted", "expired"],
    })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("voice_credit_grants_source_uq").on(table.sourceType, table.sourceId),
    index("voice_credit_grants_org_status_idx").on(table.orgId, table.status),
    index("voice_credit_grants_user_status_idx").on(table.userId, table.status),
    check("voice_credit_grants_minutes_granted_positive", sql`${table.minutesGranted} > 0`),
    check("voice_credit_grants_minutes_remaining_nonnegative", sql`${table.minutesRemaining} >= 0`),
  ],
);

export const voiceUsageEventsTable = pgTable(
  "voice_usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idempotencyKey: text("idempotency_key").notNull(),
    orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => roleplaySessionsTable.id, { onDelete: "set null" }),
    source: text("source", {
      enum: ["roleplay_realtime", "roleplay_tts"],
    }).notNull(),
    minutesDebited: integer("minutes_debited").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("voice_usage_events_idempotency_key_uq").on(table.idempotencyKey),
    index("voice_usage_events_org_created_at_idx").on(table.orgId, table.createdAt),
    index("voice_usage_events_user_created_at_idx").on(table.userId, table.createdAt),
    check("voice_usage_events_minutes_debited_positive", sql`${table.minutesDebited} > 0`),
  ],
);
