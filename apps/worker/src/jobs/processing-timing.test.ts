import { describe, expect, it, vi } from "vitest";
import { createProcessingTimer } from "./processing-timing";

describe("createProcessingTimer", () => {
  it("records a successful stage with timestamps and elapsed time", async () => {
    const emit = vi.fn();
    const timer = createProcessingTimer({ attemptCount: 3, callId: "call-1", generation: 2, jobId: "job-1", emit });

    const result = await timer.measure("download", async () => "source.mp3");

    expect(result).toBe("source.mp3");
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      event: "call_processing.stage_completed",
      callId: "call-1",
      attemptCount: 3,
      generation: 2,
      jobId: "job-1",
      stage: "download",
      elapsedMs: expect.any(Number),
      startedAt: expect.any(String),
      completedAt: expect.any(String),
    }));
  });

  it("records a failed stage and preserves the original error", async () => {
    const emit = vi.fn();
    const timer = createProcessingTimer({ attemptCount: 3, callId: "call-1", generation: 2, jobId: "job-1", emit });
    const failure = new Error("sensitive provider detail");

    await expect(timer.measure("score", async () => { throw failure; })).rejects.toBe(failure);

    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      event: "call_processing.stage_failed",
      stage: "score",
      elapsedMs: expect.any(Number),
    }));
    expect(JSON.stringify(emit.mock.calls)).not.toContain("sensitive provider detail");
  });
});
