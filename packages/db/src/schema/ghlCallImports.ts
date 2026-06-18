import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { callsTable } from "./calls";
import { organizationsTable } from "./organizations";

export const GHL_CALL_IMPORT_STATUSES = [
  "pending",
  "running",
  "retrying",
  "imported",
  "skipped",
  "failed",
] as const;

export const GHL_CALL_IMPORT_SKIPPED_REASONS = [
  "no_connected_integration",
  "consent_missing",
  "no_recording",
  "no_owner_mapping",
  "wrong_message_type",
  "unauthorized_after_refresh",
] as const;

export const ghlCallImportsTable = pgTable(
  "ghl_call_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull(),
    messageId: text("message_id").notNull(),
    conversationId: text("conversation_id"),
    contactId: text("contact_id"),
    ghlUserId: text("ghl_user_id"),
    callId: uuid("call_id").references(() => callsTable.id, { onDelete: "set null" }),
    status: text("status", { enum: GHL_CALL_IMPORT_STATUSES }).notNull().default("pending"),
    skippedReason: text("skipped_reason", { enum: GHL_CALL_IMPORT_SKIPPED_REASONS }),
    messageCreatedAt: timestamp("message_created_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("ghl_call_imports_location_message_unique").on(
      table.orgId,
      table.locationId,
      table.messageId,
    ),
  ],
);
