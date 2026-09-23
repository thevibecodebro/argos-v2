import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractBuyerPersonalityFromTranscript,
  ProviderRequestError,
  scoreTranscriptFromLines,
  transcribeAudioBuffer,
  TranscriptionRequestError,
} from "@argos-v2/call-processing";

const config = { apiKey: "test-key", baseUrl: "https://provider.example", transcriptionModel: "test-model" };

afterEach(() => vi.unstubAllGlobals());

describe("transcription provider errors", () => {
  it("preserves retry metadata without exposing the provider body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { code: "rate_limit", message: "sensitive provider detail" } }),
      { status: 429, headers: { "retry-after": "3", "x-request-id": "req-123" } },
    )));

    const failure = await transcribeAudioBuffer({
      audioBytes: Buffer.from("audio"), contentType: "audio/mpeg", fileName: "audio.mp3", config,
    }).catch((error) => error);

    expect(failure).toBeInstanceOf(TranscriptionRequestError);
    expect(failure.details).toMatchObject({ category: "rate_limit", retryAfterMs: 3_000, providerRequestId: "req-123", status: 429 });
    expect(failure.message).not.toContain("sensitive provider detail");
  });

  it("classifies quota exhaustion as terminal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { code: "insufficient_quota" } }), { status: 429 },
    )));
    const failure = await transcribeAudioBuffer({
      audioBytes: Buffer.from("audio"), contentType: "audio/mpeg", fileName: "audio.mp3", config,
    }).catch((error) => error);
    expect(failure.details.category).toBe("quota");
  });

  it("aborts when the lease owner cancels work", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const request = transcribeAudioBuffer({
      audioBytes: Buffer.from("audio"), contentType: "audio/mpeg", fileName: "audio.mp3", config, signal: controller.signal,
    });
    controller.abort();
    const failure = await request.catch((error) => error);
    expect(failure.details.category).toBe("aborted");
  });

  it("classifies downstream timeout and quota responses structurally", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("request timeout", { status: 408 }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { code: "insufficient_quota" } }),
        { status: 429 },
      )));

    const scoringFailure = await scoreTranscriptFromLines({
      callTopic: "Discovery",
      durationSeconds: 30,
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello" }],
      config,
    }).catch((error) => error);
    const profileFailure = await extractBuyerPersonalityFromTranscript({
      callTopic: "Discovery",
      durationSeconds: 30,
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello" }],
      config,
    }).catch((error) => error);

    expect(scoringFailure).toBeInstanceOf(ProviderRequestError);
    expect(scoringFailure.details.category).toBe("timeout");
    expect(profileFailure).toBeInstanceOf(ProviderRequestError);
    expect(profileFailure.details.category).toBe("quota");
  });

  it("preserves an external abort reason through scoring", async () => {
    const controller = new AbortController();
    const leaseLoss = new Error("job lease lost");
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })));

    const request = scoreTranscriptFromLines({
      callTopic: "Discovery",
      durationSeconds: 30,
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello" }],
      config,
      signal: controller.signal,
    });
    controller.abort(leaseLoss);

    await expect(request).rejects.toBe(leaseLoss);
  });

  it("preserves an external abort reason through buyer profiling", async () => {
    const controller = new AbortController();
    const leaseLoss = new Error("job lease lost");
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })));

    const request = extractBuyerPersonalityFromTranscript({
      callTopic: "Discovery",
      durationSeconds: 30,
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello" }],
      config,
      signal: controller.signal,
    });
    controller.abort(leaseLoss);

    await expect(request).rejects.toBe(leaseLoss);
  });
});
