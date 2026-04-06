import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { createTeam } from "@/lib/team-access/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const payload = (await request.json()) as { name?: unknown; description?: unknown };
  return fromServiceResult(await createTeam(createTeamAccessRepository(), authUser.id, payload));
}
