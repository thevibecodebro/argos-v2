import { NextResponse } from "next/server";
import { unauthorizedJson } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { revokeInvite } from "@/lib/invites/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { token } = await params;

  const result = await revokeInvite(
    createInvitesRepository(),
    createUsersRepository(),
    authUser.id,
    token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(null, { status: 204 });
}
