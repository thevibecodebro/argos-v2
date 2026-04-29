type FetchReadResult<T> = {
  body: T;
  response: Response;
};

async function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function fetchWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  readBody: (response: Response) => Promise<T>,
): Promise<FetchReadResult<T>> {
  return runWithTimeout(async (signal) => {
    const response = await fetch(input, {
      ...init,
      signal,
    });

    return {
      response,
      body: await readBody(response),
    };
  }, timeoutMs);
}

export function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  return fetchWithTimeout<T>(
    input,
    init,
    timeoutMs,
    (response) => response.json() as Promise<T>,
  );
}

export function fetchTextWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  return fetchWithTimeout<string>(input, init, timeoutMs, (response) =>
    response.text(),
  );
}

export function fetchArrayBufferWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  return fetchWithTimeout<ArrayBuffer>(input, init, timeoutMs, (response) =>
    response.arrayBuffer(),
  );
}
