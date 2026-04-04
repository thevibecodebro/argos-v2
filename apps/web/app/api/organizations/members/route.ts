import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createUsersRepository } from "@/lib/users/create-repository";
import { listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  return fromServiceResult(await listOrganizationMembers(createUsersRepository(), authUser.id));
}
