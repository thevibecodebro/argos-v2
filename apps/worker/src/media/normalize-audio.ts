import { stat } from "node:fs/promises";
import { runFfmpeg } from "./ffmpeg";

type NormalizeAudioInput = {
  inputPath: string;
  outputPath: string;
  ffmpegBinary: string;
  maxOutputBytes?: number;
};

type NormalizeAudioDependencies = {
  spawn?: typeof runFfmpeg;
  stat?: typeof stat;
};

export async function normalizeAudio(
  input: NormalizeAudioInput,
  dependencies: NormalizeAudioDependencies = {},
) {
  const spawn = dependencies.spawn ?? runFfmpeg;
  const readStat = dependencies.stat ?? stat;
  const maxOutputBytes = input.maxOutputBytes ?? 500 * 1024 * 1024;

  await spawn(
    input.ffmpegBinary,
    [
      "-y",
      "-i",
      input.inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "32k",
      "-fs",
      String(maxOutputBytes),
      input.outputPath,
    ],
  );

  const outputStats = await readStat(input.outputPath);

  if (outputStats.size > maxOutputBytes) {
    throw new Error(
      `Normalized audio output exceeds the configured output limit of ${maxOutputBytes} bytes.`,
    );
  }

  return {
    outputPath: input.outputPath,
    sizeBytes: outputStats.size,
    durationSeconds: Math.max(1, Math.round((outputStats.size * 8) / 32_000)),
  };
}
