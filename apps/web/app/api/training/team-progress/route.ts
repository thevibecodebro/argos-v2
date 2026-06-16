import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingTeamProgress } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = await createEffectiveTenantRepository(createTrainingRepository(), authUser.id);
  const result = await getTrainingTeamProgress(repository, authUser.id);
  return fromServiceResult(result);
}
