import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { disconnectIntegration, isGhlIntegrationConfigured } from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function POST() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  if (!isGhlIntegrationConfigured()) {
    return Response.json(
      {
        code: "not_configured",
        error: "GoHighLevel integration is not configured",
      },
      { status: 503 },
    );
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const result = await disconnectIntegration(repository, authUser.id, "ghl");
  return fromServiceResult(result);
}
