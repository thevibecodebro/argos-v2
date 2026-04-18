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

export async function chunkAudioFile(
  input: ChunkAudioFileInput,
  dependencies: ChunkAudioFileDependencies = {},
) {
  if (input.sizeBytes <= input.maxChunkBytes) {
    return [{ filePath: input.filePath, startSeconds: 0, endSeconds: input.durationSeconds }];
  }

  const spawn = dependencies.spawn ?? runFfmpeg;
  const chunkCount = Math.ceil(input.sizeBytes / input.maxChunkBytes);
  const chunkDuration = Math.ceil(input.durationSeconds / chunkCount);
  const chunks = Array.from({ length: chunkCount }, (_, index) => ({
    filePath: `${input.filePath}.part-${index}.mp3`,
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
      chunk.filePath,
    ]);
  }

  return chunks;
}
