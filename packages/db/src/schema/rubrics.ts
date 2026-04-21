import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const rubricsTable = pgTable("rubrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isTemplate: boolean("is_template").notNull().default(false),
  createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rubricCategoriesTable = pgTable("rubric_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  rubricId: uuid("rubric_id")
    .notNull()
    .references(() => rubricsTable.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  weight: numeric("weight", { precision: 10, scale: 2 }).notNull().default("1.00"),
  sortOrder: integer("sort_order").notNull().default(0),
  scoringCriteria: jsonb("scoring_criteria").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
