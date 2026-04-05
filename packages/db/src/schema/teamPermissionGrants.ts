import { foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
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
    teamId: uuid("team_id").notNull(),
    userId: uuid("user_id").notNull(),
    permissionKey: text("permission_key", {
      enum: [
        "view_team_calls",
        "coach_team_calls",
        "manage_call_highlights",
        "view_team_training",
        "manage_team_training",
        "manage_team_roster",
        "view_team_analytics",
      ],
    }).notNull(),
    grantedBy: uuid("granted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("team_permission_grants_unique_user_team_permission").on(table.teamId, table.userId, table.permissionKey),
    foreignKey({
      name: "team_permission_grants_team_org_id_teams_id_org_id_fkey",
      columns: [table.teamId, table.orgId],
      foreignColumns: [teamsTable.id, teamsTable.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "team_permission_grants_user_org_id_users_id_org_id_fkey",
      columns: [table.userId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "team_permission_grants_granted_by_org_id_users_id_org_id_fkey",
      columns: [table.grantedBy, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
    }),
  ],
);
