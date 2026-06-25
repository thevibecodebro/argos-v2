import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const organizationsTable = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("trial"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  logoUrl: text("logo_url"),
  workspaceTheme: jsonb("workspace_theme").$type<Record<string, unknown> | null>(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: uuid("archived_by"),
  archiveReason: text("archive_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
