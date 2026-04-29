import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { disconnectIntegration, isGhlIntegrationConfigured } from "@/lib/integrations/service";

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

  const result = await disconnectIntegration(createIntegrationsRepository(), authUser.id, "ghl");
  return fromServiceResult(result);
}
