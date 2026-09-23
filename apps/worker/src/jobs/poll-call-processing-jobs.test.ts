import { describe, expect, it, vi } from "vitest";
import { pollCallProcessingJobs } from "./poll-call-processing-jobs";

describe("pollCallProcessingJobs", () => {
  it("clears persisted source cleanup work only after storage deletion succeeds", async () => {
    const storagePaths = ["recordings/call-1/old.m4a"];
    const repository = {
      claimNextJob: vi.fn().mockResolvedValue(null),
      processPendingSourceCleanup: vi.fn(async (
        removeSourceAssets: (paths: string[]) => Promise<void>,
      ) => {
        await removeSourceAssets(storagePaths);
        return true;
      }),
    };
    const cleanupSourceAssets = vi.fn().mockResolvedValue(undefined);

    await pollCallProcessingJobs({
      cleanupSourceAssets,
      once: true,
      processJob: vi.fn(),
      repository,
    });

    expect(cleanupSourceAssets).toHaveBeenCalledWith(storagePaths);
    expect(repository.processPendingSourceCleanup).toHaveBeenCalledWith(cleanupSourceAssets);
  });

  it("retains persisted source cleanup work when storage deletion fails", async () => {
    const cleanupError = new Error("storage unavailable");
    const repository = {
      claimNextJob: vi.fn().mockResolvedValue(null),
      processPendingSourceCleanup: vi.fn(async (
        removeSourceAssets: (paths: string[]) => Promise<void>,
      ) => {
        await removeSourceAssets(["recordings/call-1/old.m4a"]);
        return true;
      }),
    };
    const onCleanupError = vi.fn();

    await pollCallProcessingJobs({
      cleanupSourceAssets: vi.fn().mockRejectedValue(cleanupError),
      onCleanupError,
      once: true,
      processJob: vi.fn(),
      repository,
    });

    expect(onCleanupError).toHaveBeenCalledWith(cleanupError);
    expect(repository.processPendingSourceCleanup).toHaveBeenCalledOnce();
  });

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
  it("recovers after a temporary claim error and reports restored health", async () => {
    const job = { id: "job-2", callId: "call-2" };
    const outage = new Error("temporary database connection reset");
    const stopped = new Error("test loop stopped");
    const repository = {
      claimNextJob: vi.fn().mockRejectedValueOnce(outage).mockResolvedValueOnce(job),
    };
    const processJob = vi.fn().mockResolvedValue(undefined);
    const onPollError = vi.fn();
    const onPollSuccess = vi.fn();
    const sleep = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(stopped);

    await expect(pollCallProcessingJobs({
      repository: repository as never, processJob, sleep, onPollError, onPollSuccess,
      pollIntervalMs: 5000,
    })).rejects.toBe(stopped);

    expect(repository.claimNextJob).toHaveBeenCalledTimes(2);
    expect(repository.claimNextJob).toHaveBeenCalledWith(null, undefined);
    expect(processJob).toHaveBeenCalledWith(job);
    expect(onPollError).toHaveBeenCalledWith(outage);
    expect(onPollSuccess).toHaveBeenCalledTimes(1);
    expect(onPollError.mock.invocationCallOrder[0]).toBeLessThan(onPollSuccess.mock.invocationCallOrder[0]);
    expect(sleep).toHaveBeenNthCalledWith(1, 5000);
  });

  it("waits between repeated failures instead of terminating or spinning", async () => {
    const outage = new Error("database unavailable");
    const stopped = new Error("test loop stopped");
    const repository = { claimNextJob: vi.fn().mockRejectedValue(outage) };
    const sleep = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(stopped);
    const onPollError = vi.fn();
    const onPollSuccess = vi.fn();

    await expect(pollCallProcessingJobs({
      repository: repository as never, processJob: vi.fn(), sleep, onPollError, onPollSuccess,
    })).rejects.toBe(stopped);

    expect(repository.claimNextJob).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(onPollError).toHaveBeenCalledTimes(2);
    expect(onPollSuccess).not.toHaveBeenCalled();
  });

  it("still reports a failed one-shot run to its caller", async () => {
    const outage = new Error("database unavailable");
    const onPollError = vi.fn();
    const sleep = vi.fn();
    await expect(pollCallProcessingJobs({
      repository: { claimNextJob: vi.fn().mockRejectedValue(outage) } as never,
      processJob: vi.fn(), once: true, sleep, onPollError,
    })).rejects.toBe(outage);
    expect(onPollError).toHaveBeenCalledWith(outage);
    expect(sleep).not.toHaveBeenCalled();
  });

});
