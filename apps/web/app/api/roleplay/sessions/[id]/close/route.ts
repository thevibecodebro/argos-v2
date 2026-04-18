import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { closeRoleplaySession } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const result = await closeRoleplaySession(createRoleplayRepository(), authUser.id, id);
  return fromServiceResult(result);
}
