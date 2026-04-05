import { foreignKey, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const repManagerAssignmentsTable = pgTable(
  "rep_manager_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    repId: uuid("rep_id").notNull(),
    managerId: uuid("manager_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("rep_manager_assignments_unique_rep").on(table.repId),
    foreignKey({
      name: "rep_manager_assignments_rep_org_id_users_id_org_id_fkey",
      columns: [table.repId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "rep_manager_assignments_manager_org_id_users_id_org_id_fkey",
      columns: [table.managerId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
    }).onDelete("cascade"),
  ],
);
