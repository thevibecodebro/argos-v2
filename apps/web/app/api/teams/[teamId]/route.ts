import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { setManagerPermissionPreset } from "@/lib/team-access/service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { teamId } = await context.params;
  const payload = (await request.json()) as { managerId?: unknown; preset?: unknown };

  return fromServiceResult(
    await setManagerPermissionPreset(createTeamAccessRepository(), authUser.id, {
      teamId,
      managerId: payload.managerId,
      preset: payload.preset,
    }),
  );
}
