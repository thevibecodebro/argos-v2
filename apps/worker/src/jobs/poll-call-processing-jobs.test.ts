import { describe, expect, it, vi } from "vitest";
import { pollCallProcessingJobs } from "./poll-call-processing-jobs";

describe("pollCallProcessingJobs", () => {
  it("claims one pending job and hands it to the processor", async () => {
    const job = { id: "job-1", callId: "call-1" };
    const repository = {
      claimNextJob: vi.fn().mockResolvedValue(job),
    };
    const processJob = vi.fn().mockResolvedValue(undefined);

    await pollCallProcessingJobs({
      repository: repository as never,
      processJob,
      now: new Date("2026-04-18T10:00:00.000Z"),
      once: true,
    });

    expect(repository.claimNextJob).toHaveBeenCalledTimes(1);
    expect(processJob).toHaveBeenCalledWith(job);
  });
});
