import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

type SpawnLike = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

export const DEFAULT_FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;

type RunFfmpegOptions = {
  signal?: AbortSignal;
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
    const abort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill("SIGKILL");
      reject(options.signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
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

export async function probeAudioDuration(
  ffmpegBinary: string,
  filePath: string,
  options: RunFfmpegOptions = {},
  spawnImpl: SpawnLike = (command, args, spawnOptions) => spawn(command, args, spawnOptions),
) {
  return new Promise<number>((resolve, reject) => {
    const child = spawnImpl(ffmpegBinary, ["-hide_banner", "-i", filePath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    const timeoutMs = options.timeoutMs ?? DEFAULT_FFMPEG_TIMEOUT_MS;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`ffmpeg duration probe timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timeout.unref?.();
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      callback();
    };
    const abort = () => {
      finish(() => {
        child.kill("SIGKILL");
        reject(options.signal?.reason ?? new DOMException("Aborted", "AbortError"));
      });
    };
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", (error) => finish(() => reject(error)));
    child.once("exit", () => {
      finish(() => {
        const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
        if (!match) return reject(new Error("Unable to read normalized audio duration"));
        resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
      });
    });
  });
}
