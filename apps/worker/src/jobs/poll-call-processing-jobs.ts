import type { CallProcessingRepository } from "../calls/repository";

type ClaimedCallProcessingJob = NonNullable<
  Awaited<ReturnType<CallProcessingRepository["claimNextJob"]>>
>;

type PollCallProcessingJobsInput = {
  repository: Pick<
    CallProcessingRepository,
    "claimNextJob" | "clearPendingSourceCleanup" | "findPendingSourceCleanup"
  >;
  cleanupSourceAssets?: (storagePaths: string[]) => Promise<void>;
  onCleanupError?: (error: unknown) => void;
  processJob: (job: ClaimedCallProcessingJob) => Promise<void>;
  onPollError?: (error: unknown) => void;
  onPollSuccess?: () => void;
  now?: Date;
  once?: boolean;
  pollIntervalMs?: number;
  processingMaxElapsedMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollCallProcessingJobs(
  input: PollCallProcessingJobsInput,
) {
  const sleep = input.sleep ?? defaultSleep;

  do {
    if (input.cleanupSourceAssets) {
      try {
        const cleanup = await input.repository.findPendingSourceCleanup();
        if (cleanup) {
          await input.cleanupSourceAssets(cleanup.storagePaths);
          await input.repository.clearPendingSourceCleanup(cleanup.jobId, cleanup.storagePaths);
        }
      } catch (error) {
        input.onCleanupError?.(error);
      }
    }

    let claimed: ClaimedCallProcessingJob | null;
    try {
      claimed = await input.repository.claimNextJob(
        input.now ?? null,
        input.processingMaxElapsedMs,
      );
    } catch (error) {
      input.onPollError?.(error);
      if (input.once) throw error;
      await sleep(input.pollIntervalMs ?? 5_000);
      continue;
    }
    input.onPollSuccess?.();

    if (claimed) {
      await input.processJob(claimed);
    }

    if (input.once) {
      return;
    }

    await sleep(input.pollIntervalMs ?? 5_000);
  } while (true);
}
