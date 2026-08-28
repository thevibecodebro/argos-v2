import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { unassignTrainingModule } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; repId: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("training");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id, repId } = await params;
  const repository = await createEffectiveTenantRepository(createTrainingRepository(), authUser.id);
  const result = await unassignTrainingModule(repository, authUser.id, id, repId);

  return fromServiceResult(result);
}
