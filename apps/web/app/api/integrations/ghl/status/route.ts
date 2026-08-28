import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("integration_ghl");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const result = await getIntegrationStatuses(repository, authUser.id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data.ghl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
