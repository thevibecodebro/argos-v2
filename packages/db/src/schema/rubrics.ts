import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const rubricTracksTable = pgTable(
  "rubric_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("rubric_tracks_id_org_id_uq").on(table.id, table.orgId),
    uniqueIndex("rubric_tracks_org_name_uq").on(table.orgId, sql`lower(${table.name})`),
    uniqueIndex("rubric_tracks_one_default_org_uq")
      .on(table.orgId)
      .where(sql`${table.isDefault} = true`),
    check("rubric_tracks_name_not_blank_check", sql`btrim(${table.name}) <> ''`),
  ],
);

export const rubricsTable = pgTable(
  "rubrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
    trackId: uuid("track_id"),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    isTemplate: boolean("is_template").notNull().default(false),
    createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "rubrics_track_org_fkey",
      columns: [table.trackId, table.orgId],
      foreignColumns: [rubricTracksTable.id, rubricTracksTable.orgId],
    }).onDelete("restrict"),
    uniqueIndex("rubrics_track_version_uq")
      .on(table.trackId, table.version)
      .where(sql`${table.trackId} is not null`),
    uniqueIndex("rubrics_one_active_track_uq")
      .on(table.trackId)
      .where(sql`${table.isActive} = true and ${table.trackId} is not null`),
  ],
);

export const teamRubricAssignmentsTable = pgTable(
  "team_rubric_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull(),
    trackId: uuid("track_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("team_rubric_assignments_team_uq").on(table.teamId),
    index("team_rubric_assignments_org_track_idx").on(table.orgId, table.trackId),
    foreignKey({
      name: "team_rubric_assignments_team_org_fkey",
      columns: [table.teamId, table.orgId],
      foreignColumns: [teamsTable.id, teamsTable.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "team_rubric_assignments_track_org_fkey",
      columns: [table.trackId, table.orgId],
      foreignColumns: [rubricTracksTable.id, rubricTracksTable.orgId],
    }).onDelete("cascade"),
  ],
);

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
