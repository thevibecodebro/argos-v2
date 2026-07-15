import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  disconnectIntegration,
  isGoogleMeetIntegrationConfigured,
} from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function POST() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return unauthorizedJson();
  }
  if (!isGoogleMeetIntegrationConfigured()) {
    return notConfigured();
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  return fromServiceResult(
    await disconnectIntegration(repository, authUser.id, "google_meet"),
  );
}

function notConfigured() {
  return Response.json(
    { code: "not_configured", error: "Google Meet integration is not configured" },
    { status: 503 },
  );
}
