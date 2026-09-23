type FetchReadResult<T> = {
  body: T;
  response: Response;
};

async function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const abortFromExternal = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  }

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    externalSignal?.removeEventListener("abort", abortFromExternal);
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
  externalSignal?: AbortSignal,
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
  }, timeoutMs, externalSignal);
}
