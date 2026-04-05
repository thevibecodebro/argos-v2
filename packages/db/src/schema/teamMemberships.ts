import { foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const teamMembershipsTable = pgTable(
  "team_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull(),
    userId: uuid("user_id").notNull(),
    membershipType: text("membership_type", {
      enum: ["rep", "manager"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("team_memberships_unique_user_team_type").on(table.teamId, table.userId, table.membershipType),
    foreignKey({
      name: "team_memberships_team_org_id_teams_id_org_id_fkey",
      columns: [table.teamId, table.orgId],
      foreignColumns: [teamsTable.id, teamsTable.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "team_memberships_user_org_id_users_id_org_id_fkey",
      columns: [table.userId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
    }).onDelete("cascade"),
  ],
);
