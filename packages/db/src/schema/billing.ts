import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { platformStaffTable } from "./platform";
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

export const softwareAccessGrantsTable = pgTable(
  "software_access_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accessModel: text("access_model", {
      enum: ["legacy_package", "managed_capabilities"],
    })
      .notNull()
      .default("legacy_package"),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    sourceType: text("source_type", {
      enum: ["coaching_contract"],
    }).notNull(),
    package: text("package", {
      enum: ["solo", "team"],
    }).notNull(),
    seatLimit: integer("seat_limit").notNull(),
    monthlyVoiceMinutesPerSeat: integer("monthly_voice_minutes_per_seat")
      .notNull()
      .default(120),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status", {
      enum: ["active", "paused", "expired", "revoked"],
    })
      .notNull()
      .default("active"),
    contractReference: text("contract_reference").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => platformStaffTable.userId, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("software_access_grants_org_status_dates_idx").on(
      table.orgId,
      table.status,
      table.startsAt,
      table.endsAt,
    ),
    index("software_access_grants_created_by_idx").on(table.createdBy),
    uniqueIndex("software_access_grants_one_active_coaching_org_uq")
      .on(table.orgId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("software_access_grants_id_org_id_uq").on(table.id, table.orgId),
    check(
      "software_access_grants_access_model_check",
      sql`${table.accessModel} in ('legacy_package', 'managed_capabilities')`,
    ),
    check("software_access_grants_source_type_check", sql`${table.sourceType} = 'coaching_contract'`),
    check("software_access_grants_package_check", sql`${table.package} in ('solo', 'team')`),
    check(
      "software_access_grants_status_check",
      sql`${table.status} in ('active', 'paused', 'expired', 'revoked')`,
    ),
    check("software_access_grants_seat_limit_positive", sql`${table.seatLimit} > 0`),
    check(
      "software_access_grants_package_seats_check",
      sql`(${table.package} = 'solo' and ${table.seatLimit} = 1) or (${table.package} = 'team' and ${table.seatLimit} > 1)`,
    ),
    check(
      "software_access_grants_voice_minutes_positive",
      sql`${table.monthlyVoiceMinutesPerSeat} > 0`,
    ),
    check("software_access_grants_dates_check", sql`${table.endsAt} > ${table.startsAt}`),
    check("software_access_grants_version_positive", sql`${table.version} > 0`),
  ],
);

export const softwareAccessCapabilitiesTable = pgTable(
  "software_access_capabilities",
  {
    grantId: uuid("grant_id").notNull(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    capabilityKey: text("capability_key", {
      enum: [
        "training",
        "roleplay",
        "roleplay_voice",
        "custom_scenarios",
        "team_rubrics",
        "practice_reporting",
        "call_upload",
        "call_ingestion",
        "call_scoring",
        "highlights",
        "call_analytics",
        "leaderboard",
        "integration_google_meet",
        "integration_ghl",
        "integration_zoom",
        "workspace_branding",
      ],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.grantId, table.capabilityKey] }),
    index("software_access_capabilities_org_grant_idx").on(table.orgId, table.grantId),
    foreignKey({
      name: "software_access_capabilities_grant_org_fkey",
      columns: [table.grantId, table.orgId],
      foreignColumns: [softwareAccessGrantsTable.id, softwareAccessGrantsTable.orgId],
    }).onDelete("cascade"),
    check(
      "software_access_capabilities_key_check",
      sql`${table.capabilityKey} in ('training', 'roleplay', 'roleplay_voice', 'custom_scenarios', 'team_rubrics', 'practice_reporting', 'call_upload', 'call_ingestion', 'call_scoring', 'highlights', 'call_analytics', 'leaderboard', 'integration_google_meet', 'integration_ghl', 'integration_zoom', 'workspace_branding')`,
    ),
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
      enum: ["subscription_included", "coaching_included", "extra_pack"],
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
