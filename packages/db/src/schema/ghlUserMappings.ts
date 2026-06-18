import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const ghlUserMappingsTable = pgTable(
  "ghl_user_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull(),
    ghlUserId: text("ghl_user_id").notNull(),
    ghlUserName: text("ghl_user_name"),
    ghlUserEmail: text("ghl_user_email"),
    argosUserId: uuid("argos_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("ghl_user_mappings_location_user_unique").on(
      table.orgId,
      table.locationId,
      table.ghlUserId,
    ),
  ],
);
