import { NextResponse } from "next/server";
import { fromServiceResult } from "@/lib/http";
import { archiveOrganizationForPlatform } from "@/lib/organizations/archive";
import { getPlatformApiAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { createPlatformOrganizationWithAdminInvite } from "@/lib/platform/organizations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json()) as {
    adminEmail?: unknown;
    name?: unknown;
    plan?: unknown;
    reason?: unknown;
    slug?: unknown;
  };
  const result = await createPlatformOrganizationWithAdminInvite(
    createPlatformRepository(),
    {
      role: access.staff.role,
      userId: access.staff.userId,
    },
    payload,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      auditEvent: result.data.auditEvent,
      invite: {
        acceptedAt: result.data.invite.acceptedAt,
        createdAt: result.data.invite.createdAt,
        email: result.data.invite.email,
        expiresAt: result.data.invite.expiresAt,
        id: result.data.invite.id,
        orgId: result.data.invite.orgId,
        role: result.data.invite.role,
        teamIds: result.data.invite.teamIds,
      },
      organization: result.data.organization,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function DELETE(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json()) as {
    confirmationSlug?: unknown;
    orgId?: unknown;
    reason?: unknown;
  };
  const result = await archiveOrganizationForPlatform(
    createPlatformRepository(),
    {
      email: access.user.email,
      role: access.staff.role,
      userId: access.staff.userId,
    },
    payload,
  );

  return fromServiceResult(result);
}
