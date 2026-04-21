import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { rubricCategoriesTable, rubricsTable } from "./rubrics";
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
  frameControlScore: integer("frame_control_score"),
  rapportScore: integer("rapport_score"),
  discoveryScore: integer("discovery_score"),
  painExpansionScore: integer("pain_expansion_score"),
  solutionScore: integer("solution_score"),
  objectionScore: integer("objection_score"),
  closingScore: integer("closing_score"),
  confidence: text("confidence"),
  callStageReached: text("call_stage_reached"),
  strengths: jsonb("strengths"),
  improvements: jsonb("improvements"),
  recommendedDrills: jsonb("recommended_drills"),
  callTopic: text("call_topic"),
  transcript: jsonb("transcript"),
  crmDealId: text("crm_deal_id"),
  rubricId: uuid("rubric_id").references(() => rubricsTable.id, { onDelete: "set null" }),
  zoomRecordingId: text("zoom_recording_id").unique(),
  zoomMeetingId: text("zoom_meeting_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const callMomentsTable = pgTable("call_moments", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => callsTable.id, { onDelete: "cascade" }),
  timestampSeconds: integer("timestamp_seconds"),
  category: text("category"),
  observation: text("observation"),
  recommendation: text("recommendation"),
  severity: text("severity", {
    enum: ["strength", "improvement", "critical"],
  }),
  isHighlight: boolean("is_highlight").notNull().default(false),
  highlightNote: text("highlight_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const callAnnotationsTable = pgTable("call_annotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => callsTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  timestampSeconds: integer("timestamp_seconds"),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const callScoresTable = pgTable("call_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => callsTable.id, { onDelete: "cascade" }),
  rubricCategoryId: uuid("rubric_category_id")
    .notNull()
    .references(() => rubricCategoriesTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
