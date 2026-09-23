import { describe, expect, it, vi } from "vitest";
import {
  LostJobLeaseError,
  ProcessingDeadlineExceededError,
  withJobLease,
} from "./job-lease";

describe("withJobLease", () => {
  it("aborts work after lease renewal is rejected", async () => {
    vi.useFakeTimers();
    const work = withJobLease({
      heartbeatIntervalMs: 1_000,
      lease: { jobId: "job-1", token: "token-1" },
      renewLease: vi.fn().mockResolvedValue("lost_lease"),
      work: (signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
    });
    const assertion = expect(work).rejects.toBeInstanceOf(LostJobLeaseError);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    vi.useRealTimers();
  });

  it("treats renewal transport errors as unknown ownership", async () => {
    vi.useFakeTimers();
    const work = withJobLease({
      heartbeatIntervalMs: 1_000,
      lease: { jobId: "job-1", token: "token-1" },
      renewLease: vi.fn().mockRejectedValue(new Error("database connection reset")),
      work: (signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
    });
    const assertion = expect(work).rejects.toBeInstanceOf(LostJobLeaseError);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    vi.useRealTimers();
  });

  it("clears the heartbeat when work completes", async () => {
    vi.useFakeTimers();
    const renewLease = vi.fn().mockResolvedValue("written");
    await expect(withJobLease({
      heartbeatIntervalMs: 1_000,
      lease: { jobId: "job-1", token: "token-1" },
      renewLease,
      work: async () => "done",
    })).resolves.toBe("done");
    await vi.advanceTimersByTimeAsync(5_000);
    expect(renewLease).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("aborts active work when the processing deadline is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00Z"));
    const work = withJobLease({
      deadlineAt: new Date("2026-09-23T12:00:05Z"),
      heartbeatIntervalMs: 60_000,
      lease: { jobId: "job-deadline", token: "token-1" },
      renewLease: vi.fn().mockResolvedValue("written"),
      work: (signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
    });
    const assertion = expect(work).rejects.toBeInstanceOf(ProcessingDeadlineExceededError);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    vi.useRealTimers();
  });

  it("does not start work when the processing deadline already passed", async () => {
    const work = vi.fn();

    await expect(withJobLease({
      deadlineAt: new Date(Date.now() - 1),
      heartbeatIntervalMs: 60_000,
      lease: { jobId: "job-expired", token: "token-1" },
      renewLease: vi.fn().mockResolvedValue("written"),
      work,
    })).rejects.toBeInstanceOf(ProcessingDeadlineExceededError);

    expect(work).not.toHaveBeenCalled();
  });
});
