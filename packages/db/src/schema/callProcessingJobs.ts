import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { callsTable } from "./calls";

export const CALL_PROCESSING_JOB_ORIGINS = ["manual_upload", "zoom_recording"] as const;
export const CALL_PROCESSING_JOB_STATUSES = [
  "pending",
  "running",
  "retrying",
  "failed",
  "complete",
] as const;
export const CALL_PROCESSING_JOB_STAGES = [
  "download",
  "normalize",
  "chunk",
  "transcribe",
  "score",
  "persist",
] as const;

export const callProcessingJobsTable = pgTable(
  "call_processing_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    callId: uuid("call_id")
      .notNull()
      .references(() => callsTable.id, { onDelete: "cascade" })
      .unique(),
    sourceOrigin: text("source_origin", { enum: CALL_PROCESSING_JOB_ORIGINS }).notNull(),
    sourceStoragePath: text("source_storage_path").notNull(),
    sourceFileName: text("source_file_name").notNull(),
    sourceContentType: text("source_content_type"),
    sourceSizeBytes: integer("source_size_bytes"),
    status: text("status", { enum: CALL_PROCESSING_JOB_STATUSES }).notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
    lastStage: text("last_stage", { enum: CALL_PROCESSING_JOB_STAGES }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("call_processing_jobs_status_next_run_idx").on(table.status, table.nextRunAt),
    index("call_processing_jobs_lock_expires_idx").on(table.lockExpiresAt),
  ],
);
