import { jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { callProcessingJobsTable } from "./callProcessingJobs";

export const callProcessingCheckpointsTable = pgTable(
  "call_processing_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => callProcessingJobsTable.id, { onDelete: "cascade" }),
    manifestFingerprint: text("manifest_fingerprint").notNull(),
    transcriptHash: text("transcript_hash"),
    durationSeconds: real("duration_seconds"),
    mergedTranscript: jsonb("merged_transcript").$type<Array<Record<string, unknown>>>(),
    buyerPersonality: jsonb("buyer_personality").$type<{
      generatedAt: string;
      model: string;
      profile: Record<string, unknown>;
      status: "ready" | "needs_review";
    }>(),
    evaluation: jsonb("evaluation").$type<Record<string, unknown>>(),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("call_processing_checkpoints_job_manifest_uq").on(
      table.jobId,
      table.manifestFingerprint,
    ),
  ],
);
