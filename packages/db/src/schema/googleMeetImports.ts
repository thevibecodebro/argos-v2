import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { callsTable } from "./calls";
import { googleMeetIntegrationsTable } from "./googleMeetIntegrations";
import { organizationsTable } from "./organizations";

export const GOOGLE_MEET_TITLE_SOURCES = ["calendar", "drive"] as const;

export const GOOGLE_MEET_IMPORT_STATUSES = [
  "pending",
  "running",
  "retrying",
  "imported",
  "skipped",
  "failed",
  "deleted",
] as const;

export const GOOGLE_MEET_IMPORT_SKIPPED_REASONS = [
  "no_connected_integration",
  "sync_disabled",
  "consent_missing",
  "billing_inactive",
  "no_owner",
  "title_filter_unconfigured",
  "title_missing",
  "title_excluded",
  "title_no_include_match",
  "recording_not_ready",
  "capability_disabled",
  "unauthorized_after_refresh",
] as const;

export const googleMeetImportsTable = pgTable(
  "google_meet_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id")
      .references(() => googleMeetIntegrationsTable.id, { onDelete: "set null" }),
    conferenceRecordName: text("conference_record_name"),
    recordingName: text("recording_name").notNull(),
    driveFileId: text("drive_file_id"),
    meetingCode: text("meeting_code"),
    meetingTitle: text("meeting_title"),
    titleSource: text("title_source", { enum: GOOGLE_MEET_TITLE_SOURCES }),
    conferenceStartedAt: timestamp("conference_started_at", { withTimezone: true }),
    conferenceEndedAt: timestamp("conference_ended_at", { withTimezone: true }),
    callId: uuid("call_id").references(() => callsTable.id, { onDelete: "set null" }),
    status: text("status", { enum: GOOGLE_MEET_IMPORT_STATUSES }).notNull().default("pending"),
    skippedReason: text("skipped_reason", { enum: GOOGLE_MEET_IMPORT_SKIPPED_REASONS }),
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
    unique("google_meet_imports_recording_unique").on(table.orgId, table.recordingName),
    index("google_meet_imports_status_next_run_idx").on(table.status, table.nextRunAt),
    index("google_meet_imports_lock_expires_idx").on(table.lockExpiresAt),
    index("google_meet_imports_call_id_idx").on(table.callId),
  ],
);
