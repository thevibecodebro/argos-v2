import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { fromServiceResult } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { disconnectIntegration } from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function POST() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("integration_zoom");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const result = await disconnectIntegration(repository, authUser.id, "zoom");
  return fromServiceResult(result);
}
