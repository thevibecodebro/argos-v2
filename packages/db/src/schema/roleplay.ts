import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { callsTable } from "./calls";
import { organizationsTable } from "./organizations";
import { rubricsTable } from "./rubrics";
import { usersTable } from "./users";

export const roleplaySessionsTable = pgTable(
  "roleplay_sessions",
  {
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
    origin: text("origin", {
      enum: ["manual", "generated_from_call"],
    })
      .notNull()
      .default("manual"),
    sourceCallId: uuid("source_call_id").references(() => callsTable.id, { onDelete: "set null" }),
    rubricId: uuid("rubric_id").references(() => rubricsTable.id, { onDelete: "set null" }),
    focusMode: text("focus_mode", {
      enum: ["all", "category"],
    })
      .notNull()
      .default("all"),
    focusCategorySlug: text("focus_category_slug"),
    scenarioSummary: text("scenario_summary"),
    scenarioBrief: text("scenario_brief"),
    transcript: jsonb("transcript"),
    scorecard: jsonb("scorecard"),
    status: text("status", {
      enum: ["active", "evaluating", "complete"],
    })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "roleplay_sessions_source_call_origin_check",
      sql`(${table.origin} = 'manual' and ${table.sourceCallId} is null) or (${table.origin} = 'generated_from_call' and ${table.sourceCallId} is not null)`,
    ),
    check(
      "roleplay_sessions_focus_mode_category_slug_check",
      sql`(${table.focusMode} = 'all' and ${table.focusCategorySlug} is null) or (${table.focusMode} = 'category' and ${table.focusCategorySlug} is not null)`,
    ),
  ],
);
