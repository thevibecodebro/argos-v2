type AuthTransportFailureContext = {
  source: "middleware" | "auth-callback";
  path: string;
  error: unknown;
};

export function logAuthTransportFailure({
  source,
  path,
  error,
}: AuthTransportFailureContext) {
  const normalizedError =
    error instanceof Error
      ? (error as Error & { status?: number; code?: string; __isAuthError?: boolean })
      : null;

  console.warn("[auth] transport failure", {
    source,
    path,
    message: normalizedError?.message ?? "unknown auth transport error",
    status: normalizedError?.status ?? null,
    code: normalizedError?.code,
    isAuthError: normalizedError?.__isAuthError === true,
  });
}
