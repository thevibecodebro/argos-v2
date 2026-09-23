import type { PreparedRecording } from "./prepare-recording-audio";

export async function prepareRecordingAudio(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<PreparedRecording> {
  if (typeof Worker === "undefined") {
    const { remuxSingleAacTrack } = await import("./prepare-recording-audio");
    return remuxSingleAacTrack(file, onProgress);
  }

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./audio-preparation.worker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve({ kind: "fallback", file, reason: "Audio preparation is unavailable in this browser." });
      return;
    }

    let settled = false;
    let idleTimer: ReturnType<typeof setTimeout>;
    const finish = (result: PreparedRecording) => {
      if (settled) return;
      settled = true;
      clearTimeout(idleTimer);
      worker.terminate();
      resolve(result);
    };
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => finish({
        kind: "fallback", file, reason: "Audio preparation stopped responding in this browser.",
      }), 5 * 60 * 1000);
    };
    resetIdleTimer();
    worker.onmessage = (event: MessageEvent<
      | { kind: "progress"; progress: number }
      | { kind: "result"; result: PreparedRecording }
      | { kind: "error" }
    >) => {
      const message = event.data;
      if (message.kind === "progress") {
        resetIdleTimer();
        onProgress(message.progress);
      } else if (message.kind === "result") {
        const result = message.result;
        if (result.kind === "audio" && !(result.file instanceof File)) {
          finish({
            ...result,
            file: new File([result.file], file.name.replace(/\.mp4$/i, ".m4a"), { type: "audio/mp4" }),
          });
        } else {
          finish(result);
        }
      } else {
        finish({ kind: "fallback", file, reason: "Audio preparation failed in this browser." });
      }
    };
    worker.onerror = () => finish({ kind: "fallback", file, reason: "Audio preparation failed in this browser." });
    worker.onmessageerror = () => finish({ kind: "fallback", file, reason: "Audio preparation failed in this browser." });
    try {
      worker.postMessage(file);
    } catch {
      finish({ kind: "fallback", file, reason: "Audio preparation is unavailable in this browser." });
    }
  });
}
