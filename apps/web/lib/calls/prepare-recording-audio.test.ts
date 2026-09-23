import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import { remuxSingleAacTrack } from "./prepare-recording-audio";

const fixturePath = fileURLToPath(new URL("./fixtures/two-second-aac.mp4", import.meta.url));
const multiTrackPath = fileURLToPath(new URL("./fixtures/two-audio-tracks.mp4", import.meta.url));
const videoTailPath = fileURLToPath(new URL("./fixtures/video-longer-than-audio.mp4", import.meta.url));

describe("remuxSingleAacTrack", () => {
  it("copies the complete audio track into an audio-only file", async () => {
    const source = new File([await readFile(fixturePath)], "meeting.mp4", { type: "video/mp4" });
    const result = await remuxSingleAacTrack(source);

    expect(result.kind).toBe("audio");
    if (result.kind !== "audio") return;
    expect(result.file.name).toBe("meeting.m4a");
    expect(result.file.type).toBe("audio/mp4");
    expect(result.file.size).toBeLessThan(source.size);

    const output = new Input({ source: new BlobSource(result.file), formats: ALL_FORMATS });
    expect((await output.getTracks()).map((track) => track.type)).toEqual(["audio"]);
    expect(await output.computeDuration()).toBeCloseTo(2, 1);
  });

  it("leaves existing audio files alone", async () => {
    const source = new File(["audio"], "meeting.m4a", { type: "audio/mp4" });
    const result = await remuxSingleAacTrack(source);
    expect(result).toMatchObject({ kind: "unchanged", file: source });
  });

  it("keeps the audio when the video continues after the audio track", async () => {
    const source = new File([await readFile(videoTailPath)], "meeting.mp4", { type: "video/mp4" });
    const result = await remuxSingleAacTrack(source);

    expect(result.kind).toBe("audio");
    if (result.kind !== "audio") return;
    expect(result.durationSeconds).toBeCloseTo(2, 1);
  });

  it("keeps the original video when separate audio tracks could lose a speaker", async () => {
    const source = new File([await readFile(multiTrackPath)], "meeting.mp4", { type: "video/mp4" });
    const result = await remuxSingleAacTrack(source);
    expect(result).toMatchObject({ kind: "fallback", file: source });
  });
});
