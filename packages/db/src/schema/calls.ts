import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const callsTable = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  repId: uuid("rep_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  recordingUrl: text("recording_url"),
  transcriptUrl: text("transcript_url"),
  durationSeconds: integer("duration_seconds"),
  status: text("status", {
    enum: ["uploaded", "transcribing", "evaluating", "complete", "failed"],
  })
    .notNull()
    .default("uploaded"),
  consentConfirmed: boolean("consent_confirmed").notNull().default(false),
  overallScore: integer("overall_score"),
  callTopic: text("call_topic"),
  crmDealId: text("crm_deal_id"),
  zoomRecordingId: text("zoom_recording_id").unique(),
  zoomMeetingId: text("zoom_meeting_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
