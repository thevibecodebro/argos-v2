export function isRetryableSupabaseAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const authLikeError = error as Error & {
    __isAuthError?: boolean;
    status?: number;
    code?: string;
    cause?: unknown;
  };

  if (authLikeError.__isAuthError && authLikeError.status === 0) {
    return true;
  }

  if (authLikeError.message === "fetch failed") {
    return true;
  }

  if (authLikeError.code === "UND_ERR_CONNECT_TIMEOUT") {
    return true;
  }

  return authLikeError.cause instanceof Error && authLikeError.cause.message === "fetch failed";
}
