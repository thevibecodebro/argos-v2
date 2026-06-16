import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import { createUsersRepository } from "@/lib/users/create-repository";
import { listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUser.id,
  );
  return fromServiceResult(await listOrganizationMembers(repository, authUser.id));
}
