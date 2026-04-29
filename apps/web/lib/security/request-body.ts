export type BoundedRequestTextResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" };

export async function readRequestTextWithLimit(
  request: Request,
  maxBytes: number,
): Promise<BoundedRequestTextResult> {
  const contentLength = request.headers.get("Content-Length");
  const declaredBytes = contentLength ? Number.parseInt(contentLength, 10) : Number.NaN;

  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) {
    const text = await request.text();
    return new TextEncoder().encode(text).byteLength > maxBytes
      ? { ok: false, reason: "too_large" }
      : { ok: true, text };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytesRead += value.byteLength;

    if (bytesRead > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: "too_large" };
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();

  return { ok: true, text };
}
