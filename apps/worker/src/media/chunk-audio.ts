type ChunkAudioFileInput = {
  filePath: string;
  sizeBytes: number;
  maxChunkBytes: number;
  durationSeconds: number;
};

export async function chunkAudioFile(input: ChunkAudioFileInput) {
  if (input.sizeBytes <= input.maxChunkBytes) {
    return [{ filePath: input.filePath, startSeconds: 0, endSeconds: input.durationSeconds }];
  }

  const chunkCount = Math.ceil(input.sizeBytes / input.maxChunkBytes);
  const chunkDuration = Math.ceil(input.durationSeconds / chunkCount);

  return Array.from({ length: chunkCount }, (_, index) => ({
    filePath: `${input.filePath}.part-${index}.mp3`,
    startSeconds: index * chunkDuration,
    endSeconds: Math.min(input.durationSeconds, (index + 1) * chunkDuration),
  }));
}
