import { afterEach, describe, expect, it, vi } from "vitest";
import {
  callProcessingJobsTable,
  callsTable,
  organizationIngestionTitleFiltersTable,
} from "@argos-v2/db";

const eqSpy = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");

  return {
    ...actual,
    eq: (...args: unknown[]) => {
      eqSpy(...args);
      return { args, operation: "eq" };
    },
  };
});

import { DrizzleZoomWebhookRepository } from "./zoom-webhook-repository";
import { DrizzleCallsRepository } from "@/lib/calls/repository";

describe("DrizzleZoomWebhookRepository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retains superseded paths for worker retry when immediate cleanup fails", async () => {
    vi.spyOn(DrizzleCallsRepository.prototype, "updateCallRecordingStorage").mockResolvedValue(undefined);
    vi.spyOn(DrizzleCallsRepository.prototype, "updateCallStatus").mockResolvedValue(undefined);
    vi.spyOn(DrizzleCallsRepository.prototype, "createOrResetCallProcessingJob").mockResolvedValue(undefined);
    const query = (rows: unknown[]) => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue(rows),
    });
    const jobQuery = query([{
      id: "job-1",
      pendingSourceCleanupPaths: ["recordings/call-1/older.m4a"],
      sourceStoragePath: "recordings/call-1/old.m4a",
      status: "failed",
    }]);
    const callQuery = query([{ recordingStoragePath: "recordings/call-1/old.m4a" }]);
    const returning = vi.fn().mockResolvedValue([{ id: "job-1" }]);
    const update = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning }),
      }),
    };
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table) => table === callProcessingJobsTable ? jobQuery : callQuery),
      })),
      update: vi.fn().mockReturnValue(update),
    };
    const db = {
      execute: vi.fn(),
      transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new DrizzleZoomWebhookRepository(db as never);

    await expect(repository.replaceCallRecordingAndResetProcessingJob({
      callId: "call-1",
      recording: {
        contentType: "audio/mp4",
        fileSizeBytes: 1024,
        storageBucket: "call-recordings",
        storagePath: "recordings/call-1/new.m4a",
      },
      job: {
        rubricId: null,
        sourceContentType: "audio/mp4",
        sourceFileName: "new.m4a",
        sourceOrigin: "zoom_recording",
        sourceSizeBytes: 1024,
        sourceStoragePath: "recordings/call-1/new.m4a",
      },
    }, vi.fn().mockRejectedValue(new Error("storage unavailable")))).resolves.toBe(true);

    expect(update.set).toHaveBeenCalledWith({
      pendingSourceCleanupPaths: [
        "recordings/call-1/older.m4a",
        "recordings/call-1/old.m4a",
      ],
    });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("locks the processing job before the call during source replacement", async () => {
    const fromOrder: unknown[] = [];
    const query = (rows: unknown[]) => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue(rows),
    });
    const jobQuery = query([{
      id: "job-1",
      pendingSourceCleanupPaths: [],
      sourceStoragePath: "old.mp4",
      status: "running",
    }]);
    const callQuery = query([{ recordingStoragePath: "old.mp4" }]);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table) => {
          fromOrder.push(table);
          return table === callProcessingJobsTable ? jobQuery : callQuery;
        }),
      })),
      update: vi.fn().mockReturnValue({ set: updateSet }),
    };
    const repository = new DrizzleZoomWebhookRepository({
      transaction: vi.fn((callback) => callback(tx)),
    } as never);
    const removeSourceAssets = vi.fn().mockRejectedValue(new Error("storage unavailable"));

    await expect(repository.replaceCallRecordingAndResetProcessingJob({
      callId: "call-1",
      recording: {
        contentType: "video/mp4",
        fileSizeBytes: 1024,
        storageBucket: "call-recordings",
        storagePath: "replacement.mp4",
      },
      job: {
        rubricId: null,
        sourceContentType: "video/mp4",
        sourceFileName: "replacement.mp4",
        sourceOrigin: "zoom_recording",
        sourceSizeBytes: 1024,
        sourceStoragePath: "replacement.mp4",
      },
    }, removeSourceAssets)).resolves.toBe(false);

    expect(fromOrder).toEqual([callProcessingJobsTable, callsTable]);
    expect(jobQuery.for).toHaveBeenCalledWith("update");
    expect(callQuery.for).toHaveBeenCalledWith("update");
    expect(updateSet).toHaveBeenCalledWith({
      pendingSourceCleanupPaths: ["replacement.mp4"],
    });
    expect(removeSourceAssets).toHaveBeenCalledWith(["replacement.mp4"]);
  });

  it("retains the old source when the replacement transaction rolls back", async () => {
    const query = (rows: unknown[]) => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue(rows),
    });
    const jobQuery = query([{
      id: "job-1",
      pendingSourceCleanupPaths: [],
      sourceStoragePath: "old.mp4",
      status: "failed",
    }]);
    const callQuery = query([{ recordingStoragePath: "old.mp4" }]);
    const writeError = new Error("database write failed");
    const update = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(writeError),
    };
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table) => table === callProcessingJobsTable ? jobQuery : callQuery),
      })),
      update: vi.fn().mockReturnValue(update),
    };
    const repository = new DrizzleZoomWebhookRepository({
      transaction: vi.fn((callback) => callback(tx)),
    } as never);
    const removeSourceAssets = vi.fn().mockResolvedValue(undefined);

    await expect(repository.replaceCallRecordingAndResetProcessingJob({
      callId: "call-1",
      recording: {
        contentType: "video/mp4",
        fileSizeBytes: 1024,
        storageBucket: "call-recordings",
        storagePath: "replacement.mp4",
      },
      job: {
        rubricId: null,
        sourceContentType: "video/mp4",
        sourceFileName: "replacement.mp4",
        sourceOrigin: "zoom_recording",
        sourceSizeBytes: 1024,
        sourceStoragePath: "replacement.mp4",
      },
    }, removeSourceAssets)).rejects.toBe(writeError);

    expect(removeSourceAssets).not.toHaveBeenCalled();
  });

  it("maps title filter rows from the requested tenant and derives configured true", async () => {
    const rows = [
      { kind: "exclude", phrase: "Internal" },
      { kind: "include", phrase: "Weekly Review" },
      { kind: "include", phrase: "Customer Call" },
    ];
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    };
    const db = {
      select: vi.fn().mockReturnValue(query),
    };
    const repository = new DrizzleZoomWebhookRepository(db as never);

    await expect(repository.findIngestionTitleFilterConfig("org-1")).resolves.toEqual({
      configured: true,
      excludePhrases: ["Internal"],
      includePhrases: ["Weekly Review", "Customer Call"],
    });
    expect(db.select).toHaveBeenCalledWith({
      kind: organizationIngestionTitleFiltersTable.kind,
      phrase: organizationIngestionTitleFiltersTable.phrase,
    });
    expect(query.from).toHaveBeenCalledWith(organizationIngestionTitleFiltersTable);
    expect(eqSpy).toHaveBeenCalledWith(
      organizationIngestionTitleFiltersTable.orgId,
      "org-1",
    );
    expect(query.where).toHaveBeenCalledWith({
      args: [organizationIngestionTitleFiltersTable.orgId, "org-1"],
      operation: "eq",
    });
  });

  it("derives configured false when the tenant has no include rows", async () => {
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { kind: "exclude", phrase: "Internal" },
      ]),
    };
    const db = {
      select: vi.fn().mockReturnValue(query),
    };
    const repository = new DrizzleZoomWebhookRepository(db as never);

    await expect(repository.findIngestionTitleFilterConfig("org-2")).resolves.toEqual({
      configured: false,
      excludePhrases: ["Internal"],
      includePhrases: [],
    });
  });
});
