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

async function readOptionalJsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: true as const, data: {} };
  }

  const body = await request.text();

  if (!body.trim()) {
    return { ok: true as const, data: {} };
  }

  try {
    const parsed = JSON.parse(body) as unknown;

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "JSON body must be an object" },
          { status: 400 },
        ),
      };
    }

    return {
      ok: true as const,
      data: parsed as { reason?: unknown; ticketId?: unknown },
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }
}

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
    const payloadResult = await readOptionalJsonBody(request);

    if (!payloadResult.ok) {
      return payloadResult.response;
    }

    const payload = payloadResult.data;
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
