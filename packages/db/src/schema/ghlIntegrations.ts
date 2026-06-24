import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const ghlIntegrationsTable = pgTable(
  "ghl_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .unique()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull(),
    locationName: text("location_name"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    syncEnabled: boolean("sync_enabled").notNull().default(false),
    consentConfirmedAt: timestamp("consent_confirmed_at", { withTimezone: true }),
    consentConfirmedBy: uuid("consent_confirmed_by").references(() => usersTable.id, { onDelete: "set null" }),
    defaultRepId: uuid("default_rep_id").references(() => usersTable.id, { onDelete: "set null" }),
    lastSyncStartedAt: timestamp("last_sync_started_at", { withTimezone: true }),
    lastSyncCompletedAt: timestamp("last_sync_completed_at", { withTimezone: true }),
    lastSyncCursor: text("last_sync_cursor"),
    lastSyncError: text("last_sync_error"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("ghl_integrations_location_id_unique").on(table.locationId)],
);
