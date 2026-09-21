import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudioBuffer, TranscriptionRequestError } from "@argos-v2/call-processing";

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
});
