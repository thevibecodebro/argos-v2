import { join, parse } from "node:path";
import { runFfmpeg } from "./ffmpeg";

type ChunkAudioFileInput = {
  filePath: string;
  sizeBytes: number;
  maxChunkBytes: number;
  maxChunkDurationSeconds?: number;
  durationSeconds: number;
  ffmpegBinary: string;
  signal?: AbortSignal;
};

type ChunkAudioFileDependencies = {
  spawn?: typeof runFfmpeg;
};

export const MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS = 5 * 60;

export async function chunkAudioFile(
  input: ChunkAudioFileInput,
  dependencies: ChunkAudioFileDependencies = {},
) {
  const maxChunkDurationSeconds = input.maxChunkDurationSeconds ?? MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS;
  if (
    input.sizeBytes <= input.maxChunkBytes &&
    input.durationSeconds <= maxChunkDurationSeconds
  ) {
    return [{ filePath: input.filePath, startSeconds: 0, endSeconds: input.durationSeconds }];
  }

  const spawn = dependencies.spawn ?? runFfmpeg;
  const chunkCount = Math.max(
    Math.ceil(input.sizeBytes / input.maxChunkBytes),
    Math.ceil(input.durationSeconds / maxChunkDurationSeconds),
  );
  const chunkDuration = Math.ceil(input.durationSeconds / chunkCount);
  const parsedPath = parse(input.filePath);
  const chunks = Array.from({ length: chunkCount }, (_, index) => ({
    filePath: join(
      parsedPath.dir,
      `${parsedPath.name}-part-${index}${parsedPath.ext || ".mp3"}`,
    ),
    startSeconds: index * chunkDuration,
    endSeconds: Math.min(input.durationSeconds, (index + 1) * chunkDuration),
  }));

  for (const chunk of chunks) {
    const args = [
      "-y",
      "-i",
      input.filePath,
      "-ss",
      String(chunk.startSeconds),
      "-t",
      String(chunk.endSeconds - chunk.startSeconds),
      "-acodec",
      "copy",
      "-fs",
      String(input.maxChunkBytes),
      chunk.filePath,
    ];
    if (input.signal) await spawn(input.ffmpegBinary, args, { signal: input.signal });
    else await spawn(input.ffmpegBinary, args);
  }

  return chunks;
}
