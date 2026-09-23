import { eq, sql } from "drizzle-orm";
import {
  callProcessingJobsTable,
  callsTable,
  createDb,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { describe, expect, it } from "vitest";
import { CallProcessingRepository } from "./repository";
import { discoverWorkerTestDatabaseUrl } from "../test-support/database-env";

const workerTestDatabaseUrl = await discoverWorkerTestDatabaseUrl();
const workerTestDb = workerTestDatabaseUrl ? createDb(workerTestDatabaseUrl) : null;

const describeWithDatabase = workerTestDatabaseUrl ? describe : describe.skip;

type SeededCall = {
  orgId: string;
  repId: string;
  callId: string;
};

class RollbackSignal extends Error {}

async function seedCall(db: ArgosDb, callId = crypto.randomUUID()): Promise<SeededCall> {
  const orgId = crypto.randomUUID();
  const repId = crypto.randomUUID();

  await db.insert(organizationsTable).values({
    id: orgId,
    name: `Argos ${orgId.slice(0, 8)}`,
    slug: `argos-${orgId.slice(0, 8)}`,
    plan: "pro",
  });

  await db.insert(usersTable).values({
    id: repId,
    email: `${repId}@example.com`,
    role: "rep",
    orgId,
  });

  await db.insert(callsTable).values({
    id: callId,
    orgId,
    repId,
    callTopic: "Discovery",
    consentConfirmed: true,
    status: "uploaded",
  });

  return { orgId, repId, callId };
}

async function ensureCallProcessingJobsTable(db: ArgosDb) {
  await db.execute(sql`
    create temporary table call_processing_jobs (
      id uuid primary key default gen_random_uuid(),
      call_id uuid not null unique,
      rubric_id uuid,
      source_origin text not null check (source_origin in ('manual_upload', 'zoom_recording')),
      source_storage_path text not null,
      source_file_name text not null,
      source_content_type text,
      source_size_bytes integer,
      status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'failed', 'complete')),
      attempt_count integer not null default 0,
      max_attempts integer not null default 3,
      processing_version integer not null default 1,
      generation integer not null default 1,
      failure_count integer not null default 0,
      max_failures integer not null default 3,
      total_chunks integer,
      completed_chunks integer not null default 0,
      next_run_at timestamptz not null default now(),
      locked_at timestamptz,
      lock_expires_at timestamptz,
      lease_token uuid,
      heartbeat_at timestamptz,
      processing_started_at timestamptz,
      processing_deadline_at timestamptz,
      last_stage text check (last_stage in ('download', 'normalize', 'chunk', 'transcribe', 'profile', 'score', 'persist')),
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    ) on commit drop;
  `);

  await db.execute(sql`
    create index call_processing_jobs_status_next_run_idx
      on call_processing_jobs (status, next_run_at);
  `);

  await db.execute(sql`
    create index call_processing_jobs_lock_expires_idx
      on call_processing_jobs (lock_expires_at);
  `);

  await db.execute(sql`
    create temporary table call_processing_checkpoints (
      id uuid primary key default gen_random_uuid(),
      job_id uuid not null,
      manifest_fingerprint text not null,
      transcript_hash text not null,
      duration_seconds integer,
      merged_transcript jsonb,
      configuration jsonb not null default '{}'::jsonb,
      buyer_personality jsonb,
      evaluation jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (job_id, manifest_fingerprint)
    ) on commit drop;
  `);
}

async function withRepositoryTransaction(
  run: (input: { db: ArgosDb; repository: CallProcessingRepository }) => Promise<void>,
) {
  if (!workerTestDb) {
    throw new Error("Missing WORKER_TEST_DATABASE_URL or DATABASE_URL for repository integration tests");
  }

  try {
    await workerTestDb.transaction(async (tx) => {
      const transactionalDb = tx as unknown as ArgosDb;
      const repository = new CallProcessingRepository(transactionalDb);

      await ensureCallProcessingJobsTable(transactionalDb);

      await run({
        db: transactionalDb,
        repository,
      });

      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) {
      throw error;
    }
  }
}

describeWithDatabase("CallProcessingRepository", () => {
  it("claims the earliest eligible pending job and sets a lease", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seededCalls = await Promise.all([seedCall(db), seedCall(db)]);

      await repository.insertJob({
        callId: seededCalls[0].callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-1/source/later.mp3",
        sourceFileName: "later.mp3",
        status: "pending",
      });

      const earlierJob = await repository.insertJob({
        callId: seededCalls[1].callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-2/source/earlier.mp3",
        sourceFileName: "earlier.mp3",
        status: "pending",
      });

      await db
        .update(callProcessingJobsTable)
        .set({ nextRunAt: new Date("2026-04-18T09:58:00.000Z") })
        .where(eq(callProcessingJobsTable.callId, seededCalls[0].callId));

      await db
        .update(callProcessingJobsTable)
        .set({ nextRunAt: new Date("2026-04-18T09:55:00.000Z") })
        .where(eq(callProcessingJobsTable.callId, seededCalls[1].callId));

      const claimed = await repository.claimNextJob(new Date("2026-04-18T10:00:00.000Z"));

      expect(claimed?.id).toBe(earlierJob.id);
      expect(claimed?.callId).toBe(seededCalls[1].callId);
      expect(claimed?.repId).toBe(seededCalls[1].repId);
      expect(claimed?.callTopic).toBe("Discovery");
      expect(claimed?.status).toBe("running");
      expect(claimed?.attemptCount).toBe(1);
      expect(claimed?.lockExpiresAt).toEqual(new Date("2026-04-18T10:15:00.000Z"));
    });
  });

  it("preserves rubricId when inserting and claiming a job", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const rubricId = crypto.randomUUID();

      const inserted = await repository.insertJob({
        callId: seeded.callId,
        rubricId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-5/source/rubric.mp3",
        sourceFileName: "rubric.mp3",
        status: "pending",
      });

      expect(inserted.rubricId).toBe(rubricId);

      await db
        .update(callProcessingJobsTable)
        .set({ nextRunAt: new Date("2026-04-18T09:55:00.000Z") })
        .where(eq(callProcessingJobsTable.id, inserted.id));

      const claimed = await repository.claimNextJob(new Date("2026-04-18T10:00:00.000Z"));

      expect(claimed?.id).toBe(inserted.id);
      expect(claimed?.rubricId).toBe(rubricId);
    });
  });

  it("reclaims expired running jobs as a new leased attempt", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-expired/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });

      await db
        .update(callProcessingJobsTable)
        .set({
          attemptCount: 1,
          lockedAt: new Date("2026-04-18T09:40:00.000Z"),
          lockExpiresAt: new Date("2026-04-18T09:55:00.000Z"),
          nextRunAt: new Date("2026-04-18T09:40:00.000Z"),
        })
        .where(eq(callProcessingJobsTable.id, job.id));

      const claimed = await repository.claimNextJob(new Date("2026-04-18T10:00:00.000Z"));

      expect(claimed?.id).toBe(job.id);
      expect(claimed?.status).toBe("running");
      expect(claimed?.attemptCount).toBe(2);
      expect(claimed?.lockedAt).toEqual(new Date("2026-04-18T10:00:00.000Z"));
      expect(claimed?.lockExpiresAt).toEqual(new Date("2026-04-18T10:15:00.000Z"));
    });
  });

  it("does not reclaim running jobs while their lease is still active", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-active/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });

      await db
        .update(callProcessingJobsTable)
        .set({
          attemptCount: 1,
          lockedAt: new Date("2026-04-18T09:55:00.000Z"),
          lockExpiresAt: new Date("2026-04-18T10:10:00.000Z"),
          nextRunAt: new Date("2026-04-18T09:55:00.000Z"),
        })
        .where(eq(callProcessingJobsTable.callId, seeded.callId));

      const claimed = await repository.claimNextJob(new Date("2026-04-18T10:00:00.000Z"));

      expect(claimed).toBeNull();
    });
  });

  it("refuses to renew a lease after the processing deadline", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-deadline/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });
      const leaseToken = crypto.randomUUID();

      await db
        .update(callProcessingJobsTable)
        .set({
          processingVersion: 2,
          leaseToken,
          lockExpiresAt: new Date(Date.now() + 60_000),
          processingDeadlineAt: new Date(Date.now() - 60_000),
        })
        .where(eq(callProcessingJobsTable.id, job.id));

      await expect(repository.renewLease({ jobId: job.id, token: leaseToken }))
        .resolves.toBe("lost_lease");
    });
  });

  it("rejects state transitions from an expired lease", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-stale/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });
      const lease = { jobId: job.id, token: crypto.randomUUID() };

      await db
        .update(callProcessingJobsTable)
        .set({
          processingVersion: 2,
          leaseToken: lease.token,
          lockExpiresAt: new Date(Date.now() - 60_000),
          processingDeadlineAt: new Date(Date.now() + 60_000),
        })
        .where(eq(callProcessingJobsTable.id, job.id));

      await expect(repository.releaseForRetry(lease, {
        lastError: "late retry",
        nextRunAt: new Date(Date.now() + 60_000),
      })).resolves.toBe("lost_lease");
      await expect(repository.markV2RetryableFailure(lease, {
        lastError: "late failure",
        lastStage: "transcribe",
        nextRunAt: new Date(Date.now() + 60_000),
      })).resolves.toBe("lost_lease");
      await expect(repository.markV2TerminalFailure(lease, {
        callId: seeded.callId,
        lastError: "late terminal failure",
        lastStage: "transcribe",
      })).resolves.toBe("lost_lease");

      await expect(repository.findJobById(job.id)).resolves.toMatchObject({ status: "running" });
    });
  });

  it("starts a fresh retry budget when a different processing stage fails", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-stage/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });
      const lease = { jobId: job.id, token: crypto.randomUUID() };

      await db.update(callProcessingJobsTable).set({
        processingVersion: 2,
        failureCount: 2,
        lastStage: "download",
        leaseToken: lease.token,
        lockExpiresAt: new Date(Date.now() + 60_000),
        processingDeadlineAt: new Date(Date.now() + 120_000),
      }).where(eq(callProcessingJobsTable.id, job.id));

      await expect(repository.markV2RetryableFailure(lease, {
        lastError: "scoring timed out",
        lastStage: "score",
        nextRunAt: new Date(Date.now() + 60_000),
      })).resolves.toBe("written");

      await expect(repository.findJobById(job.id)).resolves.toMatchObject({
        failureCount: 1,
        lastStage: "score",
        status: "retrying",
      });
    });
  });

  it("fails an in-progress buyer profile when the processing deadline expires", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-profile-deadline/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "pending",
      });
      const now = new Date("2026-04-18T10:00:00.000Z");

      await db.update(callsTable).set({ buyerProfileStatus: "processing" })
        .where(eq(callsTable.id, seeded.callId));
      await db.update(callProcessingJobsTable).set({
        processingVersion: 2,
        processingDeadlineAt: new Date("2026-04-18T09:59:00.000Z"),
      }).where(eq(callProcessingJobsTable.id, job.id));

      await expect(repository.claimNextJob(now)).resolves.toBeNull();
      const [call] = await db.select({
        buyerProfileStatus: callsTable.buyerProfileStatus,
        status: callsTable.status,
      }).from(callsTable).where(eq(callsTable.id, seeded.callId));
      expect(call).toEqual({ buyerProfileStatus: "failed", status: "failed" });
    });
  });

  it("fails only an in-progress buyer profile when capabilities disappear", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-capabilities/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });
      const lease = { jobId: job.id, token: crypto.randomUUID() };

      await db.update(callsTable).set({ buyerProfileStatus: "processing" })
        .where(eq(callsTable.id, seeded.callId));
      await db.update(callProcessingJobsTable).set({
        processingVersion: 2,
        leaseToken: lease.token,
        lockExpiresAt: new Date(Date.now() + 60_000),
      }).where(eq(callProcessingJobsTable.id, job.id));

      await expect(repository.markV2TerminalFailure(lease, {
        buyerProfileFailedIfProcessing: true,
        callId: seeded.callId,
        lastError: "recording processing capabilities disabled",
        lastStage: "download",
      })).resolves.toBe("written");

      const [call] = await db.select({
        buyerProfileStatus: callsTable.buyerProfileStatus,
        status: callsTable.status,
      }).from(callsTable).where(eq(callsTable.id, seeded.callId));
      expect(call).toEqual({ buyerProfileStatus: "failed", status: "failed" });
    });
  });

  it("reuses evaluation checkpoints only for the same scoring configuration", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-checkpoint/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });
      const lease = { jobId: job.id, token: crypto.randomUUID() };
      const fingerprint = "manifest-fingerprint";
      const transcript = [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello" }];
      const evaluation = {
        rubricId: null,
        confidence: "high",
        callStageReached: "commitment",
        overallScore: 90,
        categoryScores: [],
        frameControlScore: null,
        rapportScore: null,
        discoveryScore: null,
        painExpansionScore: null,
        solutionScore: null,
        objectionScore: null,
        closingScore: null,
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript,
        moments: [],
        durationSeconds: 600,
      } as const;

      await db
        .update(callProcessingJobsTable)
        .set({
          processingVersion: 2,
          leaseToken: lease.token,
          lockExpiresAt: new Date(Date.now() + 60_000),
          processingDeadlineAt: new Date(Date.now() + 120_000),
        })
        .where(eq(callProcessingJobsTable.id, job.id));

      await expect(repository.saveTranscriptCheckpoint(lease, {
        durationSeconds: 600,
        fingerprint,
        generation: 1,
        resumeFingerprint: "source-and-transcription-v1",
        transcript,
        transcriptHash: "transcript-hash",
      })).resolves.toBe("written");
      await expect(repository.saveEvaluationCheckpoint(lease, {
        evaluation: evaluation as never,
        evaluationFingerprint: "scoring-v1",
        fingerprint,
      })).resolves.toBe("written");

      await expect(repository.findTranscriptCheckpoint(job.id, 1, fingerprint, {
        buyerPersonalityFingerprint: null,
        evaluationFingerprint: "scoring-v1",
      })).resolves.toMatchObject({ evaluation: { overallScore: 90 } });
      await expect(repository.findTranscriptCheckpoint(job.id, 1, fingerprint, {
        buyerPersonalityFingerprint: null,
        evaluationFingerprint: "scoring-v2",
      })).resolves.toMatchObject({ evaluation: null });
      await expect(repository.findReusableTranscriptCheckpoint(job.id, 1, "source-and-transcription-v1", {
        buyerPersonalityFingerprint: null,
        evaluationFingerprint: "scoring-v1",
      })).resolves.toMatchObject({ evaluation: { overallScore: 90 }, fingerprint });
      await expect(repository.findReusableTranscriptCheckpoint(job.id, 1, "different-source", {
        buyerPersonalityFingerprint: null,
        evaluationFingerprint: "scoring-v1",
      })).resolves.toBeNull();
    });
  });

  it("does not reclaim jobs that have exhausted the retry budget", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-exhausted/source/audio.mp3",
        sourceFileName: "audio.mp3",
        status: "running",
      });

      await db
        .update(callProcessingJobsTable)
        .set({
          attemptCount: 3,
          maxAttempts: 3,
          lockedAt: new Date("2026-04-18T09:40:00.000Z"),
          lockExpiresAt: new Date("2026-04-18T09:55:00.000Z"),
          nextRunAt: new Date("2026-04-18T09:40:00.000Z"),
        })
        .where(eq(callProcessingJobsTable.callId, seeded.callId));

      const claimed = await repository.claimNextJob(new Date("2026-04-18T10:00:00.000Z"));

      expect(claimed).toBeNull();
    });
  });

  it("schedules the next retry with backoff", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "zoom_recording",
        sourceStoragePath: "recordings/call-2/source/zoom.m4a",
        sourceFileName: "zoom.m4a",
        status: "running",
      });

      await repository.markRetryableFailure(job.id, {
        now: new Date("2026-04-18T10:00:00.000Z"),
        attemptCount: 1,
        lastError: "OpenAI transcription request failed: 429",
        lastStage: "transcribe",
      });

      const refreshed = await repository.findJobById(job.id);

      expect(refreshed?.status).toBe("retrying");
      expect(refreshed?.attemptCount).toBe(1);
      expect(refreshed?.nextRunAt).toEqual(new Date("2026-04-18T10:02:00.000Z"));
      expect(refreshed?.lastStage).toBe("transcribe");
      expect(refreshed?.lastError).toBe("OpenAI transcription request failed: 429");
      expect(refreshed?.lockedAt).toBeNull();
      expect(refreshed?.lockExpiresAt).toBeNull();
    });
  });

  it("marks jobs complete and clears lease state", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-3/source/done.mp3",
        sourceFileName: "done.mp3",
        status: "running",
      });

      await repository.markCompleted(job.id, {
        now: new Date("2026-04-18T10:20:00.000Z"),
        lastStage: "persist",
      });

      const refreshed = await repository.findJobById(job.id);

      expect(refreshed?.status).toBe("complete");
      expect(refreshed?.lastStage).toBe("persist");
      expect(refreshed?.lastError).toBeNull();
      expect(refreshed?.lockedAt).toBeNull();
      expect(refreshed?.lockExpiresAt).toBeNull();
    });
  });

  it("marks jobs failed and preserves the terminal error", async () => {
    await withRepositoryTransaction(async ({ db, repository }) => {
      const seeded = await seedCall(db);
      const job = await repository.insertJob({
        callId: seeded.callId,
        sourceOrigin: "zoom_recording",
        sourceStoragePath: "recordings/call-4/source/fail.m4a",
        sourceFileName: "fail.m4a",
        status: "running",
      });

      await repository.markFailed(job.id, {
        now: new Date("2026-04-18T10:40:00.000Z"),
        attemptCount: 3,
        lastError: "ffmpeg normalize failed",
        lastStage: "normalize",
      });

      const refreshed = await repository.findJobById(job.id);

      expect(refreshed?.status).toBe("failed");
      expect(refreshed?.attemptCount).toBe(3);
      expect(refreshed?.lastStage).toBe("normalize");
      expect(refreshed?.lastError).toBe("ffmpeg normalize failed");
      expect(refreshed?.lockedAt).toBeNull();
      expect(refreshed?.lockExpiresAt).toBeNull();
    });
  });
});
