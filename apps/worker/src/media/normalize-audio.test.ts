import { describe, expect, it, vi } from "vitest";
import { normalizeAudio } from "./normalize-audio";

describe("normalizeAudio", () => {
  it("invokes ffmpeg with mono 16k 32k mp3 output", async () => {
    const spawn = vi.fn().mockResolvedValue(undefined);

    await normalizeAudio(
      {
        inputPath: "/tmp/source.mp4",
        outputPath: "/tmp/normalized.mp3",
        ffmpegBinary: "/usr/local/bin/ffmpeg",
      },
      { spawn },
    );

    expect(spawn).toHaveBeenCalledWith(
      "/usr/local/bin/ffmpeg",
      expect.arrayContaining([
        "-ac",
        "1",
        "-ar",
        "16000",
        "-b:a",
        "32k",
        "/tmp/normalized.mp3",
      ]),
    );
  });
});
