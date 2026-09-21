import { and, asc, eq, sql } from "drizzle-orm";
import {
  callMomentsTable,
  callProcessingCheckpointsTable,
  callProcessingChunksTable,
  callProcessingJobsTable,
  callScoresTable,
  callsTable,
  getDb,
  notificationsTable,
  organizationHasManagedCapability,
  rubricCategoriesTable,
  rubricsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type {
  BuyerPersonalityProfile,
  CallEvaluation,
  ScoringRubric,
  ScoringRubricCategory,
  TranscriptLine,
} from "@argos-v2/call-processing";
import type { ChunkCheckpoint, Lease, WriteOutcome } from "./processing-checkpoints";

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
  processingVersion?: number;
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
    heartbeatAt: toDate(row.heartbeatAt, "heartbeatAt"),
    processingStartedAt: toDate(row.processingStartedAt, "processingStartedAt"),
    processingDeadlineAt: toDate(row.processingDeadlineAt, "processingDeadlineAt"),
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
        processingVersion: input.processingVersion ?? 1,
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

  async organizationHasCallScoringCapability(callId: string) {
    const [call] = await this.db
      .select({ orgId: callsTable.orgId })
      .from(callsTable)
      .where(eq(callsTable.id, callId))
      .limit(1);

    return call
      ? organizationHasManagedCapability(this.db, call.orgId, "call_scoring")
      : false;
  }

  async getCallProcessingCapabilities(callId: string) {
    const [call] = await this.db
      .select({ orgId: callsTable.orgId })
      .from(callsTable)
      .where(eq(callsTable.id, callId))
      .limit(1);

    if (!call) {
      return { canGenerateBuyerPersonality: false, canScoreCall: false };
    }

    const [canScoreCall, roleplay, customScenarios, callUpload, callIngestion] = await Promise.all([
      organizationHasManagedCapability(this.db, call.orgId, "call_scoring"),
      organizationHasManagedCapability(this.db, call.orgId, "roleplay"),
      organizationHasManagedCapability(this.db, call.orgId, "custom_scenarios"),
      organizationHasManagedCapability(this.db, call.orgId, "call_upload"),
      organizationHasManagedCapability(this.db, call.orgId, "call_ingestion"),
    ]);

    return {
      canGenerateBuyerPersonality: roleplay && customScenarios && (callUpload || callIngestion),
      canScoreCall,
    };
  }

  async claimNextJob(now = new Date(), processingMaxElapsedMs = 6 * 60 * 60 * 1_000): Promise<ClaimedCallProcessingJobRecord | null> {
    const leaseExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const processingDeadlineAt = new Date(now.getTime() + processingMaxElapsedMs);
    await this.db.execute(sql`
      with expired as (
        update call_processing_jobs
        set status = 'failed', last_error = 'Processing exceeded the configured elapsed-time limit',
          locked_at = null, lock_expires_at = null, lease_token = null, heartbeat_at = null,
          updated_at = ${now}
        where processing_version = 2
          and status in ('pending', 'retrying', 'running')
          and processing_deadline_at is not null
          and processing_deadline_at <= ${now}
        returning call_id
      )
      update calls set status = 'failed'
      where id in (select call_id from expired)
    `);
    const rows = extractRows<ClaimedCallProcessingJobRecord>(
      await this.db.execute(sql`
        with claimed as (
          update call_processing_jobs
          set
            status = 'running',
            attempt_count = attempt_count + 1,
            locked_at = ${now},
            lock_expires_at = ${leaseExpiresAt},
            lease_token = gen_random_uuid(),
            heartbeat_at = ${now},
            processing_started_at = coalesce(processing_started_at, ${now}),
            processing_deadline_at = coalesce(processing_deadline_at, ${processingDeadlineAt}),
            updated_at = ${now}
          where id = (
            select id
            from call_processing_jobs
            where (
                (processing_version = 1 and attempt_count < max_attempts)
                or
                (processing_version = 2 and failure_count < max_failures and coalesce(processing_deadline_at, ${processingDeadlineAt}) > ${now})
              )
              and (
                (
                  status in ('pending', 'retrying')
                  and next_run_at <= ${now}
                  and (lock_expires_at is null or lock_expires_at <= ${now})
                )
                or (
                  status = 'running'
                  and lock_expires_at <= ${now}
                )
              )
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
            processing_version as "processingVersion",
            generation,
            failure_count as "failureCount",
            max_failures as "maxFailures",
            total_chunks as "totalChunks",
            completed_chunks as "completedChunks",
            next_run_at as "nextRunAt",
            locked_at as "lockedAt",
            lock_expires_at as "lockExpiresAt",
            lease_token as "leaseToken",
            heartbeat_at as "heartbeatAt",
            processing_started_at as "processingStartedAt",
            processing_deadline_at as "processingDeadlineAt",
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
          claimed."processingVersion",
          claimed.generation,
          claimed."failureCount",
          claimed."maxFailures",
          claimed."totalChunks",
          claimed."completedChunks",
          claimed."nextRunAt",
          claimed."lockedAt",
          claimed."lockExpiresAt",
          claimed."leaseToken",
          claimed."heartbeatAt",
          claimed."processingStartedAt",
          claimed."processingDeadlineAt",
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

  async renewLease(lease: Lease): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_jobs
      set heartbeat_at = now(), lock_expires_at = now() + interval '15 minutes', updated_at = now()
      where id = ${lease.jobId}
        and lease_token = ${lease.token}::uuid
        and status = 'running'
        and lock_expires_at > now()
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async updateCallStatusForLease(lease: Lease, callId: string, status: CallStatus): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update calls
      set status = ${status}
      where id = ${callId}
        and exists (
          select 1 from call_processing_jobs
          where id = ${lease.jobId} and lease_token = ${lease.token}::uuid
            and status = 'running' and lock_expires_at > now()
        )
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async updateBuyerProfileStatusForLease(
    lease: Lease,
    callId: string,
    status: "pending" | "processing" | "ready" | "needs_review" | "failed",
  ): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update calls
      set buyer_profile_status = ${status}
      where id = ${callId}
        and exists (
          select 1 from call_processing_jobs
          where id = ${lease.jobId} and lease_token = ${lease.token}::uuid
            and status = 'running' and lock_expires_at > now()
        )
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async listCompletedChunks(jobId: string, fingerprint: string): Promise<ChunkCheckpoint[]> {
    const rows = await this.db
      .select()
      .from(callProcessingChunksTable)
      .where(and(
        eq(callProcessingChunksTable.jobId, jobId),
        eq(callProcessingChunksTable.manifestFingerprint, fingerprint),
        eq(callProcessingChunksTable.status, "complete"),
      ));
    return rows.map((row) => ({
      audioHash: row.audioHash ?? "",
      endSeconds: row.endSeconds,
      fingerprint: row.manifestFingerprint,
      index: row.chunkIndex,
      startSeconds: row.startSeconds,
      transcript: (row.transcript ?? []) as unknown as TranscriptLine[],
    }));
  }

  async setChunkManifest(lease: Lease, input: { fingerprint: string; totalChunks: number }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_jobs
      set total_chunks = ${input.totalChunks},
        completed_chunks = (
          select count(*)::integer from call_processing_chunks
          where job_id = ${lease.jobId} and manifest_fingerprint = ${input.fingerprint} and status = 'complete'
        ),
        updated_at = now()
      where id = ${lease.jobId} and lease_token = ${lease.token}::uuid
        and status = 'running' and lock_expires_at > now()
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async beginChunkAttempt(lease: Lease, input: Omit<ChunkCheckpoint, "transcript">): Promise<number | "lost_lease"> {
    const rows = extractRows<{ attemptCount: number }>(await this.db.execute(sql`
      insert into call_processing_chunks (
        job_id, manifest_fingerprint, chunk_index, start_seconds, end_seconds,
        audio_hash, status, attempt_count, created_at, updated_at
      )
      select ${lease.jobId}, ${input.fingerprint}, ${input.index}, ${input.startSeconds},
        ${input.endSeconds}, ${input.audioHash}, 'running', 1, now(), now()
      where exists (
        select 1 from call_processing_jobs
        where id = ${lease.jobId} and lease_token = ${lease.token}::uuid
          and status = 'running' and lock_expires_at > now()
      )
      on conflict (job_id, manifest_fingerprint, chunk_index) do update
        set status = 'running', attempt_count = call_processing_chunks.attempt_count + 1,
          audio_hash = excluded.audio_hash, error_code = null, error_message = null, updated_at = now()
      returning attempt_count as "attemptCount"
    `));
    return rows[0]?.attemptCount ?? "lost_lease";
  }

  async saveCompletedChunk(lease: Lease, input: ChunkCheckpoint & { latencyMs: number; providerRequestId: string | null }): Promise<WriteOutcome> {
    return this.db.transaction(async (tx) => {
      const rows = extractRows(await tx.execute(sql`
        update call_processing_chunks as chunk
        set status = 'complete', transcript = ${JSON.stringify(input.transcript)}::jsonb,
          latency_ms = ${input.latencyMs}, provider_request_id = ${input.providerRequestId},
          error_code = null, error_message = null, next_run_at = null, updated_at = now()
        where chunk.job_id = ${lease.jobId}
          and chunk.manifest_fingerprint = ${input.fingerprint}
          and chunk.chunk_index = ${input.index}
          and exists (
            select 1 from call_processing_jobs job
            where job.id = ${lease.jobId} and job.lease_token = ${lease.token}::uuid
              and job.status = 'running' and job.lock_expires_at > now()
          )
        returning chunk.id
      `));
      if (rows.length !== 1) return "lost_lease" as const;
      await tx.execute(sql`
        update call_processing_jobs
        set completed_chunks = (
          select count(*)::integer from call_processing_chunks
          where job_id = ${lease.jobId} and manifest_fingerprint = ${input.fingerprint} and status = 'complete'
        ), updated_at = now()
        where id = ${lease.jobId} and lease_token = ${lease.token}::uuid and status = 'running'
      `);
      return "written" as const;
    });
  }

  async saveChunkFailure(lease: Lease, input: {
    attemptCount: number;
    errorCode: string;
    errorMessage: string;
    fingerprint: string;
    index: number;
    nextRunAt: Date | null;
    providerRequestId: string | null;
  }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_chunks as chunk
      set status = ${input.nextRunAt ? "retrying" : "failed"},
        error_code = ${input.errorCode}, error_message = ${input.errorMessage},
        provider_request_id = ${input.providerRequestId}, next_run_at = ${input.nextRunAt}, updated_at = now()
      where chunk.job_id = ${lease.jobId}
        and chunk.manifest_fingerprint = ${input.fingerprint}
        and chunk.chunk_index = ${input.index}
        and chunk.attempt_count = ${input.attemptCount}
        and exists (
          select 1 from call_processing_jobs job
          where job.id = ${lease.jobId} and job.lease_token = ${lease.token}::uuid
            and job.status = 'running' and job.lock_expires_at > now()
        )
      returning chunk.id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async releaseForRetry(lease: Lease, input: { lastError: string; nextRunAt: Date }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_jobs
      set status = 'retrying', next_run_at = ${input.nextRunAt}, last_stage = 'transcribe',
        last_error = ${input.lastError}, locked_at = null, lock_expires_at = null,
        lease_token = null, heartbeat_at = null, updated_at = now()
      where id = ${lease.jobId} and lease_token = ${lease.token}::uuid and status = 'running'
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async markV2RetryableFailure(lease: Lease, input: {
    lastError: string;
    lastStage: NonNullable<CallProcessingJobRecord["lastStage"]>;
    nextRunAt: Date;
  }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_jobs
      set status = 'retrying', failure_count = failure_count + 1,
        next_run_at = ${input.nextRunAt}, last_stage = ${input.lastStage},
        last_error = ${input.lastError}, locked_at = null, lock_expires_at = null,
        lease_token = null, heartbeat_at = null, updated_at = now()
      where id = ${lease.jobId} and lease_token = ${lease.token}::uuid
        and status = 'running' and failure_count + 1 < max_failures
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async markV2TerminalFailure(lease: Lease, input: {
    buyerProfileFailed?: boolean;
    callId: string;
    lastError: string;
    lastStage: NonNullable<CallProcessingJobRecord["lastStage"]>;
  }): Promise<WriteOutcome> {
    return this.db.transaction(async (tx) => {
      const rows = extractRows(await tx.execute(sql`
        update call_processing_jobs
        set status = 'failed', failure_count = failure_count + 1,
          last_stage = ${input.lastStage}, last_error = ${input.lastError},
          locked_at = null, lock_expires_at = null, lease_token = null,
          heartbeat_at = null, updated_at = now()
        where id = ${lease.jobId} and lease_token = ${lease.token}::uuid and status = 'running'
        returning id
      `));
      if (rows.length !== 1) return "lost_lease" as const;
      await tx.update(callsTable).set({
        status: "failed",
        ...(input.buyerProfileFailed ? { buyerProfileStatus: "failed" as const } : {}),
      }).where(eq(callsTable.id, input.callId));
      return "written" as const;
    });
  }

  async saveTranscriptCheckpoint(lease: Lease, input: {
    durationSeconds: number;
    fingerprint: string;
    generation: number;
    transcript: TranscriptLine[];
    transcriptHash: string;
  }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      insert into call_processing_checkpoints (
        job_id, manifest_fingerprint, transcript_hash, duration_seconds, merged_transcript, configuration, updated_at
      )
      select ${lease.jobId}, ${input.fingerprint}, ${input.transcriptHash}, ${input.durationSeconds},
        ${JSON.stringify(input.transcript)}::jsonb, ${JSON.stringify({ generation: input.generation })}::jsonb, now()
      where exists (
        select 1 from call_processing_jobs
        where id = ${lease.jobId} and lease_token = ${lease.token}::uuid
          and status = 'running' and lock_expires_at > now()
      )
      on conflict (job_id, manifest_fingerprint) do update
        set transcript_hash = excluded.transcript_hash, duration_seconds = excluded.duration_seconds,
          merged_transcript = excluded.merged_transcript, updated_at = now()
      returning id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async findTranscriptCheckpoint(jobId: string, generation: number): Promise<{
    buyerPersonality: {
      generatedAt: Date;
      model: string;
      profile: BuyerPersonalityProfile;
      status: "ready" | "needs_review";
    } | null;
    durationSeconds: number;
    evaluation: CallEvaluation | null;
    fingerprint: string;
    transcript: TranscriptLine[];
  } | null> {
    const rows = extractRows<{
      durationSeconds: number;
      buyerPersonality: null | { generatedAt: string; model: string; profile: BuyerPersonalityProfile; status: "ready" | "needs_review" };
      evaluation: CallEvaluation | null;
      fingerprint: string;
      transcript: TranscriptLine[];
    }>(await this.db.execute(sql`
      select duration_seconds as "durationSeconds", manifest_fingerprint as fingerprint,
        merged_transcript as transcript, buyer_personality as "buyerPersonality", evaluation
      from call_processing_checkpoints
      where job_id = ${jobId}
        and configuration ->> 'generation' = ${String(generation)}
        and duration_seconds is not null and merged_transcript is not null
      order by updated_at desc
      limit 1
    `));
    const row = rows[0];
    return row ? {
      ...row,
      buyerPersonality: row.buyerPersonality ? {
        ...row.buyerPersonality,
        generatedAt: new Date(row.buyerPersonality.generatedAt),
      } : null,
    } : null;
  }

  async saveBuyerPersonalityCheckpoint(lease: Lease, input: {
    buyerPersonality: {
      generatedAt: Date;
      model: string;
      profile: BuyerPersonalityProfile;
      status: "ready" | "needs_review";
    };
    fingerprint: string;
  }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_checkpoints as checkpoint
      set buyer_personality = ${JSON.stringify({
        ...input.buyerPersonality,
        generatedAt: input.buyerPersonality.generatedAt.toISOString(),
      })}::jsonb, updated_at = now()
      where checkpoint.job_id = ${lease.jobId}
        and checkpoint.manifest_fingerprint = ${input.fingerprint}
        and exists (
          select 1 from call_processing_jobs job
          where job.id = ${lease.jobId} and job.lease_token = ${lease.token}::uuid
            and job.status = 'running' and job.lock_expires_at > now()
        )
      returning checkpoint.id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
  }

  async saveEvaluationCheckpoint(lease: Lease, input: {
    evaluation: CallEvaluation;
    fingerprint: string;
  }): Promise<WriteOutcome> {
    const rows = extractRows(await this.db.execute(sql`
      update call_processing_checkpoints as checkpoint
      set evaluation = ${JSON.stringify(input.evaluation)}::jsonb, updated_at = now()
      where checkpoint.job_id = ${lease.jobId}
        and checkpoint.manifest_fingerprint = ${input.fingerprint}
        and exists (
          select 1 from call_processing_jobs job
          where job.id = ${lease.jobId} and job.lease_token = ${lease.token}::uuid
            and job.status = 'running' and job.lock_expires_at > now()
        )
      returning checkpoint.id
    `));
    return rows.length === 1 ? "written" : "lost_lease";
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

  async updateBuyerProfileStatus(
    callId: string,
    status: "pending" | "processing" | "ready" | "needs_review" | "failed",
  ): Promise<void> {
    await this.db.update(callsTable).set({ buyerProfileStatus: status }).where(eq(callsTable.id, callId));
  }

  async setCallEvaluation(callId: string, evaluation: CallEvaluation): Promise<void> {
    await this.persistProcessedCall({
      callId,
      durationSeconds: evaluation.durationSeconds,
      transcript: evaluation.transcript,
      evaluation,
    });
  }

  async finalizeV2Job(input: {
    buyerPersonality?: {
      generatedAt: Date;
      model: string;
      profile: BuyerPersonalityProfile;
      status: "ready" | "needs_review";
    } | null;
    callId: string;
    durationSeconds: number;
    evaluation?: CallEvaluation | null;
    generation: number;
    lease: Lease;
    notification: {
      body: string;
      link: string | null;
      title: string;
      type: "call_scored" | "recording_ready";
      userId: string;
    };
    transcript: TranscriptLine[];
  }): Promise<WriteOutcome | "already_complete"> {
    return this.db.transaction(async (tx) => {
      const claimed = extractRows(await tx.execute(sql`
        update call_processing_jobs
        set status = 'complete', last_stage = 'persist', last_error = null,
          locked_at = null, lock_expires_at = null, lease_token = null,
          heartbeat_at = null, updated_at = now()
        where id = ${input.lease.jobId} and lease_token = ${input.lease.token}::uuid
          and status = 'running' and lock_expires_at > now()
        returning id
      `));
      if (claimed.length !== 1) {
        const completed = extractRows(await tx.execute(sql`
          select id from call_processing_jobs
          where id = ${input.lease.jobId} and status = 'complete'
        `));
        return completed.length === 1 ? "already_complete" as const : "lost_lease" as const;
      }

      const evaluation = input.evaluation ?? null;
      await tx.update(callsTable).set({
        status: "complete",
        durationSeconds: input.durationSeconds,
        transcript: input.transcript,
        ...(input.buyerPersonality ? {
          buyerProfileStatus: input.buyerPersonality.status,
          buyerPersonalityProfile: input.buyerPersonality.profile as unknown as Record<string, unknown>,
          buyerPersonalitySchemaVersion: input.buyerPersonality.profile.schemaVersion,
          buyerPersonalityModel: input.buyerPersonality.model,
          buyerPersonalityGeneratedAt: input.buyerPersonality.generatedAt,
        } : {}),
        ...(evaluation ? {
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
        } : {}),
      }).where(eq(callsTable.id, input.callId));

      if (evaluation) {
        await tx.delete(callScoresTable).where(eq(callScoresTable.callId, input.callId));
        await tx.delete(callMomentsTable).where(eq(callMomentsTable.callId, input.callId));
        const categoryScores = evaluation.categoryScores.filter((category) => category.categoryId);
        if (categoryScores.length > 0) {
          await tx.insert(callScoresTable).values(categoryScores.map((category) => ({
            callId: input.callId,
            rubricCategoryId: category.categoryId!,
            score: category.score,
          })));
        }
        if (evaluation.moments.length > 0) {
          await tx.insert(callMomentsTable).values(evaluation.moments.map((moment) => ({
            callId: input.callId,
            timestampSeconds: moment.timestampSeconds,
            category: moment.category,
            observation: moment.observation,
            recommendation: moment.recommendation,
            severity: moment.severity,
            isHighlight: moment.isHighlight,
            highlightNote: moment.highlightNote,
          })));
        }
      }

      const dedupeKey = `call-processing:${input.lease.jobId}:${input.generation}:${input.notification.type}:${input.notification.userId}`;
      await tx.insert(notificationsTable).values({ ...input.notification, dedupeKey }).onConflictDoNothing();
      return "written" as const;
    });
  }

  async persistProcessedCall(input: {
    callId: string;
    durationSeconds: number;
    transcript: TranscriptLine[];
    buyerPersonality?: {
      generatedAt: Date;
      model: string;
      profile: BuyerPersonalityProfile;
      status: "ready" | "needs_review";
    } | null;
    evaluation?: CallEvaluation | null;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const evaluation = input.evaluation ?? null;
      await tx
        .update(callsTable)
        .set({
          status: "complete",
          durationSeconds: input.durationSeconds,
          transcript: input.transcript,
          ...(input.buyerPersonality
            ? {
                buyerProfileStatus: input.buyerPersonality.status,
                buyerPersonalityProfile: input.buyerPersonality.profile as unknown as Record<string, unknown>,
                buyerPersonalitySchemaVersion: input.buyerPersonality.profile.schemaVersion,
                buyerPersonalityModel: input.buyerPersonality.model,
                buyerPersonalityGeneratedAt: input.buyerPersonality.generatedAt,
              }
            : {}),
          ...(evaluation
            ? {
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
              }
            : {}),
        })
        .where(eq(callsTable.id, input.callId));

      if (!evaluation) return;

      await tx.delete(callScoresTable).where(eq(callScoresTable.callId, input.callId));
      await tx.delete(callMomentsTable).where(eq(callMomentsTable.callId, input.callId));

      const categoryScores = evaluation.categoryScores.filter(
        (category) => category.categoryId,
      );

      if (categoryScores.length > 0) {
        await tx.insert(callScoresTable).values(
          categoryScores.map((category) => ({
            callId: input.callId,
            rubricCategoryId: category.categoryId!,
            score: category.score,
          })),
        );
      }

      if (evaluation.moments.length > 0) {
        await tx.insert(callMomentsTable).values(
          evaluation.moments.map((moment) => ({
            callId: input.callId,
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
    type: "call_scored" | "recording_ready" | "annotation_added" | "module_assigned";
    userId: string;
  }): Promise<void> {
    await this.db.insert(notificationsTable).values(input);
  }
}
