import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const trainingModulesTable = pgTable("training_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  title: text("title"),
  description: text("description"),
  skillCategory: text("skill_category"),
  videoUrl: text("video_url"),
  quizData: jsonb("quiz_data"),
  orderIndex: integer("order_index"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainingProgressTable = pgTable(
  "training_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repId: uuid("rep_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => trainingModulesTable.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["assigned", "in_progress", "passed", "failed"],
    })
      .notNull()
      .default("assigned"),
    score: integer("score"),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    assignedBy: uuid("assigned_by").references(() => usersTable.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
  },
  (table) => [unique("training_progress_rep_module_unique").on(table.repId, table.moduleId)],
);
