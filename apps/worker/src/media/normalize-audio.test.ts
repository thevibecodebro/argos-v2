import { describe, expect, it, vi } from "vitest";
import { normalizeAudio } from "./normalize-audio";

describe("normalizeAudio", () => {
  it("invokes ffmpeg with mono 16k 32k mp3 output and returns derived metadata", async () => {
    const spawn = vi.fn().mockResolvedValue(undefined);
    const stat = vi.fn().mockResolvedValue({ size: 7_200_000 });

    const probeDuration = vi.fn().mockResolvedValue(1800.25);
    const normalized = await normalizeAudio(
      {
        inputPath: "/tmp/source.mp4",
        outputPath: "/tmp/normalized.mp3",
        ffmpegBinary: "/usr/local/bin/ffmpeg",
        maxOutputBytes: 64 * 1024 * 1024,
      },
      { probeDuration, spawn, stat },
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
        "-fs",
        String(64 * 1024 * 1024),
        "/tmp/normalized.mp3",
      ]),
    );
    expect(stat).toHaveBeenCalledWith("/tmp/normalized.mp3");
    expect(probeDuration).toHaveBeenCalledWith(
      "/usr/local/bin/ffmpeg",
      "/tmp/normalized.mp3",
      { signal: undefined },
    );
    expect(normalized).toEqual({
      outputPath: "/tmp/normalized.mp3",
      sizeBytes: 7_200_000,
      durationSeconds: 1800.25,
    });
  });

  it("rejects normalized audio that exceeds the configured output cap", async () => {
    const spawn = vi.fn().mockResolvedValue(undefined);
    const stat = vi.fn().mockResolvedValue({ size: 65 * 1024 * 1024 });

    await expect(
      normalizeAudio(
        {
          inputPath: "/tmp/source.mp4",
          outputPath: "/tmp/normalized.mp3",
          ffmpegBinary: "/usr/local/bin/ffmpeg",
          maxOutputBytes: 64 * 1024 * 1024,
        },
        { probeDuration: vi.fn(), spawn, stat },
      ),
    ).rejects.toThrow("exceeds the configured output limit");
  });

  it("rejects output that reaches the ffmpeg write-time cap", async () => {
    const maxOutputBytes = 64 * 1024 * 1024;
    const spawn = vi.fn().mockResolvedValue(undefined);

    await expect(
      normalizeAudio(
        {
          inputPath: "/tmp/source.mp4",
          outputPath: "/tmp/normalized.mp3",
          ffmpegBinary: "/usr/local/bin/ffmpeg",
          maxOutputBytes,
        },
        {
          probeDuration: vi.fn(),
          spawn,
          stat: vi.fn().mockResolvedValue({ size: maxOutputBytes }),
        },
      ),
    ).rejects.toThrow("exceeds the configured output limit");

    expect(spawn).toHaveBeenCalledWith(
      "/usr/local/bin/ffmpeg",
      expect.arrayContaining(["-fs", String(maxOutputBytes)]),
    );
  });
});
