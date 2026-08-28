import { cookies } from "next/headers";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { fromServiceResult } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  acknowledgeGoogleMeetRecordingConsent,
  isGoogleMeetIntegrationConfigured,
} from "@/lib/integrations/service";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function POST() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("integration_google_meet");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;
  if (!isGoogleMeetIntegrationConfigured()) {
    return notConfigured();
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const result = await acknowledgeGoogleMeetRecordingConsent(
    repository,
    authUser.id,
  );

  if (result.ok) {
    const platformRepository = createPlatformRepository();
    const context = await getPlatformMutationAuditContext(platformRepository, {
      authUserId: authUser.id,
      cookies: await cookies(),
    });
    await auditPlatformWorkspaceMutation(platformRepository, context, {
      action: "platform.workspace.google_meet.consent.acknowledge",
      metadata: { route: "/api/integrations/google-meet/consent" },
      resourceType: "google_meet_integration",
    });
  }

  return fromServiceResult(result);
}

function notConfigured() {
  return Response.json(
    { code: "not_configured", error: "Google Meet integration is not configured" },
    { status: 503 },
  );
}
