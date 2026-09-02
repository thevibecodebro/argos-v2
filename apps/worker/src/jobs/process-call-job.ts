import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import {
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
import { chunkAudioFile } from "../media/chunk-audio";
import { normalizeAudio } from "../media/normalize-audio";
import type { CallProcessingRepository } from "../calls/repository";

type ClaimedCallProcessingJob = NonNullable<
  Awaited<ReturnType<CallProcessingRepository["claimNextJob"]>>
>;

type JobStage = "download" | "normalize" | "chunk" | "transcribe" | "profile" | "score" | "persist";

const MAX_NORMALIZED_AUDIO_BYTES = 500 * 1024 * 1024;

type ProcessCallJobInput = {
  job: ClaimedCallProcessingJob;
  repository: Pick<
    CallProcessingRepository,
    | "createNotification"
    | "findRubricById"
    | "getCallProcessingCapabilities"
    | "markJobComplete"
    | "markRetryableFailure"
    | "markTerminalFailure"
    | "persistProcessedCall"
    | "updateBuyerProfileStatus"
    | "updateCallStatus"
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
  if (input.sizeBytes <= 24 * 1024 * 1024) {
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
  const capabilities = await input.repository.getCallProcessingCapabilities(input.job.callId);
  if (!capabilities.canGenerateBuyerPersonality && !capabilities.canScoreCall) {
    const now = new Date();
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

  if (!ffmpegBinary) {
    throw new Error("FFmpeg binary is not configured. Set FFMPEG_BINARY or install ffmpeg-static.");
  }

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
  const tempDir = await mkdtempImpl(join(tmpdir(), `call-job-${input.job.callId}-`));
  const sourceName =
    ("sourceFileName" in input.job &&
    typeof input.job.sourceFileName === "string" &&
    input.job.sourceFileName.trim().length > 0
      ? input.job.sourceFileName
      : basename(input.job.sourceStoragePath)) || "source.bin";
  const sourceExtension = extname(sourceName) || ".bin";
  const sourcePath = join(tempDir, `source${sourceExtension}`);
  const normalizedPath = join(tempDir, "normalized.mp3");
  let currentStage: JobStage = "download";

  try {
    await input.repository.updateCallStatus(input.job.callId, "transcribing");

    currentStage = "download";
    const downloadedSourcePath = await downloadSourceAssetImpl({
      expectedSizeBytes: input.job.sourceSizeBytes,
      storagePath: input.job.sourceStoragePath,
      targetPath: sourcePath,
    });

    currentStage = "normalize";
    const normalized = await normalizeAudioImpl({
      inputPath: downloadedSourcePath,
      outputPath: normalizedPath,
      ffmpegBinary,
      maxOutputBytes: Math.min(env.maxSourceBytes, MAX_NORMALIZED_AUDIO_BYTES),
    });

    const transcription = await transcribeNormalizedAudio({
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

    let buyerPersonality: {
      generatedAt: Date;
      model: string;
      profile: Awaited<ReturnType<typeof extractBuyerPersonalityFromTranscript>>["profile"];
      status: "ready" | "needs_review";
    } | null = null;
    if (capabilities.canGenerateBuyerPersonality) {
      currentStage = "profile";
      await input.repository.updateBuyerProfileStatus(input.job.callId, "processing");
      try {
        const extracted = await extractBuyerPersonalityImpl({
          callTopic: input.job.callTopic,
          durationSeconds: transcription.durationSeconds,
          transcript: transcription.transcript,
        });
        buyerPersonality = {
          generatedAt: new Date(),
          model: extracted.model,
          profile: extracted.profile,
          status: extracted.profile.confidence === "low" ? "needs_review" : "ready",
        };
      } catch (error) {
        await input.repository.updateBuyerProfileStatus(input.job.callId, "failed");
        if (!capabilities.canScoreCall) throw error;
        console.error("Buyer personality extraction failed; continuing call scoring", error);
      }
    }

    let evaluation = null;
    if (capabilities.canScoreCall) {
      currentStage = "score";
      await input.repository.updateCallStatus(input.job.callId, "evaluating");
      const rubric = await resolveScoringRubric({
        job: input.job,
        repository: input.repository,
      });
      evaluation = await scoreTranscriptFromLinesImpl({
        callTopic: input.job.callTopic,
        durationSeconds: transcription.durationSeconds,
        rubric,
        transcript: transcription.transcript,
      });
    }

    currentStage = "persist";
    const currentCapabilities = await input.repository.getCallProcessingCapabilities(input.job.callId);
    if (
      (capabilities.canGenerateBuyerPersonality && !currentCapabilities.canGenerateBuyerPersonality) ||
      (capabilities.canScoreCall && !currentCapabilities.canScoreCall)
    ) {
      throw new Error("recording processing capability disabled during processing");
    }
    await input.repository.persistProcessedCall({
      callId: input.job.callId,
      durationSeconds: transcription.durationSeconds,
      transcript: transcription.transcript,
      buyerPersonality,
      evaluation,
    });
    await input.repository.markJobComplete(input.job.id);

    await input.repository
      .createNotification({
        userId: input.job.repId,
        type: evaluation ? "call_scored" : "recording_ready",
        title: evaluation ? "Call scored" : "Recording ready",
        body: evaluation
          ? `${input.job.callTopic ?? "Call"} finished scoring with an ${evaluation.overallScore} overall score.`
          : `${input.job.callTopic ?? "Recording"} is transcribed and ready for buyer-personality roleplay.`,
        link: `/calls/${input.job.callId}`,
      })
      .catch((error) => {
        console.error("Failed to create recording notification", error);
      });
  } catch (error) {
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
    await rmImpl(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
