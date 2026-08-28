import { requireAnyAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallStatus, retryCallProcessingJob } from "@/lib/calls/service";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAnyAuthenticatedManagedCapability([
    "call_upload",
    "call_ingestion",
    "call_scoring",
  ]);
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await getCallStatus(repository, authUser.id, id);
  return fromServiceResult(result);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAnyAuthenticatedManagedCapability([
    "call_upload",
    "call_ingestion",
    "call_scoring",
  ]);
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await retryCallProcessingJob(repository, authUser.id, id);
  return fromServiceResult(result);
}
