import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const rateLimitBucketsTable = pgTable(
  "rate_limit_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketKey: text("bucket_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("rate_limit_buckets_key_window_uq").on(table.bucketKey, table.windowStart),
    index("rate_limit_buckets_window_start_idx").on(table.windowStart),
    check("rate_limit_buckets_window_seconds_positive", sql`${table.windowSeconds} > 0`),
    check("rate_limit_buckets_request_count_nonnegative", sql`${table.requestCount} >= 0`),
  ],
);
