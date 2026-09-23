import { describe, expect, it, vi } from "vitest";
import { GhlImportRepository } from "../ghl/repository";
import { GoogleMeetImportRepository } from "../google-meet/repository";

describe("durable importer source cleanup", () => {
  for (const Repository of [GhlImportRepository, GoogleMeetImportRepository]) {
    it(`${Repository.name} saves the superseded path in the same transaction as the replacement`, async () => {
      const oldPath = "recordings/call/source/old.m4a";
      const newPath = "recordings/call/source/new.m4a";
      const lock: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const key of ["from", "where", "limit"]) lock[key] = vi.fn(() => lock);
      lock.for = vi.fn(async () => [{ id: "call", recordingStoragePath: oldPath }]);
      const lookup: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const key of ["from", "where"]) lookup[key] = vi.fn(() => lookup);
      lookup.limit = vi.fn(async () => []);
      const values = vi.fn(async () => undefined);
      const tx = {
        select: vi.fn().mockReturnValueOnce(lock).mockReturnValueOnce(lookup),
        update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })),
        insert: vi.fn(() => ({ values })),
      };
      const repository = new Repository({ transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) } as never);
      await repository.createOrResetCallProcessingJob({
        callId: "call", rubricId: null, sourceOrigin: "ghl_recording" as never,
        sourceStoragePath: newPath, sourceFileName: "new.m4a",
        sourceContentType: "audio/mp4", sourceSizeBytes: 100,
      } as never);
      expect(values).toHaveBeenCalledWith(expect.objectContaining({
        sourceStoragePath: newPath, pendingSourceCleanupPaths: [oldPath],
      }));
    });
  }
});
