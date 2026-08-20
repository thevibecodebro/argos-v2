import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { deleteAnnotation } from "@/lib/calls/service";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; annotationId: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("call_scoring");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id, annotationId } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await deleteAnnotation(repository, authUser.id, id, annotationId);
  return fromServiceResult(result);
}
