import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithTimeout } from "./fetch-timeout";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetch timeout helpers", () => {
  it("keeps the timeout active while reading the response body", async () => {
    vi.useFakeTimers();

    let bodySignal: AbortSignal | null = null;
    const fetchMock = vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve({
        json: () => {
          bodySignal = init?.signal instanceof AbortSignal ? init.signal : null;
          return new Promise(() => undefined);
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchJsonWithTimeout<{ ok: true }>("https://example.com/stall", {}, 100);
    const result = promise.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);

    const signalDuringBodyRead = bodySignal as AbortSignal | null;
    expect(signalDuringBodyRead?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(100);
    const error = await result;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("timed out");
    expect(signalDuringBodyRead?.aborted).toBe(true);
  });
});
