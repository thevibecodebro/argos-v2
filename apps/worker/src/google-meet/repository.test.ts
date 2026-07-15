import { callProcessingJobsTable } from "@argos-v2/db";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { GoogleMeetImportRepository } from "./repository";

describe("GoogleMeetImportRepository", () => {
  it("does not reset an existing processing job when an import is replayed", async () => {
    const builder = {
      onConflictDoNothing: vi.fn(async () => undefined),
      values: vi.fn(),
    };
    builder.values.mockReturnValue(builder);
    const repository = new GoogleMeetImportRepository({
      insert: vi.fn(() => builder),
    } as never);

    await repository.createOrResetCallProcessingJob({
      callId: "00000000-0000-4000-8000-000000000001",
      rubricId: null,
      sourceContentType: "video/mp4",
      sourceFileName: "google-meet-recording-1.mp4",
      sourceOrigin: "google_meet_recording",
      sourceSizeBytes: 100,
      sourceStoragePath: "recordings/call-1/source/google-meet-recording-1.mp4",
    });

    expect(builder.onConflictDoNothing).toHaveBeenCalledWith({
      target: callProcessingJobsTable.callId,
    });
  });

  it("locks an import before deciding whether to create its call", async () => {
    const existing = [{ callId: "00000000-0000-4000-8000-000000000001" }];
    const selectBuilder = {
      for: vi.fn(async () => existing),
      from: vi.fn(),
      limit: vi.fn(),
      then: (resolve: (value: typeof existing) => void) => resolve(existing),
      where: vi.fn(),
    };
    selectBuilder.from.mockReturnValue(selectBuilder);
    selectBuilder.where.mockReturnValue(selectBuilder);
    selectBuilder.limit.mockReturnValue(selectBuilder);
    const tx = {
      insert: vi.fn(),
      select: vi.fn(() => selectBuilder),
    };
    const repository = new GoogleMeetImportRepository({
      transaction: vi.fn(async (callback) => callback(tx)),
    } as never);

    const call = await repository.createCallForGoogleMeetImport({
      consentConfirmed: true,
      importId: "00000000-0000-4000-8000-000000000002",
      meetingTitle: "Acme Product Demo",
      orgId: "00000000-0000-4000-8000-000000000003",
      repId: "00000000-0000-4000-8000-000000000004",
      rubricId: null,
    });

    expect(call).toEqual({ id: existing[0].callId });
    expect(selectBuilder.for).toHaveBeenCalledWith("update");
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("does not overwrite a deletion tombstone during discovery upserts", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new GoogleMeetImportRepository(db as never);

    await repository.upsertGoogleMeetImport({
      conferenceEndedAt: new Date("2026-07-15T11:00:00.000Z"),
      conferenceRecordName: "conferenceRecords/record-1",
      conferenceStartedAt: new Date("2026-07-15T10:00:00.000Z"),
      driveFileId: "drive-file-1",
      integrationId: "integration-1",
      meetingCode: "abc-defg-hij",
      meetingTitle: "Customer demo",
      orgId: "org-1",
      recordingName: "conferenceRecords/record-1/recordings/recording-1",
      skippedReason: null,
      status: "pending",
      titleSource: "calendar",
    });

    const conflict = onConflictDoUpdate.mock.calls[0]?.[0];
    expect(conflict?.setWhere).toBeDefined();
    expect(new PgDialect().sqlToQuery(conflict.setWhere)).toMatchObject({
      params: ["deleted"],
      sql: '"google_meet_imports"."status" <> $1',
    });
  });
});
