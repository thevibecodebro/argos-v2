import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { createTeam } from "@/lib/team-access/service";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const usersRepo = createUsersRepository();
  const caller = await usersRepo.findCurrentUserByAuthId(authUser.id);

  if (!caller || !caller.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const repo = createInvitesRepository();
  const teams = await repo.listActiveTeamsByOrg(caller.orgId);
  return NextResponse.json(teams, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const payload = (await request.json()) as { name?: unknown; description?: unknown };
  return fromServiceResult(await createTeam(createTeamAccessRepository(), authUser.id, payload));
}
