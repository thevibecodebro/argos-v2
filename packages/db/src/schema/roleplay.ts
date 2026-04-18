import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const roleplaySessionsTable = pgTable("roleplay_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  repId: uuid("rep_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  persona: text("persona"),
  industry: text("industry"),
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"],
  }),
  overallScore: integer("overall_score"),
  transcript: jsonb("transcript"),
  scorecard: jsonb("scorecard"),
  status: text("status", {
    enum: ["active", "evaluating", "complete"],
  })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});
