import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["call_scored", "recording_ready", "annotation_added", "module_assigned"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  dedupeKey: text("dedupe_key"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("notifications_dedupe_key_uq").on(table.dedupeKey)]);
