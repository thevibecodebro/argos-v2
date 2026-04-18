import { describe, expect, it } from "vitest";
import { chunkAudioFile } from "./chunk-audio";

describe("chunkAudioFile", () => {
  it("returns a single chunk when the normalized file is already within the safe limit", async () => {
    const chunks = await chunkAudioFile({
      filePath: "/tmp/call.mp3",
      sizeBytes: 10 * 1024 * 1024,
      maxChunkBytes: 24 * 1024 * 1024,
      durationSeconds: 600,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      endSeconds: 600,
      filePath: "/tmp/call.mp3",
      startSeconds: 0,
    });
  });

  it("splits oversized audio into deterministic chunk windows", async () => {
    const chunks = await chunkAudioFile({
      filePath: "/tmp/call.mp3",
      sizeBytes: 60 * 1024 * 1024,
      maxChunkBytes: 24 * 1024 * 1024,
      durationSeconds: 900,
    });

    expect(chunks).toEqual([
      { filePath: "/tmp/call.mp3.part-0.mp3", startSeconds: 0, endSeconds: 300 },
      { filePath: "/tmp/call.mp3.part-1.mp3", startSeconds: 300, endSeconds: 600 },
      { filePath: "/tmp/call.mp3.part-2.mp3", startSeconds: 600, endSeconds: 900 },
    ]);
  });
});
