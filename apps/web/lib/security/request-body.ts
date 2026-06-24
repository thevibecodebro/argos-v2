export type BoundedRequestTextResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" };

export type BoundedRequestFormDataResult =
  | { ok: true; formData: FormData }
  | { ok: false; reason: "invalid" | "too_large" };

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

export async function readRequestFormDataWithLimit(
  request: Request,
  maxBytes: number,
): Promise<BoundedRequestFormDataResult> {
  const contentLength = request.headers?.get("Content-Length");
  const declaredBytes = contentLength ? Number.parseInt(contentLength, 10) : Number.NaN;

  if (Number.isFinite(declaredBytes)) {
    if (declaredBytes > maxBytes) {
      return { ok: false, reason: "too_large" };
    }

    const formData = await request.formData().catch(() => null);

    return formData
      ? { ok: true, formData }
      : { ok: false, reason: "invalid" };
  }

  if (!request.body) {
    const formData = await request.formData().catch(() => null);

    return formData
      ? { ok: true, formData }
      : { ok: false, reason: "invalid" };
  }

  const body = await readRequestBodyWithLimit(request, maxBytes);

  if (!body.ok) {
    return body;
  }

  const headers = new Headers(request.headers);
  headers.delete("Content-Length");

  const boundedRequest = new Request(request.url, {
    body: body.bytes.buffer as ArrayBuffer,
    headers,
    method: request.method,
  });
  const formData = await boundedRequest.formData().catch(() => null);

  return formData
    ? { ok: true, formData }
    : { ok: false, reason: "invalid" };
}

async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: "too_large" }> {
  const reader = request.body!.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      bytesRead += value.byteLength;

      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(bytesRead);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, bytes };
}
