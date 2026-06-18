import { cookies } from "next/headers";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { acknowledgeGhlRecordingConsent, isGhlIntegrationConfigured } from "@/lib/integrations/service";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
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
  const result = await acknowledgeGhlRecordingConsent(repository, authUser.id);

  if (result.ok) {
    const platformRepository = createPlatformRepository();
    const platformAuditContext = await getPlatformMutationAuditContext(platformRepository, {
      authUserId: authUser.id,
      cookies: await cookies(),
    });
    await auditPlatformWorkspaceMutation(platformRepository, platformAuditContext, {
      action: "platform.workspace.ghl.consent.acknowledge",
      resourceType: "ghl_integration",
      metadata: {
        route: "/api/integrations/ghl/consent",
      },
    });
  }

  return fromServiceResult(result);
}
