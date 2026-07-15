import { cookies } from "next/headers";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  isGoogleMeetIntegrationConfigured,
  updateGoogleMeetSettings,
} from "@/lib/integrations/service";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return unauthorizedJson();
  }
  if (!isGoogleMeetIntegrationConfigured()) {
    return notConfigured();
  }

  const body = (await request.json().catch(() => null)) as {
    defaultRepId?: unknown;
  } | null;
  if (
    !body ||
    (body.defaultRepId !== null && typeof body.defaultRepId !== "string")
  ) {
    return Response.json(
      { error: "Invalid Google Meet settings payload" },
      { status: 400 },
    );
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const result = await updateGoogleMeetSettings(repository, authUser.id, {
    defaultRepId: body.defaultRepId,
  });

  if (result.ok) {
    const platformRepository = createPlatformRepository();
    const context = await getPlatformMutationAuditContext(platformRepository, {
      authUserId: authUser.id,
      cookies: await cookies(),
    });
    await auditPlatformWorkspaceMutation(platformRepository, context, {
      action: "platform.workspace.google_meet.settings.update",
      metadata: { route: "/api/integrations/google-meet/settings" },
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
