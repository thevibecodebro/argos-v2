import { describe, expect, it, vi } from "vitest";
import { CallProcessingRepository } from "./repository";

describe("CallProcessingRepository chunk fencing", () => {
  it("reports lease loss when completed-chunk progress cannot be fenced", async () => {
    const tx = {
      execute: vi.fn()
        .mockResolvedValueOnce([{ id: "job-1" }])
        .mockResolvedValueOnce([{ id: "chunk-1" }])
        .mockResolvedValueOnce([]),
    };
    const repository = new CallProcessingRepository({
      transaction: vi.fn((callback) => callback(tx)),
    } as never);

    await expect(repository.saveCompletedChunk(
      { jobId: "job-1", token: "00000000-0000-4000-8000-000000000001" },
      {
        audioHash: "audio-hash",
        endSeconds: 10,
        fingerprint: "manifest-1",
        index: 0,
        latencyMs: 100,
        providerRequestId: "req-1",
        startSeconds: 0,
        transcript: [{ speaker: "Speaker A", text: "Hello", timestampSeconds: 0 }],
      },
    )).resolves.toBe("lost_lease");

    expect(tx.execute).toHaveBeenCalledTimes(3);
  });
});
