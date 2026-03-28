import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").references(() => organizationsTable.id),
  role: text("role", { enum: ["rep", "manager", "executive", "admin"] }),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  displayNameSet: boolean("display_name_set").notNull().default(false),
  legacyReplitUserId: text("legacy_replit_user_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

