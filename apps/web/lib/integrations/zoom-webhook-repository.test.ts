import { describe, expect, it, vi } from "vitest";
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

describe("DrizzleZoomWebhookRepository", () => {
  it("locks the processing job before the call during source replacement", async () => {
    const fromOrder: unknown[] = [];
    const query = (rows: unknown[]) => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue(rows),
    });
    const jobQuery = query([{ sourceStoragePath: "old.mp4", status: "running" }]);
    const callQuery = query([{ recordingStoragePath: "old.mp4" }]);
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table) => {
          fromOrder.push(table);
          return table === callProcessingJobsTable ? jobQuery : callQuery;
        }),
      })),
    };
    const repository = new DrizzleZoomWebhookRepository({
      transaction: vi.fn((callback) => callback(tx)),
    } as never);

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
    }, vi.fn().mockResolvedValue(undefined))).resolves.toBe(false);

    expect(fromOrder).toEqual([callProcessingJobsTable, callsTable]);
    expect(jobQuery.for).toHaveBeenCalledWith("update");
    expect(callQuery.for).toHaveBeenCalledWith("update");
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
