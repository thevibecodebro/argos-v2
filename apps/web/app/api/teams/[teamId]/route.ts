import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { updateTeamMetadata } from "@/lib/team-access/service";

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
  const payload = (await request.json()) as {
    description?: unknown;
    name?: unknown;
    status?: unknown;
  };

  return fromServiceResult(
    await updateTeamMetadata(createTeamAccessRepository(), authUser.id, {
      teamId,
      name: payload.name,
      description: payload.description,
      status: payload.status,
    }),
  );
}
