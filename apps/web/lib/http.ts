import { NextResponse } from "next/server";

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function fromServiceResult<T>(
  result:
    | { ok: true; data: T }
    | {
        ok: false;
        status: number;
        error: string;
        code?: string;
        retryAfterSeconds?: number;
      },
) {
  if (result.ok) {
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return NextResponse.json(
    {
      ...(result.code ? { code: result.code } : {}),
      error: result.error,
      ...(typeof result.retryAfterSeconds === "number"
        ? { retryAfterSeconds: result.retryAfterSeconds }
        : {}),
    },
    {
      status: result.status,
      headers:
        typeof result.retryAfterSeconds === "number"
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : undefined,
    },
  );
}
