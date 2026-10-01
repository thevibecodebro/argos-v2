import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeDeepgramAudioBuffer } from "@argos-v2/call-processing";

afterEach(() => vi.unstubAllGlobals());
describe("Deepgram transcription", () => {
  it("preserves speaker identity and late-call timestamps in Argos format", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ metadata: { duration: 5030 }, results: { utterances: [
      { start: 233.1, speaker: 0, transcript: "Hello" },
      { start: 5019.1, speaker: 2, transcript: "Goodbye" },
    ] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await transcribeDeepgramAudioBuffer({ audioBytes: Buffer.from("audio"), contentType: "audio/mpeg", fileName: "call.mp3", apiKey: "test-key" });
    expect(result).toEqual({ durationSeconds: 5030, transcript: [
      { timestampSeconds: 233, speaker: "Speaker A", text: "Hello" },
      { timestampSeconds: 5019, speaker: "Speaker C", text: "Goodbye" },
    ] });
    expect(fetchMock.mock.calls[0]![0]).toContain("diarize=true");
    const query = new URL(fetchMock.mock.calls[0]![0] as string).searchParams;
    expect(query.get("detect_language")).toBe("true");
    expect(query.has("language")).toBe(false);
  });
  it("classifies quota and retry delays without leaking provider body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("billing exhausted secret-key", { status: 429, headers: { "retry-after": "5", "dg-request-id": "dg-123" } })));
    await expect(transcribeDeepgramAudioBuffer({ audioBytes: Buffer.from("audio"), contentType: "audio/mpeg", fileName: "call.mp3", apiKey: "test-key" })).rejects.toMatchObject({
      name: "TranscriptionRequestError", details: { category: "quota", retryAfterMs: 5000, providerRequestId: "dg-123" },
    });
  });
  it("rejects an empty or non-diarized response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ metadata: { duration: 10 }, results: { utterances: [] } }))));
    await expect(transcribeDeepgramAudioBuffer({ audioBytes: Buffer.from("audio"), contentType: "audio/mpeg", fileName: "call.mp3", apiKey: "test-key" })).rejects.toThrow("no diarized transcript");
  });
});
