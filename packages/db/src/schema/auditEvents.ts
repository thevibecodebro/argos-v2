import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const auditEventsTable = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
    eventType: text("event_type", {
      enum: ["call_exported", "call_deleted"],
    }).notNull(),
    resourceType: text("resource_type", {
      enum: ["call"],
    }).notNull(),
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_org_created_at_idx").on(table.orgId, table.createdAt),
    index("audit_events_actor_created_at_idx").on(table.actorId, table.createdAt),
    index("audit_events_resource_idx").on(table.resourceType, table.resourceId),
  ],
);

