import { remuxSingleAacTrack } from "./prepare-recording-audio";

self.addEventListener("message", async (event: MessageEvent<File>) => {
  try {
    const result = await remuxSingleAacTrack(event.data, (progress) => {
      self.postMessage({ kind: "progress", progress });
    });
    self.postMessage({ kind: "result", result });
  } catch {
    self.postMessage({ kind: "error" });
  }
});
