export class ResponseBodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Response body exceeds ${maxBytes} bytes`);
    this.name = "ResponseBodyTooLargeError";
  }
}

export async function readResponseArrayBufferWithLimit(
  response: Response,
  maxBytes: number,
) {
  assertValidMaxBytes(maxBytes);
  rejectOversizedContentLength(response.headers, maxBytes);

  if (!response.body) {
    return readArrayBufferWithPostCheck(() => response.arrayBuffer(), maxBytes);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ResponseBodyTooLargeError(maxBytes);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes.buffer;
}

export async function readBlobArrayBufferWithLimit(blob: Blob, maxBytes: number) {
  assertValidMaxBytes(maxBytes);

  if (blob.size > maxBytes) {
    throw new ResponseBodyTooLargeError(maxBytes);
  }

  return readArrayBufferWithPostCheck(() => blob.arrayBuffer(), maxBytes);
}

function rejectOversizedContentLength(headers: Headers, maxBytes: number) {
  const contentLength = parseContentLength(headers);

  if (contentLength !== null && contentLength > maxBytes) {
    throw new ResponseBodyTooLargeError(maxBytes);
  }
}

function parseContentLength(headers: Headers) {
  const rawValue = headers.get("content-length")?.trim();

  if (!rawValue || !/^\d+$/.test(rawValue)) {
    return null;
  }

  return Number.parseInt(rawValue, 10);
}

async function readArrayBufferWithPostCheck(
  readBuffer: () => Promise<ArrayBuffer>,
  maxBytes: number,
) {
  const arrayBuffer = await readBuffer();

  if (arrayBuffer.byteLength > maxBytes) {
    throw new ResponseBodyTooLargeError(maxBytes);
  }

  return arrayBuffer;
}

function assertValidMaxBytes(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("maxBytes must be a positive safe integer.");
  }
}
