import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { assignPrimaryManager } from "@/lib/team-access/service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { userId } = await context.params;
  const payload = (await request.json()) as { managerId?: unknown };

  return fromServiceResult(
    await assignPrimaryManager(createTeamAccessRepository(), authUser.id, {
      repId: userId,
      managerId: payload.managerId,
    }),
  );
}
