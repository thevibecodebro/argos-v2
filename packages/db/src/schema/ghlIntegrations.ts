import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const ghlIntegrationsTable = pgTable("ghl_integrations", {
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
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
