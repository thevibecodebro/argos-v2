import { describe, expect, it, vi } from "vitest";
import { TranscriptionRequestError } from "@argos-v2/call-processing";
import {
  ChunkAttemptsExhaustedError,
  JobRetryScheduledError,
  transcribeChunksResumable,
} from "./transcribe-chunks";

function createRepository() {
  const completed = new Map<number, any>();
  const attempts = new Map<number, number>();
  return {
    completed,
    beginChunkAttempt: vi.fn(async (_lease, chunk) => {
      const count = (attempts.get(chunk.index) ?? 0) + 1;
      attempts.set(chunk.index, count);
      return count;
    }),
    listCompletedChunks: vi.fn(async () => [...completed.values()]),
    releaseForRetry: vi.fn().mockResolvedValue("written"),
    setChunkManifest: vi.fn().mockResolvedValue("written"),
    saveChunkFailure: vi.fn().mockResolvedValue("written"),
    saveCompletedChunk: vi.fn(async (_lease, chunk) => { completed.set(chunk.index, chunk); return "written"; }),
    saveTranscriptCheckpoint: vi.fn().mockResolvedValue("written"),
  };
}

describe("transcribeChunksResumable", () => {
  it("runs bounded chunk requests together and merges transcripts in recording order", async () => {
    const repository = createRepository();
    const releases: Array<() => void> = [];
    let active = 0;
    let peakActive = 0;
    const transcribe = vi.fn(async ({ fileName }: { fileName: string }) => {
      active += 1;
      peakActive = Math.max(peakActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      const index = Number(fileName.match(/(\d+)/)?.[1]);
      return { durationSeconds: 10, transcript: [{ speaker: "A", text: `chunk ${index}`, timestampSeconds: 0 }] };
    });
    const processing = transcribeChunksResumable({
      chunks: [0, 1, 2].map((index) => ({ filePath: `/tmp/${index}.mp3`, startSeconds: index * 10, endSeconds: (index + 1) * 10 })),
      concurrency: 2,
      durationSeconds: 30,
      job: { generation: 1, id: "job-parallel", sourceSizeBytes: 30, sourceStoragePath: "recordings/job-parallel/source.mp3" },
      lease: { jobId: "job-parallel", token: "token-1" },
      model: "model-1",
      readFile: vi.fn(async (path) => Buffer.from(String(path))) as never,
      repository: repository as never,
      timeoutMs: 120_000,
      transcribe: transcribe as never,
    });

    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledTimes(2));
    expect(peakActive).toBe(2);
    releases[1]!();
    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledTimes(3));
    releases[2]!();
    releases[0]!();
    const result = await processing;
    expect(result.transcript.map((line) => line.text)).toEqual(["chunk 0", "chunk 1", "chunk 2"]);
    expect(repository.saveTranscriptCheckpoint).toHaveBeenCalledTimes(1);
  });

  it("waits for in-flight chunk checkpoints before releasing a retrying job", async () => {
    const repository = createRepository();
    let finishSecond!: () => void;
    const secondPending = new Promise<void>((resolve) => { finishSecond = resolve; });
    const transcribe = vi.fn(async ({ fileName }: { fileName: string }) => {
      const index = Number(fileName.match(/(\d+)/)?.[1]);
      if (index === 0) {
        throw new TranscriptionRequestError("Rate limited", {
          category: "rate_limit", elapsedMs: 100, providerRequestId: null, retryAfterMs: 5_000, status: 429,
        });
      }
      await secondPending;
      return { durationSeconds: 10, transcript: [{ speaker: "A", text: `chunk ${index}`, timestampSeconds: 0 }] };
    });
    const processing = transcribeChunksResumable({
      chunks: [0, 1, 2].map((index) => ({ filePath: `/tmp/${index}.mp3`, startSeconds: index * 10, endSeconds: (index + 1) * 10 })),
      concurrency: 2,
      durationSeconds: 30,
      job: { generation: 1, id: "job-retry-parallel", sourceSizeBytes: 30, sourceStoragePath: "recordings/job-retry-parallel/source.mp3" },
      lease: { jobId: "job-retry-parallel", token: "token-1" },
      model: "model-1",
      now: () => new Date("2026-09-24T12:00:00Z"),
      random: () => 0,
      readFile: vi.fn(async (path) => Buffer.from(String(path))) as never,
      repository: repository as never,
      timeoutMs: 120_000,
      transcribe: transcribe as never,
    });

    await vi.waitFor(() => expect(repository.saveChunkFailure).toHaveBeenCalledTimes(1));
    expect(repository.releaseForRetry).not.toHaveBeenCalled();
    finishSecond();
    await expect(processing).rejects.toBeInstanceOf(JobRetryScheduledError);
    expect(repository.saveCompletedChunk).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ index: 1 }));
    expect(repository.releaseForRetry).toHaveBeenCalledTimes(1);
    expect(transcribe).toHaveBeenCalledTimes(2);
  });

  it("resumes at the failed chunk instead of retranscribing completed chunks", async () => {
    const repository = createRepository();
    const calls: number[] = [];
    let failOnce = true;
    const transcribe = vi.fn(async ({ fileName }: { fileName: string }) => {
      const index = Number(fileName.match(/(\d+)/)?.[1]);
      calls.push(index);
      if (index === 2 && failOnce) {
        failOnce = false;
        throw new TranscriptionRequestError("Transcription request timed out", {
          category: "timeout", elapsedMs: 120_000, providerRequestId: null, retryAfterMs: null, status: null,
        });
      }
      return { durationSeconds: 10, transcript: [{ speaker: "A", text: `chunk ${index}`, timestampSeconds: 0 }] };
    });
    const run = () => transcribeChunksResumable({
      chunks: [0, 1, 2, 3].map((index) => ({ filePath: `/tmp/${index}.mp3`, startSeconds: index * 10, endSeconds: (index + 1) * 10 })),
      durationSeconds: 40,
      job: { generation: 1, id: "job-1", sourceSizeBytes: 40, sourceStoragePath: "recordings/job-1/source.mp3" },
      lease: { jobId: "job-1", token: "token-1" },
      model: "model-1",
      now: () => new Date("2026-09-21T12:00:00Z"),
      random: () => 0,
      readFile: vi.fn(async (path) => Buffer.from(String(path))) as never,
      repository: repository as never,
      timeoutMs: 120_000,
      transcribe: transcribe as never,
    });

    await expect(run()).rejects.toBeInstanceOf(JobRetryScheduledError);
    await expect(run()).resolves.toMatchObject({ durationSeconds: 40 });
    expect(calls).toEqual([0, 1, 2, 2, 3]);
    expect(repository.saveTranscriptCheckpoint).toHaveBeenCalledTimes(1);
    expect(repository.saveTranscriptCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ resumeFingerprint: expect.any(String) }),
    );
  });

  it("does not dispatch another provider request after the chunk attempt limit", async () => {
    const repository = createRepository();
    repository.beginChunkAttempt.mockResolvedValue(4);
    const transcribe = vi.fn();

    await expect(transcribeChunksResumable({
      chunks: [{ filePath: "/tmp/0.mp3", startSeconds: 0, endSeconds: 10 }],
      durationSeconds: 10,
      job: { generation: 1, id: "job-exhausted", sourceSizeBytes: 40, sourceStoragePath: "recordings/job-exhausted/source.mp3" },
      lease: { jobId: "job-exhausted", token: "token-1" },
      model: "model-1",
      readFile: vi.fn(async (path) => Buffer.from(String(path))) as never,
      repository: repository as never,
      timeoutMs: 120_000,
      transcribe: transcribe as never,
    })).rejects.toBeInstanceOf(ChunkAttemptsExhaustedError);

    expect(transcribe).not.toHaveBeenCalled();
    expect(repository.releaseForRetry).not.toHaveBeenCalled();
    expect(repository.saveChunkFailure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attemptCount: 4, errorCode: "attempt_limit", nextRunAt: null }),
    );
  });

  it("does not rewrite a completed chunk as failed when checkpoint persistence errors", async () => {
    const repository = createRepository();
    const persistenceError = new Error("database acknowledgement lost");
    repository.saveCompletedChunk.mockRejectedValue(persistenceError);

    await expect(transcribeChunksResumable({
      chunks: [{ filePath: "/tmp/0.mp3", startSeconds: 0, endSeconds: 10 }],
      durationSeconds: 10,
      job: { generation: 1, id: "job-write-error", sourceSizeBytes: 40, sourceStoragePath: "recordings/job-write-error/source.mp3" },
      lease: { jobId: "job-write-error", token: "token-1" },
      model: "model-1",
      readFile: vi.fn(async (path) => Buffer.from(String(path))) as never,
      repository: repository as never,
      timeoutMs: 120_000,
      transcribe: vi.fn().mockResolvedValue({
        durationSeconds: 10,
        transcript: [{ speaker: "A", text: "complete", timestampSeconds: 0 }],
      }) as never,
    })).rejects.toBe(persistenceError);

    expect(repository.saveChunkFailure).not.toHaveBeenCalled();
    expect(repository.releaseForRetry).not.toHaveBeenCalled();
  });
});
