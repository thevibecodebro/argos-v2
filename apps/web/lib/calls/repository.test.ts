import { describe, expect, it, vi } from "vitest";
import { DrizzleCallsRepository } from "./repository";
import { SupabaseCallsRepository } from "./supabase-repository";
import { ACTIVE_CALL_PROCESSING_STATUSES } from "./service";

describe("calls repositories", () => {
  it("treats queued, transcribing, and evaluating calls as active processing", () => {
    expect(ACTIVE_CALL_PROCESSING_STATUSES).toEqual([
      "uploaded",
      "transcribing",
      "evaluating",
    ]);
  });
  it("does not query Drizzle when scoped rep ids are empty", async () => {
    const db = {
      select: vi.fn(() => {
        throw new Error("empty rep scope must not query Drizzle");
      }),
    };
    const repository = new DrizzleCallsRepository(db as never);

    await expect(repository.findCallsByRepIds([], { limit: 25, offset: 0 })).resolves.toEqual({
      calls: [],
      total: 0,
    });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("does not query Supabase when scoped rep ids are empty", async () => {
    const supabase = {
      from: vi.fn(() => {
        throw new Error("empty rep scope must not query Supabase");
      }),
    };
    const repository = new SupabaseCallsRepository(supabase as never);

    await expect(repository.findCallsByRepIds([], { limit: 25, offset: 0 })).resolves.toEqual({
      calls: [],
      total: 0,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("preserves attempt count when manually requeueing failed processing jobs", async () => {
    const processingUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: "job-1",
          callId: "call-1",
          status: "pending",
          attemptCount: 2,
          maxAttempts: 3,
          nextRunAt: new Date("2026-04-03T00:15:00.000Z"),
          lockedAt: null,
          lockExpiresAt: null,
          lastStage: null,
          lastError: null,
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
          updatedAt: new Date("2026-04-03T00:15:00.000Z"),
        },
      ]),
    };
    const callUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      update: vi.fn()
        .mockReturnValueOnce(processingUpdate)
        .mockReturnValueOnce(callUpdate),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new DrizzleCallsRepository(db as never);

    const job = await repository.retryCallProcessingJob("call-1");

    expect(job?.attemptCount).toBe(2);
    expect(processingUpdate.set).toHaveBeenCalled();
    expect(processingUpdate.set.mock.calls[0]?.[0]).not.toHaveProperty("attemptCount");
  });

  it("promotes an exhausted V1 job to V2 without requiring a new upload", async () => {
    const processingUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "job-legacy", processingVersion: 2 }]),
    };
    const callUpdate = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    const tx = { update: vi.fn().mockReturnValueOnce(processingUpdate).mockReturnValueOnce(callUpdate) };
    const repository = new DrizzleCallsRepository({
      transaction: vi.fn((callback) => callback(tx)),
    } as never);
    const previous = process.env.CALL_PROCESSING_V2_ENABLED;
    process.env.CALL_PROCESSING_V2_ENABLED = "true";

    try {
      await repository.retryCallProcessingJob("call-legacy");
    } finally {
      if (previous === undefined) delete process.env.CALL_PROCESSING_V2_ENABLED;
      else process.env.CALL_PROCESSING_V2_ENABLED = previous;
    }

    expect(processingUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ attemptCount: 0 }),
    );
  });

  it("does not downgrade an existing V2 job when resetting with enrollment disabled", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const repository = new DrizzleCallsRepository({
      insert: vi.fn().mockReturnValue({ values }),
    } as never);
    const previous = process.env.CALL_PROCESSING_V2_ENABLED;
    process.env.CALL_PROCESSING_V2_ENABLED = "false";

    try {
      await repository.createOrResetCallProcessingJob({
        callId: "call-v2",
        sourceOrigin: "zoom_recording",
        sourceStoragePath: "recordings/call-v2/source/demo.mp3",
        sourceFileName: "demo.mp3",
        sourceContentType: "audio/mpeg",
        sourceSizeBytes: 1024,
      });
    } finally {
      if (previous === undefined) delete process.env.CALL_PROCESSING_V2_ENABLED;
      else process.env.CALL_PROCESSING_V2_ENABLED = previous;
    }

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ processingVersion: 1 }));
    expect(onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      set: expect.objectContaining({
        processingVersion: expect.objectContaining({ queryChunks: expect.any(Array) }),
      }),
    }));
  });

  it("enrolls Supabase fallback uploads in V2 when the rollout flag is enabled", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = { rpc };
    const repository = new SupabaseCallsRepository(supabase as never);
    const previous = process.env.CALL_PROCESSING_V2_ENABLED;
    process.env.CALL_PROCESSING_V2_ENABLED = "true";

    try {
      await repository.createOrResetCallProcessingJob({
        callId: "call-v2",
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-v2/source/demo.mp3",
        sourceFileName: "demo.mp3",
        sourceContentType: "audio/mpeg",
        sourceSizeBytes: 1024,
      });
    } finally {
      if (previous === undefined) delete process.env.CALL_PROCESSING_V2_ENABLED;
      else process.env.CALL_PROCESSING_V2_ENABLED = previous;
    }

    expect(rpc).toHaveBeenCalledWith(
      "create_or_reset_call_processing_job",
      expect.objectContaining({ target_processing_version: 2 }),
    );
  });

  it("retries V2 jobs through the atomic Supabase function", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "job-v2",
        status: "pending",
        attempt_count: 2,
        max_attempts: 3,
        processing_version: 2,
        failure_count: 0,
        max_failures: 3,
        completed_chunks: 0,
        total_chunks: null,
        next_run_at: "2026-09-23T14:30:00.000Z",
        last_stage: null,
        last_error: null,
        updated_at: "2026-09-23T14:30:00.000Z",
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ maybeSingle });
    const repository = new SupabaseCallsRepository({ rpc } as never);
    const previous = process.env.CALL_PROCESSING_V2_ENABLED;
    process.env.CALL_PROCESSING_V2_ENABLED = "true";

    try {
      await expect(repository.retryCallProcessingJob("call-v2")).resolves.toMatchObject({
        id: "job-v2",
        processingVersion: 2,
        status: "pending",
      });
    } finally {
      if (previous === undefined) delete process.env.CALL_PROCESSING_V2_ENABLED;
      else process.env.CALL_PROCESSING_V2_ENABLED = previous;
    }
    expect(rpc).toHaveBeenCalledWith("retry_call_processing_job", {
      target_call_id: "call-v2",
      target_processing_version: 2,
    });
  });
});
