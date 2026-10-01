import { fetchWithTimeout } from "./fetch-timeout";
import { classifyProviderStatus, TranscriptionRequestError } from "./openai";
import type { TranscriptLine } from "./types";

type DeepgramResponse = {
  metadata?: { duration?: number; request_id?: string };
  results?: { utterances?: Array<{ start?: number; speaker?: number; transcript?: string }> };
};

export function normalizeDeepgramPayload(payload: DeepgramResponse) {
  const duration = payload.metadata?.duration;
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    throw new Error("Deepgram transcription returned invalid audio duration");
  }
  const transcript: TranscriptLine[] = (payload.results?.utterances ?? []).map(u => {
    if (typeof u.start !== "number" || !Number.isFinite(u.start) || u.start < 0 || u.start > duration ||
        typeof u.speaker !== "number" || !Number.isInteger(u.speaker) || u.speaker < 0) {
      throw new Error("Deepgram transcription returned invalid speaker or timestamp");
    }
    return {
      timestampSeconds: Math.round(u.start),
      speaker: `Speaker ${u.speaker < 26 ? String.fromCharCode(65 + u.speaker) : u.speaker + 1}`,
      text: u.transcript?.trim() ?? "",
    };
  }).filter(line => line.text.length > 0).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  if (!transcript.length) throw new Error("Deepgram transcription returned no diarized transcript");
  return { durationSeconds: Math.round(duration), transcript };
}

export async function transcribeDeepgramAudioBuffer(input: {
  audioBytes: Buffer;
  contentType: string | null;
  fileName: string;
  apiKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const key = input.apiKey?.trim() || process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new Error("Missing required environment variable: DEEPGRAM_API_KEY");
  const startedAt = Date.now();
  let response: Response;
  let body: DeepgramResponse | string;
  try {
    ({ response, body } = await fetchWithTimeout<DeepgramResponse | string>(
      "https://api.deepgram.com/v1/listen?model=nova-3&language=en&diarize=true&utterances=true&smart_format=true",
      { method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": input.contentType || "application/octet-stream" }, body: new Uint8Array(input.audioBytes) },
      input.timeoutMs ?? 120_000,
      response => response.ok ? response.json() : response.text(),
      input.signal,
    ));
  } catch (error) {
    throw new TranscriptionRequestError("Deepgram transcription " + (input.signal?.aborted ? "was aborted" : error instanceof Error && /timed out/i.test(error.message) ? "timed out" : "network request failed"), {
      category: input.signal?.aborted ? "aborted" : error instanceof Error && /timed out/i.test(error.message) ? "timeout" : "network",
      elapsedMs: Date.now() - startedAt, providerRequestId: null, retryAfterMs: null, status: null,
    }, { cause: error });
  }
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const retryAfterMs = retryAfter ? /^\d+(\.\d+)?$/.test(retryAfter) ? Math.ceil(Number(retryAfter) * 1000) : Math.max(0, Date.parse(retryAfter) - Date.now()) : null;
    throw new TranscriptionRequestError(`Deepgram transcription rejected with HTTP ${response.status}`, {
      category: response.status === 402 ? "quota" : classifyProviderStatus(response.status, String(body)),
      elapsedMs: Date.now() - startedAt, providerRequestId: response.headers.get("dg-request-id") || response.headers.get("x-request-id"),
      retryAfterMs: retryAfterMs !== null && Number.isFinite(retryAfterMs) ? retryAfterMs : null, status: response.status,
    });
  }
  return normalizeDeepgramPayload(body as DeepgramResponse);
}
