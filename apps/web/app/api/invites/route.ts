import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { sendInvite, listPendingInvites } from "@/lib/invites/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const payload = (await request.json()) as {
    email?: unknown;
    role?: unknown;
    teamIds?: unknown;
  };

  try {
    const result = await sendInvite(
      createInvitesRepository(),
      createUsersRepository(),
      authUser.id,
      payload,
    );
    return fromServiceResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to send invite:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await listPendingInvites(
    createInvitesRepository(),
    createUsersRepository(),
    authUser.id,
  );

  return fromServiceResult(result);
}
