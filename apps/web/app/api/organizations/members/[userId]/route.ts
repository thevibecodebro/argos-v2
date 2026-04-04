import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createUsersRepository } from "@/lib/users/create-repository";
import { removeOrganizationMember, updateOrganizationMemberRole } from "@/lib/users/service";

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

  return fromServiceResult(
    await updateOrganizationMemberRole(createUsersRepository(), authUser.id, userId, payload),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const { userId } = await context.params;

    return fromServiceResult(
      await removeOrganizationMember(createUsersRepository(), authUser.id, userId),
    );
  } catch (error) {
    console.error("Failed to remove organization member", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
