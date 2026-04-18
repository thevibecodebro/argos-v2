import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

type SpawnLike = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

export async function runFfmpeg(
  ffmpegBinary: string,
  args: string[],
  spawnImpl?: SpawnLike,
) {
  const invokeSpawn: SpawnLike = spawnImpl ?? ((command, spawnArgs, options) => spawn(command, spawnArgs, options));

  await new Promise<void>((resolve, reject) => {
    const child = invokeSpawn(ffmpegBinary, args, { stdio: "ignore" });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}
