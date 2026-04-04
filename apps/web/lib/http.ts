import { NextResponse } from "next/server";

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function fromServiceResult<T>(result: { ok: true; data: T } | { ok: false; status: number; error: string }) {
  if (result.ok) {
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return NextResponse.json({ error: result.error }, { status: result.status });
}
