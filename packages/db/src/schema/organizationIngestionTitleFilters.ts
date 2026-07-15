import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const ORGANIZATION_INGESTION_TITLE_FILTER_KINDS = [
  "include",
  "exclude",
] as const;

export const organizationIngestionTitleFiltersTable = pgTable(
  "organization_ingestion_title_filters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["include", "exclude"] }).notNull(),
    phrase: text("phrase").notNull(),
    normalizedPhrase: text("normalized_phrase").notNull(),
    createdBy: uuid("created_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("organization_ingestion_title_filters_org_kind_normalized_unique").on(
      table.orgId,
      table.kind,
      table.normalizedPhrase,
    ),
  ],
);
