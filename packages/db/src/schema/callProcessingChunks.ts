import { index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { callProcessingJobsTable } from "./callProcessingJobs";

export const CALL_PROCESSING_CHUNK_STATUSES = [
  "pending",
  "running",
  "retrying",
  "complete",
  "failed",
] as const;

export const callProcessingChunksTable = pgTable(
  "call_processing_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => callProcessingJobsTable.id, { onDelete: "cascade" }),
    manifestFingerprint: text("manifest_fingerprint").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    startSeconds: real("start_seconds").notNull(),
    endSeconds: real("end_seconds").notNull(),
    audioHash: text("audio_hash"),
    status: text("status", { enum: CALL_PROCESSING_CHUNK_STATUSES }).notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    providerRequestId: text("provider_request_id"),
    latencyMs: integer("latency_ms"),
    transcript: jsonb("transcript").$type<Array<Record<string, unknown>>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("call_processing_chunks_manifest_index_uq").on(
      table.jobId,
      table.manifestFingerprint,
      table.chunkIndex,
    ),
    index("call_processing_chunks_job_status_idx").on(table.jobId, table.status),
  ],
);
