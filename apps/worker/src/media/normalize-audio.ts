import { stat } from "node:fs/promises";
import { probeAudioDuration, runFfmpeg } from "./ffmpeg";

type NormalizeAudioInput = {
  inputPath: string;
  outputPath: string;
  ffmpegBinary: string;
  maxOutputBytes?: number;
  signal?: AbortSignal;
};

type NormalizeAudioDependencies = {
  spawn?: typeof runFfmpeg;
  stat?: typeof stat;
  probeDuration?: typeof probeAudioDuration;
};

export async function normalizeAudio(
  input: NormalizeAudioInput,
  dependencies: NormalizeAudioDependencies = {},
) {
  const spawn = dependencies.spawn ?? runFfmpeg;
  const readStat = dependencies.stat ?? stat;
  const maxOutputBytes = input.maxOutputBytes ?? 500 * 1024 * 1024;
  const readDuration = dependencies.probeDuration ?? probeAudioDuration;

  const ffmpegArgs = [
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
      input.outputPath,
    ];
  if (input.signal) await spawn(input.ffmpegBinary, ffmpegArgs, { signal: input.signal });
  else await spawn(input.ffmpegBinary, ffmpegArgs);

  const outputStats = await readStat(input.outputPath);

  if (outputStats.size > maxOutputBytes) {
    throw new Error(
      `Normalized audio output exceeds the configured output limit of ${maxOutputBytes} bytes.`,
    );
  }
  const durationSeconds = await readDuration(input.ffmpegBinary, input.outputPath, {
    signal: input.signal,
  });

  return {
    outputPath: input.outputPath,
    sizeBytes: outputStats.size,
    durationSeconds: Math.max(1, durationSeconds),
  };
}
