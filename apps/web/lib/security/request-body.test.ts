import { describe, expect, it } from "vitest";
import { readRequestTextWithLimit } from "./request-body";

describe("bounded request body helpers", () => {
  it("rejects oversized content-length before reading the request stream", async () => {
    const request = {
      headers: new Headers({ "Content-Length": "100" }),
      get body(): ReadableStream<Uint8Array> {
        throw new Error("body should not be read");
      },
      text: async () => {
        throw new Error("text should not be read");
      },
    } as unknown as Request;

    const result = await readRequestTextWithLimit(request, 10);

    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects a streaming body as soon as it crosses the byte limit", async () => {
    let chunksRead = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksRead += 1;
        controller.enqueue(new TextEncoder().encode("abcdef"));

        if (chunksRead > 3) {
          controller.close();
        }
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);

    const result = await readRequestTextWithLimit(request, 10);

    expect(result).toEqual({ ok: false, reason: "too_large" });
    expect(chunksRead).toBe(2);
  });
});
