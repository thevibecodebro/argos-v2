import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

type SpawnLike = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

export const DEFAULT_FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;

type RunFfmpegOptions = {
  timeoutMs?: number;
};

export async function runFfmpeg(
  ffmpegBinary: string,
  args: string[],
  optionsOrSpawn?: RunFfmpegOptions | SpawnLike,
  spawnImpl?: SpawnLike,
) {
  const options = typeof optionsOrSpawn === "function" ? {} : optionsOrSpawn ?? {};
  const invokeSpawn: SpawnLike =
    typeof optionsOrSpawn === "function"
      ? optionsOrSpawn
      : spawnImpl ?? ((command, spawnArgs, spawnOptions) => spawn(command, spawnArgs, spawnOptions));
  const timeoutMs = options.timeoutMs ?? DEFAULT_FFMPEG_TIMEOUT_MS;

  await new Promise<void>((resolve, reject) => {
    const child = invokeSpawn(ffmpegBinary, args, { stdio: "ignore" });
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    timeout.unref?.();

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      callback();
    };

    child.once("error", (error) => {
      finish(() => reject(error));
    });
    child.once("exit", (code) => {
      finish(() => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });
  });
}
