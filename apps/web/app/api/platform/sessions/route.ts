import { NextResponse } from "next/server";
import { fromServiceResult } from "@/lib/http";
import { getPlatformApiAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { PLATFORM_SESSION_COOKIE_NAME, getPlatformSessionCookieValue } from "@/lib/platform/effective-actor";
import { createPlatformSwitchSession, endPlatformSwitchSession } from "@/lib/platform/sessions";

export const dynamic = "force-dynamic";

const platformSessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

function parseCookieHeader(cookieHeader: string | null) {
  const cookies = new Map<string, string>();

  for (const chunk of cookieHeader?.split(";") ?? []) {
    const [rawName, ...rawValue] = chunk.split("=");
    const name = rawName?.trim();

    if (name) {
      cookies.set(name, rawValue.join("=").trim());
    }
  }

  return cookies;
}

export async function POST(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json()) as {
    orgId?: unknown;
    reason?: unknown;
  };
  const result = await createPlatformSwitchSession(
    createPlatformRepository(),
    {
      role: access.staff.role,
      userId: access.staff.userId,
    },
    payload,
  );
  const response = fromServiceResult(result);

  if (result.ok) {
    response.cookies.set(
      PLATFORM_SESSION_COOKIE_NAME,
      result.data.session.id,
      platformSessionCookieOptions,
    );
  }

  return response;
}

export async function DELETE(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const sessionId = getPlatformSessionCookieValue(parseCookieHeader(request.headers.get("cookie")));
  const result = await endPlatformSwitchSession(createPlatformRepository(), {
    sessionId,
    staffUserId: access.staff.userId,
  });
  const response = fromServiceResult(result);

  response.cookies.set(PLATFORM_SESSION_COOKIE_NAME, "", {
    ...platformSessionCookieOptions,
    maxAge: 0,
  });

  return response;
}
