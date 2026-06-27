import { NextResponse } from "next/server";
import { resendPlatformAdminInvite } from "@/lib/platform/admin-invite-resend";
import { getPlatformApiAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { slug } = await context.params;
  const result = await resendPlatformAdminInvite(
    createPlatformRepository(),
    {
      email: access.user.email,
      role: access.staff.role,
      userId: access.staff.userId,
    },
    { slug },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      auditEvent: {
        id: result.data.auditEvent.id,
      },
      invite: {
        email: result.data.invite.email,
        expiresAt: result.data.invite.expiresAt,
        extended: result.data.invite.extended,
      },
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
