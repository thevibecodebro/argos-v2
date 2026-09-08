import { join, parse } from "node:path";
import { runFfmpeg } from "./ffmpeg";

type ChunkAudioFileInput = {
  filePath: string;
  sizeBytes: number;
  maxChunkBytes: number;
  durationSeconds: number;
  ffmpegBinary: string;
};

type ChunkAudioFileDependencies = {
  spawn?: typeof runFfmpeg;
};

export const MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS = 5 * 60;

export async function chunkAudioFile(
  input: ChunkAudioFileInput,
  dependencies: ChunkAudioFileDependencies = {},
) {
  if (
    input.sizeBytes <= input.maxChunkBytes &&
    input.durationSeconds <= MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS
  ) {
    return [{ filePath: input.filePath, startSeconds: 0, endSeconds: input.durationSeconds }];
  }

  const spawn = dependencies.spawn ?? runFfmpeg;
  const chunkCount = Math.max(
    Math.ceil(input.sizeBytes / input.maxChunkBytes),
    Math.ceil(input.durationSeconds / MAX_TRANSCRIPTION_CHUNK_DURATION_SECONDS),
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
    await spawn(input.ffmpegBinary, [
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
    ]);
  }

  return chunks;
}
