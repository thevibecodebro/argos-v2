import { runFfmpeg } from "./ffmpeg";

type NormalizeAudioInput = {
  inputPath: string;
  outputPath: string;
  ffmpegBinary: string;
};

type NormalizeAudioDependencies = {
  spawn?: typeof runFfmpeg;
};

export async function normalizeAudio(
  input: NormalizeAudioInput,
  dependencies: NormalizeAudioDependencies = {},
) {
  const spawn = dependencies.spawn ?? runFfmpeg;

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
      input.outputPath,
    ],
  );

  return {
    outputPath: input.outputPath,
  };
}
