import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { unassignTrainingModule } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; repId: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id, repId } = await params;
  const repository = await createEffectiveTenantRepository(createTrainingRepository(), authUser.id);
  const result = await unassignTrainingModule(repository, authUser.id, id, repId);

  return fromServiceResult(result);
}
