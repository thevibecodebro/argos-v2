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
      job: { generation: 1, id: "job-1", sourceSizeBytes: 40 },
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
  });

  it("does not dispatch another provider request after the chunk attempt limit", async () => {
    const repository = createRepository();
    repository.beginChunkAttempt.mockResolvedValue(4);
    const transcribe = vi.fn();

    await expect(transcribeChunksResumable({
      chunks: [{ filePath: "/tmp/0.mp3", startSeconds: 0, endSeconds: 10 }],
      durationSeconds: 10,
      job: { generation: 1, id: "job-exhausted", sourceSizeBytes: 40 },
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
});
