import type { Lease, WriteOutcome } from "../calls/processing-checkpoints";

export class LostJobLeaseError extends Error {
  constructor(readonly lease: Lease) {
    super(`Lost processing lease for job ${lease.jobId}`);
    this.name = "LostJobLeaseError";
  }
}

export async function withJobLease<T>(input: {
  heartbeatIntervalMs: number;
  lease: Lease;
  renewLease: (lease: Lease) => Promise<WriteOutcome>;
  work: (signal: AbortSignal) => Promise<T>;
}): Promise<T> {
  const controller = new AbortController();
  let renewal: Promise<void> = Promise.resolve();

  const heartbeat = () => {
    renewal = input.renewLease(input.lease).then((outcome) => {
      if (outcome === "lost_lease" && !controller.signal.aborted) {
        controller.abort(new LostJobLeaseError(input.lease));
      }
    }).catch((error) => {
      if (!controller.signal.aborted) controller.abort(error);
    });
  };

  const timer = setInterval(heartbeat, input.heartbeatIntervalMs);
  timer.unref?.();

  try {
    const result = await input.work(controller.signal);
    if (controller.signal.aborted) {
      throw controller.signal.reason instanceof Error
        ? controller.signal.reason
        : new LostJobLeaseError(input.lease);
    }
    return result;
  } finally {
    clearInterval(timer);
    await renewal.catch(() => undefined);
  }
}
