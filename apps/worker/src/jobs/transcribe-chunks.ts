import { readFile } from "node:fs/promises";
import {
  mergeTranscriptLines,
  TranscriptionRequestError,
  type TranscriptLine,
  type transcribeAudioBuffer,
} from "@argos-v2/call-processing";
import {
  createManifestFingerprint,
  createTranscriptResumeFingerprint,
  sha256,
  type ChunkCheckpoint,
  type Lease,
  type WriteOutcome,
} from "../calls/processing-checkpoints";
import { LostJobLeaseError } from "./job-lease";

export class JobRetryScheduledError extends Error {
  constructor(readonly nextRunAt: Date) {
    super(`Call processing retry scheduled for ${nextRunAt.toISOString()}`);
    this.name = "JobRetryScheduledError";
  }
}

export class ChunkAttemptsExhaustedError extends Error {
  constructor(readonly chunkIndex: number, readonly errorCode: string, options?: ErrorOptions) {
    super(`Chunk ${chunkIndex} transcription attempts exhausted (${errorCode})`, options);
    this.name = "ChunkAttemptsExhaustedError";
  }
}

class DeferredChunkRetryError extends Error {
  constructor(
    readonly chunkIndex: number,
    readonly attemptCount: number,
    readonly errorCode: string,
    readonly nextRunAt: Date,
    message: string,
  ) {
    super(message);
  }
}

type Chunk = { endSeconds: number; filePath: string; startSeconds: number };

export const TRANSCRIPTION_NORMALIZATION_VERSION = "mono-16khz-32kbps-v1";
export const TRANSCRIPT_FORMAT_VERSION = 1;

type ResumableChunkRepository = {
  beginChunkAttempt(lease: Lease, input: Omit<ChunkCheckpoint, "transcript">): Promise<number | "lost_lease">;
  listCompletedChunks(jobId: string, fingerprint: string): Promise<ChunkCheckpoint[]>;
  releaseForRetry(lease: Lease, input: { lastError: string; nextRunAt: Date }): Promise<WriteOutcome>;
  setChunkManifest(lease: Lease, input: { fingerprint: string; totalChunks: number }): Promise<WriteOutcome>;
  saveChunkFailure(lease: Lease, input: {
    attemptCount: number; errorCode: string; errorMessage: string; fingerprint: string;
    index: number; nextRunAt: Date | null; providerRequestId: string | null;
  }): Promise<WriteOutcome>;
  saveCompletedChunk(lease: Lease, input: ChunkCheckpoint & { latencyMs: number; providerRequestId: string | null }): Promise<WriteOutcome>;
  saveTranscriptCheckpoint(lease: Lease, input: {
    durationSeconds: number; fingerprint: string; generation: number; resumeFingerprint: string;
    transcript: TranscriptLine[]; transcriptHash: string;
  }): Promise<WriteOutcome>;
};

function assertWritten(outcome: WriteOutcome, lease: Lease) {
  if (outcome === "lost_lease") throw new LostJobLeaseError(lease);
}

function canRetry(error: unknown) {
  return error instanceof TranscriptionRequestError
    && ["network", "rate_limit", "server", "timeout"].includes(error.details.category);
}

function safeErrorCode(error: unknown) {
  return error instanceof TranscriptionRequestError ? error.details.category : "transcription_failed";
}

export async function transcribeChunksResumable(input: {
  chunks: Chunk[];
  concurrency?: number;
  durationSeconds: number;
  job: { generation: number; id: string; sourceSizeBytes: number | null; sourceStoragePath: string };
  lease: Lease;
  maxAttempts?: number;
  model: string;
  now?: () => Date;
  random?: () => number;
  readFile?: typeof readFile;
  repository: ResumableChunkRepository;
  signal?: AbortSignal;
  timeoutMs: number;
  transcribe: typeof transcribeAudioBuffer;
  onEvent?: (event: Record<string, unknown>) => void;
}) {
  const read = input.readFile ?? readFile;
  const now = input.now ?? (() => new Date());
  const random = input.random ?? Math.random;
  const maxAttempts = input.maxAttempts ?? 3;
  const manifests: Array<Chunk & { audioHash: string; index: number }> = [];
  for (const [index, chunk] of input.chunks.entries()) {
    const bytes = await read(chunk.filePath);
    manifests.push({ ...chunk, audioHash: sha256(bytes), index });
  }
  const fingerprint = createManifestFingerprint({
    chunks: manifests.map(({ audioHash, endSeconds, startSeconds }) => ({ audioHash, endSeconds, startSeconds })),
    generation: input.job.generation,
    model: input.model,
    normalizationVersion: TRANSCRIPTION_NORMALIZATION_VERSION,
    sourceSizeBytes: input.job.sourceSizeBytes,
    transcriptFormatVersion: TRANSCRIPT_FORMAT_VERSION,
  });
  const completed = new Map(
    (await input.repository.listCompletedChunks(input.job.id, fingerprint)).map((chunk) => [chunk.index, chunk]),
  );
  assertWritten(await input.repository.setChunkManifest(input.lease, {
    fingerprint,
    totalChunks: manifests.length,
  }), input.lease);
  input.onEvent?.({
    event: "call_processing.manifest_ready",
    jobId: input.job.id,
    completedChunks: completed.size,
    totalChunks: manifests.length,
  });

  const pending = manifests.filter((chunk) => !completed.has(chunk.index));
  const workerCount = Math.min(pending.length, Math.max(1, Math.min(input.concurrency ?? 1, 4)));
  let nextIndex = 0;
  let stopDispatch = false;
  const processChunk = async (chunk: (typeof manifests)[number]) => {
    input.signal?.throwIfAborted();

    const checkpoint = {
      audioHash: chunk.audioHash,
      endSeconds: chunk.endSeconds,
      fingerprint,
      index: chunk.index,
      startSeconds: chunk.startSeconds,
    };
    const attemptCount = await input.repository.beginChunkAttempt(input.lease, checkpoint);
    if (attemptCount === "lost_lease") throw new LostJobLeaseError(input.lease);
    if (attemptCount > maxAttempts) {
      const error = new ChunkAttemptsExhaustedError(chunk.index, "attempt_limit");
      assertWritten(await input.repository.saveChunkFailure(input.lease, {
        attemptCount,
        errorCode: error.errorCode,
        errorMessage: error.message,
        fingerprint,
        index: chunk.index,
        nextRunAt: null,
        providerRequestId: null,
      }), input.lease);
      throw error;
    }
    const bytes = await read(chunk.filePath);
    const startedAt = Date.now();
    input.onEvent?.({
      event: "call_processing.chunk_started",
      jobId: input.job.id,
      chunkIndex: chunk.index,
      totalChunks: manifests.length,
      attemptCount,
      durationSeconds: chunk.endSeconds - chunk.startSeconds,
      bytes: bytes.length,
      model: input.model,
    });
    let result: Awaited<ReturnType<typeof input.transcribe>>;
    try {
      result = await input.transcribe({
        audioBytes: bytes,
        contentType: "audio/mpeg",
        fileName: chunk.filePath.split("/").at(-1) ?? `chunk-${chunk.index}.mp3`,
        signal: input.signal,
        timeoutMs: input.timeoutMs,
      });
    } catch (error) {
      if (input.signal?.aborted) throw input.signal.reason ?? error;
      const retryable = canRetry(error) && attemptCount < maxAttempts;
      const providerRetry = error instanceof TranscriptionRequestError ? error.details.retryAfterMs ?? 0 : 0;
      const backoff = attemptCount === 1
        ? 10_000 + Math.floor(random() * 10_001)
        : 30_000 + Math.floor(random() * 30_001);
      const nextRunAt = retryable ? new Date(now().getTime() + Math.max(providerRetry, backoff)) : null;
      const providerRequestId = error instanceof TranscriptionRequestError ? error.details.providerRequestId : null;
      assertWritten(await input.repository.saveChunkFailure(input.lease, {
        attemptCount,
        errorCode: safeErrorCode(error),
        errorMessage: error instanceof Error ? error.message : "Transcription failed",
        fingerprint,
        index: chunk.index,
        nextRunAt,
        providerRequestId,
      }), input.lease);
      if (!nextRunAt) {
        input.onEvent?.({ event: "call_processing.chunk_failed", jobId: input.job.id, chunkIndex: chunk.index, attemptCount, errorCode: safeErrorCode(error) });
        throw new ChunkAttemptsExhaustedError(chunk.index, safeErrorCode(error), { cause: error });
      }
      throw new DeferredChunkRetryError(
        chunk.index,
        attemptCount,
        safeErrorCode(error),
        nextRunAt,
        error instanceof Error ? error.message : "Transcription failed",
      );
    }
    const saved = await input.repository.saveCompletedChunk(input.lease, {
      ...checkpoint,
      latencyMs: Date.now() - startedAt,
      providerRequestId: null,
      transcript: result.transcript,
    });
    assertWritten(saved, input.lease);
    completed.set(chunk.index, { ...checkpoint, transcript: result.transcript });
    input.onEvent?.({
      event: "call_processing.chunk_completed",
      jobId: input.job.id,
      chunkIndex: chunk.index,
      totalChunks: manifests.length,
      attemptCount,
      elapsedMs: Date.now() - startedAt,
    });
  };
  const outcomes = await Promise.allSettled(Array.from({ length: workerCount }, async () => {
    while (!stopDispatch) {
      const chunk = pending[nextIndex++];
      if (!chunk) return;
      try {
        await processChunk(chunk);
      } catch (error) {
        stopDispatch = true;
        throw error;
      }
    }
  }));
  const failures = outcomes.flatMap((outcome) => outcome.status === "rejected" ? [outcome.reason as unknown] : []);
  const fatal = failures.find((error) => !(error instanceof DeferredChunkRetryError));
  if (fatal) throw fatal;
  const retries = failures.filter((error): error is DeferredChunkRetryError => error instanceof DeferredChunkRetryError);
  if (retries.length) {
    const nextRunAt = new Date(Math.max(...retries.map((error) => error.nextRunAt.getTime())));
    assertWritten(await input.repository.releaseForRetry(input.lease, {
      lastError: retries[0]!.message,
      nextRunAt,
    }), input.lease);
    for (const retry of retries) {
      input.onEvent?.({ event: "call_processing.chunk_retry_scheduled", jobId: input.job.id, chunkIndex: retry.chunkIndex, attemptCount: retry.attemptCount, errorCode: retry.errorCode, nextRunAt: retry.nextRunAt.toISOString() });
    }
    throw new JobRetryScheduledError(nextRunAt);
  }

  const ordered = [...completed.values()].sort((left, right) => left.index - right.index);
  if (ordered.length !== manifests.length) throw new Error("Transcription checkpoint coverage is incomplete");
  const transcript = mergeTranscriptLines(ordered.map((chunk) => ({
    offsetSeconds: chunk.startSeconds,
    transcript: chunk.transcript,
  })));
  assertWritten(await input.repository.saveTranscriptCheckpoint(input.lease, {
    durationSeconds: input.durationSeconds,
    fingerprint,
    generation: input.job.generation,
    resumeFingerprint: createTranscriptResumeFingerprint({
      generation: input.job.generation,
      model: input.model,
      normalizationVersion: TRANSCRIPTION_NORMALIZATION_VERSION,
      sourceSizeBytes: input.job.sourceSizeBytes,
      sourceStoragePath: input.job.sourceStoragePath,
      transcriptFormatVersion: TRANSCRIPT_FORMAT_VERSION,
    }),
    transcript,
    transcriptHash: sha256(JSON.stringify(transcript)),
  }), input.lease);
  return { durationSeconds: input.durationSeconds, fingerprint, transcript };
}
