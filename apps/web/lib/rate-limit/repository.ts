import { sql } from "drizzle-orm";
import { getDb, rateLimitBucketsTable, type ArgosDb } from "@argos-v2/db";
import type {
  RateLimitBucketIncrement,
  RateLimitBucketInput,
  RateLimitRepository,
} from "./service";

export class DrizzleRateLimitRepository implements RateLimitRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async incrementBucket(input: RateLimitBucketInput): Promise<RateLimitBucketIncrement> {
    const [row] = await this.db
      .insert(rateLimitBucketsTable)
      .values({
        bucketKey: input.bucketKey,
        windowStart: input.windowStart,
        windowSeconds: input.windowSeconds,
        requestCount: 1,
      })
      .onConflictDoUpdate({
        target: [rateLimitBucketsTable.bucketKey, rateLimitBucketsTable.windowStart],
        set: {
          requestCount: sql`${rateLimitBucketsTable.requestCount} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        requestCount: rateLimitBucketsTable.requestCount,
        windowSeconds: rateLimitBucketsTable.windowSeconds,
        windowStart: rateLimitBucketsTable.windowStart,
      });

    return row;
  }
}
