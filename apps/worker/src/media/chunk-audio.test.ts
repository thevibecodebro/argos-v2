import { describe, expect, it, vi } from "vitest";
import { chunkAudioFile } from "./chunk-audio";

describe("chunkAudioFile", () => {
  it("returns a single chunk when the normalized file is already within the safe limit", async () => {
    const chunks = await chunkAudioFile({
      filePath: "/tmp/call.mp3",
      sizeBytes: 10 * 1024 * 1024,
      maxChunkBytes: 24 * 1024 * 1024,
      durationSeconds: 300,
      ffmpegBinary: "/usr/local/bin/ffmpeg",
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      endSeconds: 300,
      filePath: "/tmp/call.mp3",
      startSeconds: 0,
    });
  });

  it("splits highly compressed long audio even when it is below the byte limit", async () => {
    const spawn = vi.fn().mockResolvedValue(undefined);
    const chunks = await chunkAudioFile({
      filePath: "/tmp/call.mp3",
      sizeBytes: 20 * 1024 * 1024,
      maxChunkBytes: 24 * 1024 * 1024,
      durationSeconds: 5_031,
      ffmpegBinary: "/usr/local/bin/ffmpeg",
    }, { spawn });

    expect(chunks).toHaveLength(17);
    expect(chunks[0]).toEqual({
      filePath: "/tmp/call-part-0.mp3",
      startSeconds: 0,
      endSeconds: 296,
    });
    expect(chunks.at(-1)).toEqual({
      filePath: "/tmp/call-part-16.mp3",
      startSeconds: 4_736,
      endSeconds: 5_031,
    });
    expect(spawn).toHaveBeenCalledTimes(17);
  });

  it("splits oversized audio into deterministic chunk windows and writes chunk files", async () => {
    const spawn = vi.fn().mockResolvedValue(undefined);
    const chunks = await chunkAudioFile({
      filePath: "/tmp/call.mp3",
      sizeBytes: 60 * 1024 * 1024,
      maxChunkBytes: 24 * 1024 * 1024,
      durationSeconds: 900,
      ffmpegBinary: "/usr/local/bin/ffmpeg",
    }, { spawn });

    expect(chunks).toEqual([
      { filePath: "/tmp/call-part-0.mp3", startSeconds: 0, endSeconds: 300 },
      { filePath: "/tmp/call-part-1.mp3", startSeconds: 300, endSeconds: 600 },
      { filePath: "/tmp/call-part-2.mp3", startSeconds: 600, endSeconds: 900 },
    ]);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      "/usr/local/bin/ffmpeg",
      [
        "-y",
        "-i",
        "/tmp/call.mp3",
        "-ss",
        "0",
        "-t",
        "300",
        "-acodec",
        "copy",
        "-fs",
        String(24 * 1024 * 1024),
        "/tmp/call-part-0.mp3",
      ],
    );
  });
});
