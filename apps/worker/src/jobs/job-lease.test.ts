import { describe, expect, it, vi } from "vitest";
import { LostJobLeaseError, withJobLease } from "./job-lease";

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
});
