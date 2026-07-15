import { NextResponse } from "next/server";
import { fromServiceResult } from "@/lib/http";
import {
  createIntegrationTokenRotationStore,
  rotateIntegrationTokenKey,
} from "@/lib/integrations/token-key-rotation";
import { getPlatformApiAccess } from "@/lib/platform/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    confirmation?: unknown;
    reason?: unknown;
  };
  const result = await rotateIntegrationTokenKey(
    createIntegrationTokenRotationStore(),
    {
      email: access.user.email,
      role: access.staff.role,
      userId: access.staff.userId,
    },
    payload,
  );

  return fromServiceResult(result);
}
