import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const platformStaffTable = pgTable(
  "platform_staff",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "operator"] }).notNull(),
    status: text("status", { enum: ["active", "revoked"] })
      .notNull()
      .default("active"),
    createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    revokedBy: uuid("revoked_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("platform_staff_status_role_idx").on(table.status, table.role),
    index("platform_staff_created_by_idx").on(table.createdBy),
    index("platform_staff_revoked_by_idx").on(table.revokedBy),
    check("platform_staff_role_check", sql`${table.role} in ('owner', 'operator')`),
    check("platform_staff_status_check", sql`${table.status} in ('active', 'revoked')`),
  ],
);

export const platformAccessSessionsTable = pgTable(
  "platform_access_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffUserId: uuid("staff_user_id")
      .references(() => platformStaffTable.userId, { onDelete: "set null" }),
    targetOrgId: uuid("target_org_id")
      .references(() => organizationsTable.id, { onDelete: "set null" }),
    staffEmailSnapshot: text("staff_email_snapshot"),
    staffRoleSnapshot: text("staff_role_snapshot", { enum: ["owner", "operator"] }),
    targetOrgNameSnapshot: text("target_org_name_snapshot"),
    targetOrgSlugSnapshot: text("target_org_slug_snapshot"),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["active", "ended", "expired"] })
      .notNull()
      .default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("platform_access_sessions_staff_status_expires_idx").on(
      table.staffUserId,
      table.status,
      table.expiresAt,
    ),
    index("platform_access_sessions_target_org_idx").on(table.targetOrgId),
    index("platform_access_sessions_active_lookup_idx")
      .on(table.id, table.staffUserId, table.expiresAt)
      .where(sql`${table.status} = 'active'`),
    check("platform_access_sessions_status_check", sql`${table.status} in ('active', 'ended', 'expired')`),
    check("platform_access_sessions_expires_after_started_check", sql`${table.expiresAt} > ${table.startedAt}`),
  ],
);

export const platformAuditEventsTable = pgTable(
  "platform_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffUserId: uuid("staff_user_id").references(() => platformStaffTable.userId, { onDelete: "set null" }),
    targetOrgId: uuid("target_org_id").references(() => organizationsTable.id, { onDelete: "set null" }),
    sessionId: uuid("session_id").references(() => platformAccessSessionsTable.id, { onDelete: "set null" }),
    staffEmailSnapshot: text("staff_email_snapshot"),
    staffRoleSnapshot: text("staff_role_snapshot", { enum: ["owner", "operator"] }),
    targetOrgNameSnapshot: text("target_org_name_snapshot"),
    targetOrgSlugSnapshot: text("target_org_slug_snapshot"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    reason: text("reason").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("platform_audit_events_target_org_created_at_idx").on(table.targetOrgId, table.createdAt),
    index("platform_audit_events_staff_created_at_idx").on(table.staffUserId, table.createdAt),
    index("platform_audit_events_session_id_idx").on(table.sessionId),
    index("platform_audit_events_resource_idx").on(table.resourceType, table.resourceId),
  ],
);
