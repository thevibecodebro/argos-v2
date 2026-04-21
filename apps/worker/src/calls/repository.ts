import { asc, eq, sql } from "drizzle-orm";
import {
  callMomentsTable,
  callProcessingJobsTable,
  callScoresTable,
  callsTable,
  getDb,
  notificationsTable,
  rubricCategoriesTable,
  rubricsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type { CallEvaluation, ScoringRubric, ScoringRubricCategory } from "@argos-v2/call-processing";

type CallProcessingJobRecord = typeof callProcessingJobsTable.$inferSelect;
type ClaimedCallProcessingJobRecord = CallProcessingJobRecord & {
  repId: string;
  callTopic: string | null;
};
type CallStatus = typeof callsTable.$inferSelect.status;

type CallProcessingJobInsert = {
  callId: string;
  rubricId?: string | null;
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

type CompletedJobInput = {
  now: Date;
  lastStage: NonNullable<CallProcessingJobRecord["lastStage"]>;
};

type FailedJobInput = {
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

function toDate(value: Date | string | null, fieldName: string): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`CallProcessingRepository received invalid ${fieldName}: ${String(value)}`);
  }

  return date;
}

function requireDate(value: Date | string | null, fieldName: string): Date {
  const date = toDate(value, fieldName);

  if (!date) {
    throw new Error(`CallProcessingRepository received missing ${fieldName}`);
  }

  return date;
}

function normalizeJobRecord<T extends CallProcessingJobRecord>(row: T): T {
  return {
    ...row,
    nextRunAt: requireDate(row.nextRunAt, "nextRunAt"),
    lockedAt: toDate(row.lockedAt, "lockedAt"),
    lockExpiresAt: toDate(row.lockExpiresAt, "lockExpiresAt"),
    createdAt: requireDate(row.createdAt, "createdAt"),
    updatedAt: requireDate(row.updatedAt, "updatedAt"),
  };
}

export class CallProcessingRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async insertJob(input: CallProcessingJobInsert): Promise<CallProcessingJobRecord> {
    const [job] = await this.db
      .insert(callProcessingJobsTable)
      .values({
        callId: input.callId,
        rubricId: input.rubricId ?? null,
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

  async claimNextJob(now = new Date()): Promise<ClaimedCallProcessingJobRecord | null> {
    const leaseExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const rows = extractRows<ClaimedCallProcessingJobRecord>(
      await this.db.execute(sql`
        with claimed as (
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
            rubric_id as "rubricId",
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
            updated_at as "updatedAt"
        )
        select
          claimed.id,
          claimed."callId",
          claimed."rubricId",
          claimed."sourceOrigin",
          claimed."sourceStoragePath",
          claimed."sourceFileName",
          claimed."sourceContentType",
          claimed."sourceSizeBytes",
          claimed.status,
          claimed."attemptCount",
          claimed."maxAttempts",
          claimed."nextRunAt",
          claimed."lockedAt",
          claimed."lockExpiresAt",
          claimed."lastStage",
          claimed."lastError",
          claimed."createdAt",
          claimed."updatedAt",
          calls.rep_id as "repId",
          calls.call_topic as "callTopic"
        from claimed
        inner join calls on calls.id = claimed."callId";
      `),
    );

    const row = rows[0];

    return row ? normalizeJobRecord(row) : null;
  }

  async findRubricById(rubricId: string): Promise<ScoringRubric | null> {
    const [rubric] = await this.db
      .select({
        id: rubricsTable.id,
        name: rubricsTable.name,
        version: rubricsTable.version,
      })
      .from(rubricsTable)
      .where(eq(rubricsTable.id, rubricId))
      .limit(1);

    if (!rubric) {
      return null;
    }

    const categories = await this.db
      .select({
        id: rubricCategoriesTable.id,
        slug: rubricCategoriesTable.slug,
        name: rubricCategoriesTable.name,
        description: rubricCategoriesTable.description,
        weight: rubricCategoriesTable.weight,
        scoringCriteria: rubricCategoriesTable.scoringCriteria,
      })
      .from(rubricCategoriesTable)
      .where(eq(rubricCategoriesTable.rubricId, rubricId))
      .orderBy(asc(rubricCategoriesTable.sortOrder), asc(rubricCategoriesTable.createdAt));

    return {
      id: rubric.id,
      name: rubric.name,
      version: rubric.version,
      categories: categories.map((category) => ({
        ...category,
        weight: Number(category.weight),
        scoringCriteria: category.scoringCriteria as ScoringRubricCategory["scoringCriteria"],
      })),
    };
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

  async markCompleted(jobId: string, input: CompletedJobInput): Promise<void> {
    await this.db
      .update(callProcessingJobsTable)
      .set({
        status: "complete",
        lockedAt: null,
        lockExpiresAt: null,
        lastStage: input.lastStage,
        lastError: null,
        updatedAt: input.now,
      })
      .where(eq(callProcessingJobsTable.id, jobId));
  }

  async markFailed(jobId: string, input: FailedJobInput): Promise<void> {
    await this.db
      .update(callProcessingJobsTable)
      .set({
        status: "failed",
        attemptCount: input.attemptCount,
        lockedAt: null,
        lockExpiresAt: null,
        lastStage: input.lastStage,
        lastError: input.lastError,
        updatedAt: input.now,
      })
      .where(eq(callProcessingJobsTable.id, jobId));
  }

  async markJobComplete(jobId: string, now = new Date()): Promise<void> {
    await this.markCompleted(jobId, {
      now,
      lastStage: "persist",
    });
  }

  async markTerminalFailure(jobId: string, input: FailedJobInput): Promise<void> {
    await this.markFailed(jobId, input);
  }

  async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    await this.db
      .update(callsTable)
      .set({ status })
      .where(eq(callsTable.id, callId));
  }

  async setCallEvaluation(callId: string, evaluation: CallEvaluation): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(callsTable)
        .set({
          status: "complete",
          durationSeconds: evaluation.durationSeconds,
          overallScore: evaluation.overallScore,
          rubricId: evaluation.rubricId,
          frameControlScore: evaluation.frameControlScore,
          rapportScore: evaluation.rapportScore,
          discoveryScore: evaluation.discoveryScore,
          painExpansionScore: evaluation.painExpansionScore,
          solutionScore: evaluation.solutionScore,
          objectionScore: evaluation.objectionScore,
          closingScore: evaluation.closingScore,
          confidence: evaluation.confidence,
          callStageReached: evaluation.callStageReached,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          recommendedDrills: evaluation.recommendedDrills,
          transcript: evaluation.transcript,
        })
        .where(eq(callsTable.id, callId));

      await tx.delete(callScoresTable).where(eq(callScoresTable.callId, callId));
      await tx.delete(callMomentsTable).where(eq(callMomentsTable.callId, callId));

      const categoryScores = evaluation.categoryScores.filter(
        (category) => category.categoryId,
      );

      if (categoryScores.length > 0) {
        await tx.insert(callScoresTable).values(
          categoryScores.map((category) => ({
            callId,
            rubricCategoryId: category.categoryId!,
            score: category.score,
          })),
        );
      }

      if (evaluation.moments.length > 0) {
        await tx.insert(callMomentsTable).values(
          evaluation.moments.map((moment) => ({
            callId,
            timestampSeconds: moment.timestampSeconds,
            category: moment.category,
            observation: moment.observation,
            recommendation: moment.recommendation,
            severity: moment.severity,
            isHighlight: moment.isHighlight,
            highlightNote: moment.highlightNote,
          })),
        );
      }
    });
  }

  async createNotification(input: {
    body: string;
    link: string | null;
    title: string;
    type: "call_scored" | "annotation_added" | "module_assigned";
    userId: string;
  }): Promise<void> {
    await this.db.insert(notificationsTable).values(input);
  }
}
