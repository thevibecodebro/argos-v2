import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const zoomIntegrationsTable = pgTable(
  "zoom_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    connectedUserId: uuid("connected_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    webhookToken: text("webhook_token"),
    webhookId: text("webhook_id"),
    zoomUserId: text("zoom_user_id"),
    zoomAccountId: text("zoom_account_id"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("zoom_integrations_org_connected_user_unique").on(table.orgId, table.connectedUserId)],
);
