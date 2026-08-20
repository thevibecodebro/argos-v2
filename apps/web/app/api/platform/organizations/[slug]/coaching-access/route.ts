import { NextResponse } from "next/server";
import { mutateCoachingAccess } from "@/lib/platform/coaching-access";
import { getPlatformApiAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { validatePlatformJsonMutation } from "@/lib/security/platform-mutation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const mutation = validatePlatformJsonMutation(request);
  if (!mutation.ok) {
    return NextResponse.json({ error: mutation.error }, { status: mutation.status });
  }

  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Valid JSON body required" }, { status: 400 });
  }

  const { slug } = await context.params;
  const result = await mutateCoachingAccess(
    createPlatformRepository(),
    {
      email: access.user.email ?? "unknown",
      role: access.staff.role,
      userId: access.staff.userId,
    },
    slug,
    body,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...("code" in result ? { code: result.code } : {}) },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      grant: {
        ...result.data,
        endsAt: result.data.endsAt.toISOString(),
        startsAt: result.data.startsAt.toISOString(),
        updatedAt: result.data.updatedAt.toISOString(),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
