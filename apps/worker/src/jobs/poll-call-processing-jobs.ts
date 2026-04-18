import type { CallProcessingRepository } from "../calls/repository";

type ClaimedCallProcessingJob = NonNullable<
  Awaited<ReturnType<CallProcessingRepository["claimNextJob"]>>
>;

type PollCallProcessingJobsInput = {
  repository: Pick<CallProcessingRepository, "claimNextJob">;
  processJob: (job: ClaimedCallProcessingJob) => Promise<void>;
  now?: Date;
  once?: boolean;
  pollIntervalMs?: number;
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
    const claimed = await input.repository.claimNextJob(input.now ?? new Date());

    if (claimed) {
      await input.processJob(claimed);
    }

    if (input.once) {
      return;
    }

    await sleep(input.pollIntervalMs ?? 5_000);
  } while (true);
}
