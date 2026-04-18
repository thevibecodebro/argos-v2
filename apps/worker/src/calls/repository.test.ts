import { describe, expect, it, vi } from "vitest";
import type { ArgosDb } from "@argos-v2/db";
import type { SQL } from "drizzle-orm";
import { CallProcessingRepository } from "./repository";

type JobRow = {
  id: string;
  callId: string;
  sourceOrigin: "manual_upload" | "zoom_recording";
  sourceStoragePath: string;
  sourceFileName: string;
  sourceContentType: string | null;
  sourceSizeBytes: number | null;
  status: "pending" | "running" | "retrying" | "failed" | "complete";
  attemptCount: number;
  maxAttempts: number;
  nextRunAt: Date;
  lockedAt: Date | null;
  lockExpiresAt: Date | null;
  lastStage: "download" | "normalize" | "chunk" | "transcribe" | "score" | "persist" | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function renderSql(query: SQL) {
  return query.toQuery({
    casing: {
      getColumnCasing: (column: { name: string }) => column.name,
    },
    escapeName: (value: string) => `"${value}"`,
    escapeParam: () => "?",
    escapeString: (value: string) => `'${value.replace(/'/g, "''")}'`,
  } as any).sql;
}

function createRepositoryForTest(overrides?: {
  executeResult?: JobRow[] | { rows: JobRow[] };
  selectResult?: JobRow[];
}) {
  const insertReturning = vi.fn(async () => [
    {
      id: "job-inserted",
      callId: "call-1",
      sourceOrigin: "manual_upload",
      sourceStoragePath: "recordings/call-1/source/demo.mp3",
      sourceFileName: "demo.mp3",
      sourceContentType: null,
      sourceSizeBytes: null,
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3,
      nextRunAt: new Date("2026-04-18T09:00:00.000Z"),
      lockedAt: null,
      lockExpiresAt: null,
      lastStage: null,
      lastError: null,
      createdAt: new Date("2026-04-18T09:00:00.000Z"),
      updatedAt: new Date("2026-04-18T09:00:00.000Z"),
    } satisfies JobRow,
  ]);

  const insertValues = vi.fn(() => ({
    returning: insertReturning,
  }));

  const selectLimit = vi.fn(async () => overrides?.selectResult ?? []);
  const selectWhere = vi.fn(() => ({
    limit: selectLimit,
  }));
  const selectFrom = vi.fn(() => ({
    where: selectWhere,
  }));
  const select = vi.fn(() => ({
    from: selectFrom,
  }));

  const updateWhere = vi.fn(async () => undefined);
  const updateSet = vi.fn(() => ({
    where: updateWhere,
  }));
  const update = vi.fn(() => ({
    set: updateSet,
  }));

  const execute = vi.fn(async () => overrides?.executeResult ?? []);

  const db = {
    insert: vi.fn(() => ({
      values: insertValues,
    })),
    select,
    update,
    execute,
  } as unknown as ArgosDb;

  return {
    db,
    repository: new CallProcessingRepository(db),
    spies: {
      execute,
      insertValues,
      selectLimit,
      updateSet,
    },
  };
}

describe("CallProcessingRepository", () => {
  it("inserts and reloads jobs through the queue table", async () => {
    const expectedJob = {
      id: "job-1",
      callId: "call-1",
      sourceOrigin: "manual_upload",
      sourceStoragePath: "recordings/call-1/source/demo.mp3",
      sourceFileName: "demo.mp3",
      sourceContentType: "audio/mpeg",
      sourceSizeBytes: 1024,
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3,
      nextRunAt: new Date("2026-04-18T09:00:00.000Z"),
      lockedAt: null,
      lockExpiresAt: null,
      lastStage: null,
      lastError: null,
      createdAt: new Date("2026-04-18T09:00:00.000Z"),
      updatedAt: new Date("2026-04-18T09:00:00.000Z"),
    } satisfies JobRow;
    const { repository, spies } = createRepositoryForTest({
      selectResult: [expectedJob],
    });

    await repository.insertJob({
      callId: "call-1",
      sourceOrigin: "manual_upload",
      sourceStoragePath: "recordings/call-1/source/demo.mp3",
      sourceFileName: "demo.mp3",
      sourceContentType: "audio/mpeg",
      sourceSizeBytes: 1024,
      status: "pending",
    });

    expect(spies.insertValues).toHaveBeenCalledWith({
      callId: "call-1",
      sourceOrigin: "manual_upload",
      sourceStoragePath: "recordings/call-1/source/demo.mp3",
      sourceFileName: "demo.mp3",
      sourceContentType: "audio/mpeg",
      sourceSizeBytes: 1024,
      status: "pending",
    });

    expect(await repository.findJobById("job-1")).toEqual(expectedJob);
  });

  it("claims the earliest eligible pending job and sets a 15 minute lease", async () => {
    const claimedRow = {
      id: "job-1",
      callId: "call-1",
      sourceOrigin: "manual_upload",
      sourceStoragePath: "recordings/call-1/source/demo.mp3",
      sourceFileName: "demo.mp3",
      sourceContentType: null,
      sourceSizeBytes: null,
      status: "running",
      attemptCount: 0,
      maxAttempts: 3,
      nextRunAt: new Date("2026-04-18T09:00:00.000Z"),
      lockedAt: new Date("2026-04-18T10:00:00.000Z"),
      lockExpiresAt: new Date("2026-04-18T10:15:00.000Z"),
      lastStage: null,
      lastError: null,
      createdAt: new Date("2026-04-18T09:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    } satisfies JobRow;
    const { repository, spies } = createRepositoryForTest({
      executeResult: { rows: [claimedRow] },
    });

    const claimed = await repository.claimNextJob(new Date("2026-04-18T10:00:00.000Z"));

    expect(claimed).toEqual(claimedRow);

    const executeCalls = (spies.execute as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const claimQuery = executeCalls[0]?.[0] as SQL;
    const rendered = renderSql(claimQuery);
    expect(rendered).toContain('status in (\'pending\', \'retrying\')');
    expect(rendered).toContain("next_run_at <=");
    expect(rendered).toContain("order by next_run_at asc, created_at asc");
    expect(rendered).toContain("for update skip locked");
    expect(rendered).toContain("lock_expires_at");
  });

  it.each([
    { attemptCount: 1, expectedIso: "2026-04-18T10:02:00.000Z" },
    { attemptCount: 2, expectedIso: "2026-04-18T10:10:00.000Z" },
    { attemptCount: 3, expectedIso: "2026-04-18T10:30:00.000Z" },
  ])(
    "schedules retryable failures with attempt-aware backoff for attempt $attemptCount",
    async ({ attemptCount, expectedIso }) => {
      const { repository, spies } = createRepositoryForTest();
      const now = new Date("2026-04-18T10:00:00.000Z");

      await repository.markRetryableFailure("job-1", {
        now,
        attemptCount,
        lastError: "OpenAI transcription request failed: 429",
        lastStage: "transcribe",
      });

      expect(spies.updateSet).toHaveBeenCalledWith({
        status: "retrying",
        attemptCount,
        nextRunAt: new Date(expectedIso),
        lockedAt: null,
        lockExpiresAt: null,
        lastError: "OpenAI transcription request failed: 429",
        lastStage: "transcribe",
        updatedAt: now,
      });
    },
  );
});
