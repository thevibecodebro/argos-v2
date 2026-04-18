import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import {
  mergeTranscriptLines,
  scoreTranscriptFromLines,
  transcribeAudioBuffer,
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

type JobStage = "download" | "normalize" | "chunk" | "transcribe" | "score" | "persist";

type ProcessCallJobInput = {
  job: ClaimedCallProcessingJob;
  repository: Pick<
    CallProcessingRepository,
    | "createNotification"
    | "markJobComplete"
    | "markRetryableFailure"
    | "markTerminalFailure"
    | "setCallEvaluation"
    | "updateCallStatus"
  >;
  downloadSourceAsset?: typeof downloadSourceAsset;
  normalizeAudio?: typeof normalizeAudio;
  transcribeAudioBuffer?: typeof transcribeAudioBuffer;
  scoreTranscriptFromLines?: typeof scoreTranscriptFromLines;
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
    return;
  }

  await input.repository.markTerminalFailure(input.job.id, {
    now,
    attemptCount: input.job.attemptCount,
    lastError: message,
    lastStage: input.lastStage,
  });
  await input.repository.updateCallStatus(input.job.callId, "failed");
}

export async function processCallJob(input: ProcessCallJobInput) {
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
      storagePath: input.job.sourceStoragePath,
      targetPath: sourcePath,
    });

    currentStage = "normalize";
    const normalized = await normalizeAudioImpl({
      inputPath: downloadedSourcePath,
      outputPath: normalizedPath,
      ffmpegBinary,
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

    currentStage = "score";
    await input.repository.updateCallStatus(input.job.callId, "evaluating");
    const evaluation = await scoreTranscriptFromLinesImpl({
      callTopic: input.job.callTopic,
      durationSeconds: transcription.durationSeconds,
      transcript: transcription.transcript,
    });

    currentStage = "persist";
    await input.repository.setCallEvaluation(input.job.callId, evaluation);
    await input.repository.markJobComplete(input.job.id);

    await input.repository
      .createNotification({
        userId: input.job.repId,
        type: "call_scored",
        title: "Call scored",
        body: `${input.job.callTopic ?? "Call"} finished scoring with an ${evaluation.overallScore} overall score.`,
        link: `/calls/${input.job.callId}`,
      })
      .catch((error) => {
        console.error("Failed to create call scored notification", error);
      });
  } catch (error) {
    await classifyAndPersistFailure({
      error,
      job: input.job,
      lastStage: currentStage,
      repository: input.repository,
    });
    throw error;
  } finally {
    await rmImpl(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
