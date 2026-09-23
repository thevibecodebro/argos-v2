import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import {
  BUYER_PERSONALITY_SCHEMA_VERSION,
  DEFAULT_CALL_SCORING_RUBRIC,
  extractBuyerPersonalityFromTranscript,
  mergeTranscriptLines,
  scoreTranscriptFromLines,
  transcribeAudioBuffer,
  type ScoringRubric,
  type TranscriptLine,
} from "@argos-v2/call-processing";
import { downloadSourceAsset } from "../calls/storage";
import { getWorkerEnv, type WorkerEnv } from "../env";
import {
  chunkAudioFile,
  MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS,
} from "../media/chunk-audio";
import { normalizeAudio } from "../media/normalize-audio";
import type { CallProcessingRepository } from "../calls/repository";
import {
  createTranscriptResumeFingerprint,
  fingerprintConfiguration,
  type Lease,
} from "../calls/processing-checkpoints";
import { LostJobLeaseError } from "./job-lease";
import {
  ChunkAttemptsExhaustedError,
  JobRetryScheduledError,
  TRANSCRIPTION_NORMALIZATION_VERSION,
  TRANSCRIPT_FORMAT_VERSION,
  transcribeChunksResumable,
} from "./transcribe-chunks";

type ClaimedCallProcessingJob = NonNullable<
  Awaited<ReturnType<CallProcessingRepository["claimNextJob"]>>
>;

type JobStage = "download" | "normalize" | "chunk" | "transcribe" | "profile" | "score" | "persist";

const MAX_NORMALIZED_AUDIO_BYTES = 500 * 1024 * 1024;
const BUYER_PERSONALITY_PROMPT_VERSION = 1;
const CALL_SCORING_PROMPT_VERSION = 1;

type ProcessCallJobInput = {
  job: ClaimedCallProcessingJob;
  repository: Pick<
    CallProcessingRepository,
    | "createNotification"
    | "findRubricById"
    | "findTranscriptCheckpoint"
    | "findReusableTranscriptCheckpoint"
    | "finalizeV2Job"
    | "getCallProcessingCapabilities"
    | "markJobComplete"
    | "markRetryableFailure"
    | "markTerminalFailure"
    | "markV2RetryableFailure"
    | "markV2TerminalFailure"
    | "persistProcessedCall"
    | "beginChunkAttempt"
    | "listCompletedChunks"
    | "releaseForRetry"
    | "saveChunkFailure"
    | "saveCompletedChunk"
    | "saveBuyerPersonalityCheckpoint"
    | "saveEvaluationCheckpoint"
    | "saveTranscriptCheckpoint"
    | "setChunkManifest"
    | "updateBuyerProfileStatus"
    | "updateBuyerProfileStatusForLease"
    | "updateCallStatus"
    | "updateCallStatusForLease"
  >;
  downloadSourceAsset?: typeof downloadSourceAsset;
  normalizeAudio?: typeof normalizeAudio;
  transcribeAudioBuffer?: typeof transcribeAudioBuffer;
  scoreTranscriptFromLines?: typeof scoreTranscriptFromLines;
  extractBuyerPersonalityFromTranscript?: typeof extractBuyerPersonalityFromTranscript;
  chunkAudioFile?: typeof chunkAudioFile;
  env?: WorkerEnv;
  readFile?: typeof readFile;
  mkdtemp?: typeof mkdtemp;
  rm?: typeof rm;
  signal?: AbortSignal;
};

function resolveFfmpegBinary(env: WorkerEnv) {
  return env.ffmpegBinary ?? ffmpegStatic ?? null;
}

function isRetryableError(message: string, attemptCount: number, maxAttempts: number) {
  if (attemptCount >= maxAttempts) {
    return false;
  }

  return /429|5\d\d|timeout|timed out|rate limit|temporar|ECONNRESET|fetch failed/i.test(
    message,
  );
}

async function transcribeNormalizedAudio(input: {
  chunkAudioFileImpl: typeof chunkAudioFile;
  concurrency: number;
  durationSeconds: number;
  ffmpegBinary: string;
  filePath: string;
  onStageChange?: (stage: JobStage) => void;
  readFileImpl: typeof readFile;
  sizeBytes: number;
  transcribeAudioBufferImpl: typeof transcribeAudioBuffer;
}) {
  if (
    input.sizeBytes <= 24 * 1024 * 1024 &&
    input.durationSeconds <= MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS
  ) {
    input.onStageChange?.("transcribe");
    const bytes = await input.readFileImpl(input.filePath);

    return input.transcribeAudioBufferImpl({
      audioBytes: bytes,
      contentType: "audio/mpeg",
      fileName: basename(input.filePath),
    });
  }

  input.onStageChange?.("chunk");
  const chunks = await input.chunkAudioFileImpl({
    filePath: input.filePath,
    sizeBytes: input.sizeBytes,
    maxChunkBytes: 24 * 1024 * 1024,
    durationSeconds: input.durationSeconds,
    ffmpegBinary: input.ffmpegBinary,
  });
  const transcripts = new Array<{
    offsetSeconds: number;
    transcript: TranscriptLine[];
  }>(chunks.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(input.concurrency, chunks.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const chunkIndex = nextIndex++;

        if (chunkIndex >= chunks.length) {
          return;
        }

        const chunk = chunks[chunkIndex]!;
        input.onStageChange?.("transcribe");
        const bytes = await input.readFileImpl(chunk.filePath);
        const transcription = await input.transcribeAudioBufferImpl({
          audioBytes: bytes,
          contentType: "audio/mpeg",
          fileName: basename(chunk.filePath),
        });

        transcripts[chunkIndex] = {
          offsetSeconds: chunk.startSeconds,
          transcript: transcription.transcript,
        };
      }
    }),
  );

  return {
    durationSeconds: input.durationSeconds,
    transcript: mergeTranscriptLines(transcripts),
  };
}

async function classifyAndPersistFailure(input: {
  error: unknown;
  job: ClaimedCallProcessingJob;
  lastStage: JobStage;
  repository: ProcessCallJobInput["repository"];
}) {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const now = new Date();

  if (isRetryableError(message, input.job.attemptCount, input.job.maxAttempts)) {
    await input.repository.markRetryableFailure(input.job.id, {
      now,
      attemptCount: input.job.attemptCount,
      lastError: message,
      lastStage: input.lastStage,
    });
    return "retrying" as const;
  }

  await input.repository.markTerminalFailure(input.job.id, {
    now,
    attemptCount: input.job.attemptCount,
    lastError: message,
    lastStage: input.lastStage,
  });
  await input.repository.updateCallStatus(input.job.callId, "failed");
  return "failed" as const;
}

async function resolveScoringRubric(input: {
  job: ClaimedCallProcessingJob;
  repository: Pick<ProcessCallJobInput["repository"], "findRubricById">;
}): Promise<ScoringRubric> {
  if (!input.job.rubricId) {
    return DEFAULT_CALL_SCORING_RUBRIC;
  }

  const rubric = await input.repository.findRubricById(input.job.rubricId);

  if (!rubric) {
    throw new Error(`Pinned rubric ${input.job.rubricId} was not found for job ${input.job.id}`);
  }

  return rubric;
}

export async function processCallJob(input: ProcessCallJobInput) {
  const v2Lease: Lease | null = input.job.processingVersion === 2 && input.job.leaseToken
    ? { jobId: input.job.id, token: input.job.leaseToken }
    : null;
  const updateCallStatusSafely = async (status: Parameters<CallProcessingRepository["updateCallStatus"]>[1]) => {
    if (!v2Lease) return input.repository.updateCallStatus(input.job.callId, status);
    const outcome = await input.repository.updateCallStatusForLease(v2Lease, input.job.callId, status);
    if (outcome === "lost_lease") throw new LostJobLeaseError(v2Lease);
  };
  const updateBuyerProfileStatusSafely = async (
    status: Parameters<CallProcessingRepository["updateBuyerProfileStatus"]>[1],
  ) => {
    if (!v2Lease) return input.repository.updateBuyerProfileStatus(input.job.callId, status);
    const outcome = await input.repository.updateBuyerProfileStatusForLease(v2Lease, input.job.callId, status);
    if (outcome === "lost_lease") throw new LostJobLeaseError(v2Lease);
  };
  const capabilities = await input.repository.getCallProcessingCapabilities(input.job.callId);
  if (!capabilities.canGenerateBuyerPersonality && !capabilities.canScoreCall) {
    const now = new Date();
    if (input.job.processingVersion === 2 && input.job.leaseToken) {
      const outcome = await input.repository.markV2TerminalFailure(
        { jobId: input.job.id, token: input.job.leaseToken },
        {
          callId: input.job.callId,
          buyerProfileFailed: false,
          lastError: "recording processing capabilities disabled",
          lastStage: "download",
        },
      );
      if (outcome === "lost_lease") {
        throw new LostJobLeaseError({ jobId: input.job.id, token: input.job.leaseToken });
      }
      return;
    }
    await input.repository.markTerminalFailure(input.job.id, {
      now,
      attemptCount: input.job.attemptCount,
      lastError: "recording processing capabilities disabled",
      lastStage: "download",
    });
    await input.repository.updateCallStatus(input.job.callId, "failed");
    return;
  }

  const env = input.env ?? getWorkerEnv();
  const ffmpegBinary = resolveFfmpegBinary(env);

  const downloadSourceAssetImpl = input.downloadSourceAsset ?? downloadSourceAsset;
  const normalizeAudioImpl = input.normalizeAudio ?? normalizeAudio;
  const transcribeAudioBufferImpl = input.transcribeAudioBuffer ?? transcribeAudioBuffer;
  const scoreTranscriptFromLinesImpl =
    input.scoreTranscriptFromLines ?? scoreTranscriptFromLines;
  const extractBuyerPersonalityImpl =
    input.extractBuyerPersonalityFromTranscript ?? extractBuyerPersonalityFromTranscript;
  const chunkAudioFileImpl = input.chunkAudioFile ?? chunkAudioFile;
  const readFileImpl = input.readFile ?? readFile;
  const mkdtempImpl = input.mkdtemp ?? mkdtemp;
  const rmImpl = input.rm ?? rm;
  const transcriptionModel = process.env.OPENAI_CALL_TRANSCRIPTION_MODEL?.trim()
    || "gpt-4o-transcribe-diarize";
  let tempDir: string | null = null;
  let currentStage: JobStage = "download";

  try {
    const scoringRubric = capabilities.canScoreCall
      ? await resolveScoringRubric({ job: input.job, repository: input.repository })
      : null;
    const buyerPersonalityFingerprint = capabilities.canGenerateBuyerPersonality
      ? fingerprintConfiguration({
          callTopic: input.job.callTopic,
          model: process.env.OPENAI_BUYER_PERSONALITY_MODEL?.trim()
            || process.env.OPENAI_TRAINING_MODEL?.trim()
            || "gpt-5-mini",
          promptVersion: BUYER_PERSONALITY_PROMPT_VERSION,
          schemaVersion: BUYER_PERSONALITY_SCHEMA_VERSION,
        })
      : null;
    const evaluationFingerprint = scoringRubric
      ? fingerprintConfiguration({
          callTopic: input.job.callTopic,
          model: process.env.OPENAI_CALL_SCORING_MODEL?.trim() || "gpt-5-mini",
          promptVersion: CALL_SCORING_PROMPT_VERSION,
          rubric: scoringRubric,
        })
      : null;
    const transcriptResumeFingerprint = input.job.processingVersion === 2
      ? createTranscriptResumeFingerprint({
          generation: input.job.generation,
          model: transcriptionModel,
          normalizationVersion: TRANSCRIPTION_NORMALIZATION_VERSION,
          sourceSizeBytes: input.job.sourceSizeBytes,
          sourceStoragePath: input.job.sourceStoragePath,
          transcriptFormatVersion: TRANSCRIPT_FORMAT_VERSION,
        })
      : null;
    await updateCallStatusSafely("transcribing");

    let resumedCheckpoint = input.job.processingVersion === 2 && transcriptResumeFingerprint
      ? await input.repository.findReusableTranscriptCheckpoint(
          input.job.id,
          input.job.generation,
          transcriptResumeFingerprint,
          { buyerPersonalityFingerprint, evaluationFingerprint },
        )
      : null;
    let transcription: { durationSeconds: number; fingerprint?: string; transcript: TranscriptLine[] };
    if (resumedCheckpoint) {
      transcription = resumedCheckpoint;
    } else {
      if (!ffmpegBinary) {
        throw new Error("FFmpeg binary is not configured. Set FFMPEG_BINARY or install ffmpeg-static.");
      }
      tempDir = await mkdtempImpl(join(tmpdir(), `call-job-${input.job.callId}-`));
      const sourceName =
        ("sourceFileName" in input.job &&
        typeof input.job.sourceFileName === "string" &&
        input.job.sourceFileName.trim().length > 0
          ? input.job.sourceFileName
          : basename(input.job.sourceStoragePath)) || "source.bin";
      const sourceExtension = extname(sourceName) || ".bin";
      const sourcePath = join(tempDir, `source${sourceExtension}`);
      const normalizedPath = join(tempDir, "normalized.mp3");
      currentStage = "download";
      const downloadedSourcePath = await downloadSourceAssetImpl({
        expectedSizeBytes: input.job.sourceSizeBytes,
        storagePath: input.job.sourceStoragePath,
        targetPath: sourcePath,
        signal: input.signal,
      });

      currentStage = "normalize";
      const normalized = await normalizeAudioImpl({
        inputPath: downloadedSourcePath,
        outputPath: normalizedPath,
        ffmpegBinary,
        maxOutputBytes: Math.min(env.maxSourceBytes, MAX_NORMALIZED_AUDIO_BYTES),
        signal: input.signal,
      });

      if (input.job.processingVersion === 2) {
        if (!input.job.leaseToken) throw new Error("Version 2 job is missing its processing lease token");
        currentStage = "chunk";
        const chunks = await chunkAudioFileImpl({
          filePath: normalized.outputPath,
          sizeBytes: normalized.sizeBytes,
          maxChunkBytes: 24 * 1024 * 1024,
          durationSeconds: normalized.durationSeconds,
          ffmpegBinary,
          signal: input.signal,
        });
        currentStage = "transcribe";
        transcription = await transcribeChunksResumable({
          chunks,
          durationSeconds: normalized.durationSeconds,
          job: {
            generation: input.job.generation,
            id: input.job.id,
            sourceSizeBytes: input.job.sourceSizeBytes,
            sourceStoragePath: input.job.sourceStoragePath,
          },
          lease: { jobId: input.job.id, token: input.job.leaseToken },
          model: transcriptionModel,
          onEvent: (event) => console.info(JSON.stringify(event)),
          readFile: readFileImpl,
          repository: input.repository,
          signal: input.signal,
          timeoutMs: env.transcriptionTimeoutMs,
          transcribe: transcribeAudioBufferImpl,
        });
      } else {
        transcription = await transcribeNormalizedAudio({
          chunkAudioFileImpl,
          concurrency: env.transcribeConcurrency,
          durationSeconds: normalized.durationSeconds,
          ffmpegBinary,
          filePath: normalized.outputPath,
          onStageChange: (stage) => {
            currentStage = stage;
          },
          readFileImpl,
          sizeBytes: normalized.sizeBytes,
          transcribeAudioBufferImpl,
        });
      }
    }
    resumedCheckpoint ??= input.job.processingVersion === 2 && transcription.fingerprint
      ? await input.repository.findTranscriptCheckpoint(
          input.job.id,
          input.job.generation,
          transcription.fingerprint,
          { buyerPersonalityFingerprint, evaluationFingerprint },
        )
      : null;

    let buyerPersonality: {
      generatedAt: Date;
      model: string;
      profile: Awaited<ReturnType<typeof extractBuyerPersonalityFromTranscript>>["profile"];
      status: "ready" | "needs_review";
    } | null = resumedCheckpoint?.buyerPersonality ?? null;
    if (capabilities.canGenerateBuyerPersonality && !buyerPersonality) {
      currentStage = "profile";
      await updateBuyerProfileStatusSafely("processing");
      try {
        const extracted = await extractBuyerPersonalityImpl({
          callTopic: input.job.callTopic,
          durationSeconds: transcription.durationSeconds,
          transcript: transcription.transcript,
          signal: input.signal,
        });
        buyerPersonality = {
          generatedAt: new Date(),
          model: extracted.model,
          profile: extracted.profile,
          status: extracted.profile.confidence === "low" ? "needs_review" : "ready",
        };
        if (input.job.processingVersion === 2 && input.job.leaseToken && transcription.fingerprint) {
          const outcome = await input.repository.saveBuyerPersonalityCheckpoint(
            { jobId: input.job.id, token: input.job.leaseToken },
            {
              buyerPersonality,
              buyerPersonalityFingerprint: buyerPersonalityFingerprint!,
              fingerprint: transcription.fingerprint,
            },
          );
          if (outcome === "lost_lease") {
            throw new LostJobLeaseError({ jobId: input.job.id, token: input.job.leaseToken });
          }
        }
      } catch (error) {
        await updateBuyerProfileStatusSafely("failed");
        if (!capabilities.canScoreCall) throw error;
        console.error("Buyer personality extraction failed; continuing call scoring", error);
      }
    }

    let evaluation = resumedCheckpoint?.evaluation ?? null;
    if (capabilities.canScoreCall && !evaluation) {
      currentStage = "score";
      await updateCallStatusSafely("evaluating");
      evaluation = await scoreTranscriptFromLinesImpl({
        callTopic: input.job.callTopic,
        durationSeconds: transcription.durationSeconds,
        rubric: scoringRubric!,
        transcript: transcription.transcript,
        signal: input.signal,
      });
      if (input.job.processingVersion === 2 && input.job.leaseToken && transcription.fingerprint) {
        const outcome = await input.repository.saveEvaluationCheckpoint(
          { jobId: input.job.id, token: input.job.leaseToken },
          {
            evaluation,
            evaluationFingerprint: evaluationFingerprint!,
            fingerprint: transcription.fingerprint,
          },
        );
        if (outcome === "lost_lease") {
          throw new LostJobLeaseError({ jobId: input.job.id, token: input.job.leaseToken });
        }
      }
    }

    currentStage = "persist";
    const currentCapabilities = await input.repository.getCallProcessingCapabilities(input.job.callId);
    if (
      (capabilities.canGenerateBuyerPersonality && !currentCapabilities.canGenerateBuyerPersonality) ||
      (capabilities.canScoreCall && !currentCapabilities.canScoreCall)
    ) {
      throw new Error("recording processing capability disabled during processing");
    }
    const notification = {
      userId: input.job.repId,
      type: evaluation ? "call_scored" as const : "recording_ready" as const,
      title: evaluation ? "Call scored" : "Recording ready",
      body: evaluation
        ? `${input.job.callTopic ?? "Call"} finished scoring with an ${evaluation.overallScore} overall score.`
        : `${input.job.callTopic ?? "Recording"} is transcribed and ready for buyer-personality roleplay.`,
      link: `/calls/${input.job.callId}`,
    };
    if (input.job.processingVersion === 2) {
      if (!input.job.leaseToken) throw new Error("Version 2 job is missing its processing lease token");
      const outcome = await input.repository.finalizeV2Job({
        buyerPersonality,
        callId: input.job.callId,
        durationSeconds: transcription.durationSeconds,
        evaluation,
        generation: input.job.generation,
        lease: { jobId: input.job.id, token: input.job.leaseToken },
        notification,
        transcript: transcription.transcript,
      });
      if (outcome === "lost_lease") {
        throw new LostJobLeaseError({ jobId: input.job.id, token: input.job.leaseToken });
      }
    } else {
      await input.repository.persistProcessedCall({
        callId: input.job.callId,
        durationSeconds: transcription.durationSeconds,
        transcript: transcription.transcript,
        buyerPersonality,
        evaluation,
      });
      await input.repository.markJobComplete(input.job.id);
      await input.repository.createNotification(notification).catch((error) => {
        console.error("Failed to create recording notification", error);
      });
    }
  } catch (error) {
    if (error instanceof JobRetryScheduledError) return;
    if (error instanceof LostJobLeaseError) throw error;
    if (input.job.processingVersion === 2 && input.job.leaseToken) {
      const lease: Lease = { jobId: input.job.id, token: input.job.leaseToken };
      const message = error instanceof Error ? error.message : String(error);
      const stageFailureCount = input.job.lastStage === currentStage
        ? input.job.failureCount
        : 0;
      const retryable = !(error instanceof ChunkAttemptsExhaustedError)
        && isRetryableError(message, stageFailureCount + 1, input.job.maxFailures);
      const outcome = retryable
        ? await input.repository.markV2RetryableFailure(lease, {
            lastError: message,
            lastStage: currentStage,
            nextRunAt: new Date(Date.now() + 2 * 60 * 1000),
          })
        : await input.repository.markV2TerminalFailure(lease, {
            buyerProfileFailed: capabilities.canGenerateBuyerPersonality,
            callId: input.job.callId,
            lastError: message,
            lastStage: currentStage,
          });
      if (outcome === "lost_lease") throw new LostJobLeaseError(lease);
      throw error;
    }
    const failureStatus = await classifyAndPersistFailure({
      error,
      job: input.job,
      lastStage: currentStage,
      repository: input.repository,
    });
    if (failureStatus === "failed" && capabilities.canGenerateBuyerPersonality) {
      await input.repository.updateBuyerProfileStatus(input.job.callId, "failed").catch(() => undefined);
    }
    throw error;
  } finally {
    if (tempDir) {
      await rmImpl(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
