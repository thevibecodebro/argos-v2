import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await getIntegrationStatuses(createIntegrationsRepository(), authUser.id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data.ghl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
