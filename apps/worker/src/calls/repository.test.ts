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

const workerTestDatabaseUrl = process.env.WORKER_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
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
      source_origin text not null check (source_origin in ('manual_upload', 'zoom_recording')),
      source_storage_path text not null,
      source_file_name text not null,
      source_content_type text,
      source_size_bytes integer,
      status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'failed', 'complete')),
      attempt_count integer not null default 0,
      max_attempts integer not null default 3,
      next_run_at timestamptz not null default now(),
      locked_at timestamptz,
      lock_expires_at timestamptz,
      last_stage text check (last_stage in ('download', 'normalize', 'chunk', 'transcribe', 'score', 'persist')),
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
      expect(claimed?.status).toBe("running");
      expect(claimed?.attemptCount).toBe(1);
      expect(claimed?.lockExpiresAt).toEqual(new Date("2026-04-18T10:15:00.000Z"));
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
