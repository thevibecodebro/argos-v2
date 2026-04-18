import { eq, sql } from "drizzle-orm";
import {
  callProcessingJobsTable,
  getDb,
  type ArgosDb,
} from "@argos-v2/db";

type CallProcessingJobRecord = typeof callProcessingJobsTable.$inferSelect;

type CallProcessingJobInsert = {
  callId: string;
  sourceOrigin: CallProcessingJobRecord["sourceOrigin"];
  sourceStoragePath: string;
  sourceFileName: string;
  sourceContentType?: string | null;
  sourceSizeBytes?: number | null;
  status?: CallProcessingJobRecord["status"];
};

type RetryableFailureInput = {
  now: Date;
  attemptCount: number;
  lastError: string;
  lastStage: NonNullable<CallProcessingJobRecord["lastStage"]>;
};

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    return ((result as { rows?: T[] }).rows ?? []) as T[];
  }

  return [];
}

export class CallProcessingRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async insertJob(input: CallProcessingJobInsert): Promise<CallProcessingJobRecord> {
    const [job] = await this.db
      .insert(callProcessingJobsTable)
      .values({
        callId: input.callId,
        sourceOrigin: input.sourceOrigin,
        sourceStoragePath: input.sourceStoragePath,
        sourceFileName: input.sourceFileName,
        sourceContentType: input.sourceContentType ?? null,
        sourceSizeBytes: input.sourceSizeBytes ?? null,
        status: input.status ?? "pending",
      })
      .returning();

    return job;
  }

  async findJobById(jobId: string): Promise<CallProcessingJobRecord | null> {
    const [job] = await this.db
      .select()
      .from(callProcessingJobsTable)
      .where(eq(callProcessingJobsTable.id, jobId))
      .limit(1);

    return job ?? null;
  }

  async claimNextJob(now = new Date()): Promise<CallProcessingJobRecord | null> {
    const leaseExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const rows = extractRows<CallProcessingJobRecord>(
      await this.db.execute(sql`
        update call_processing_jobs
        set
          status = 'running',
          attempt_count = attempt_count + 1,
          locked_at = ${now},
          lock_expires_at = ${leaseExpiresAt},
          updated_at = ${now}
        where id = (
          select id
          from call_processing_jobs
          where status in ('pending', 'retrying')
            and next_run_at <= ${now}
            and (lock_expires_at is null or lock_expires_at <= ${now})
          order by next_run_at asc, created_at asc
          limit 1
          for update skip locked
        )
        returning
          id,
          call_id as "callId",
          source_origin as "sourceOrigin",
          source_storage_path as "sourceStoragePath",
          source_file_name as "sourceFileName",
          source_content_type as "sourceContentType",
          source_size_bytes as "sourceSizeBytes",
          status,
          attempt_count as "attemptCount",
          max_attempts as "maxAttempts",
          next_run_at as "nextRunAt",
          locked_at as "lockedAt",
          lock_expires_at as "lockExpiresAt",
          last_stage as "lastStage",
          last_error as "lastError",
          created_at as "createdAt",
          updated_at as "updatedAt";
      `),
    );

    return rows[0] ?? null;
  }

  async markRetryableFailure(jobId: string, input: RetryableFailureInput): Promise<void> {
    const retryMinutes = input.attemptCount === 1 ? 2 : input.attemptCount === 2 ? 10 : 30;

    await this.db
      .update(callProcessingJobsTable)
      .set({
        status: "retrying",
        attemptCount: input.attemptCount,
        nextRunAt: new Date(input.now.getTime() + retryMinutes * 60 * 1000),
        lockedAt: null,
        lockExpiresAt: null,
        lastError: input.lastError,
        lastStage: input.lastStage,
        updatedAt: input.now,
      })
      .where(eq(callProcessingJobsTable.id, jobId));
  }
}
