import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const orgComplianceTable = pgTable("org_compliance", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  acknowledgedBy: uuid("acknowledged_by")
    .notNull()
    .references(() => usersTable.id),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  tosVersion: text("tos_version"),
  metadata: jsonb("metadata"),
});
