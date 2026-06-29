import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import { createUsersRepository } from "@/lib/users/create-repository";
import { removeOrganizationMember, updateOrganizationMemberRole } from "@/lib/users/service";
import { SupabaseAuthSessionRevoker } from "@/lib/users/session-revocation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { userId } = await context.params;
  const payload = (await request.json()) as { role?: unknown };
  const repository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUser.id,
  );

  return fromServiceResult(
    await updateOrganizationMemberRole(repository, authUser.id, userId, payload),
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const { userId } = await context.params;
    const payload = request.headers.get("content-type")?.includes("application/json")
      ? ((await request.json()) as { reason?: unknown; ticketId?: unknown })
      : {};
    const repository = await createEffectiveTenantUsersRepository(
      createUsersRepository(),
      authUser.id,
    );

    return fromServiceResult(
      await removeOrganizationMember(repository, authUser.id, userId, {
        reason: payload.reason,
        ticketId: payload.ticketId,
        sessionRevoker: new SupabaseAuthSessionRevoker(),
      }),
    );
  } catch (error) {
    console.error("Failed to remove organization member", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
