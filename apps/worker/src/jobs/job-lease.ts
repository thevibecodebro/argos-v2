import type { Lease, WriteOutcome } from "../calls/processing-checkpoints";

export class LostJobLeaseError extends Error {
  constructor(readonly lease: Lease) {
    super(`Lost processing lease for job ${lease.jobId}`);
    this.name = "LostJobLeaseError";
  }
}

export class ProcessingDeadlineExceededError extends Error {
  constructor(readonly lease: Lease, readonly deadlineAt: Date) {
    super(`Processing deadline exceeded for job ${lease.jobId}`);
    this.name = "ProcessingDeadlineExceededError";
  }
}

export async function withJobLease<T>(input: {
  deadlineAt?: Date | null;
  heartbeatIntervalMs: number;
  lease: Lease;
  renewLease: (lease: Lease) => Promise<WriteOutcome>;
  work: (signal: AbortSignal) => Promise<T>;
}): Promise<T> {
  const controller = new AbortController();
  let renewal: Promise<void> = Promise.resolve();
  const deadlineDelayMs = input.deadlineAt ? input.deadlineAt.getTime() - Date.now() : null;
  if (input.deadlineAt && deadlineDelayMs !== null && deadlineDelayMs <= 0) {
    controller.abort(new ProcessingDeadlineExceededError(input.lease, input.deadlineAt));
  }
  const deadlineTimer = deadlineDelayMs === null || deadlineDelayMs <= 0 ? null : setTimeout(() => {
    if (!controller.signal.aborted && input.deadlineAt) {
      controller.abort(new ProcessingDeadlineExceededError(input.lease, input.deadlineAt));
    }
  }, deadlineDelayMs);
  deadlineTimer?.unref?.();

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
    if (controller.signal.aborted) {
      throw controller.signal.reason;
    }
    const result = await input.work(controller.signal);
    if (controller.signal.aborted) {
      throw controller.signal.reason instanceof Error
        ? controller.signal.reason
        : new LostJobLeaseError(input.lease);
    }
    return result;
  } finally {
    clearInterval(timer);
    if (deadlineTimer) clearTimeout(deadlineTimer);
    await renewal.catch(() => undefined);
  }
}
