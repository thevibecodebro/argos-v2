import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const teamPermissionGrantsTable = pgTable(
  "team_permission_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key").notNull(),
    grantedBy: uuid("granted_by").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("team_permission_grants_unique_user_team_permission").on(table.teamId, table.userId, table.permissionKey)],
);
