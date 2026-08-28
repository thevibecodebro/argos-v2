import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listHighlights } from "@/lib/calls/service";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("highlights");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await listHighlights(repository, authUser.id);
  return fromServiceResult(result);
}
