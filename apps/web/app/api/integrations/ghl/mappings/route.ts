import { cookies } from "next/headers";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  isGhlIntegrationConfigured,
  listGhlUserMappings,
  updateGhlUserMappings,
} from "@/lib/integrations/service";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

type MappingInput = {
  argosUserId?: unknown;
  ghlUserEmail?: unknown;
  ghlUserId?: unknown;
  ghlUserName?: unknown;
};

type NormalizedMapping = {
  argosUserId: string;
  ghlUserEmail: string | null;
  ghlUserId: string;
  ghlUserName: string | null;
};

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  if (!isGhlIntegrationConfigured()) {
    return notConfigured();
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  return fromServiceResult(await listGhlUserMappings(repository, authUser.id));
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  if (!isGhlIntegrationConfigured()) {
    return notConfigured();
  }

  const body = (await request.json().catch(() => null)) as {
    defaultRepId?: unknown;
    mappings?: unknown;
  } | null;

  if (
    !body ||
    (body.defaultRepId !== undefined &&
      body.defaultRepId !== null &&
      typeof body.defaultRepId !== "string")
  ) {
    return Response.json({ error: "Invalid GHL mapping payload" }, { status: 400 });
  }

  if (body.mappings !== undefined && !Array.isArray(body.mappings)) {
    return Response.json({ error: "Invalid GHL mapping payload" }, { status: 400 });
  }

  const mappings = Array.isArray(body.mappings)
    ? body.mappings.map(normalizeMapping).filter(isNormalizedMapping)
    : undefined;

  if (Array.isArray(body.mappings) && mappings?.length !== body.mappings.length) {
    return Response.json({ error: "Invalid GHL mapping payload" }, { status: 400 });
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const result = await updateGhlUserMappings(repository, authUser.id, {
    defaultRepId:
      typeof body.defaultRepId === "string"
        ? body.defaultRepId
        : body.defaultRepId === null
          ? null
          : undefined,
    mappings,
  });

  if (result.ok) {
    const platformRepository = createPlatformRepository();
    const platformAuditContext = await getPlatformMutationAuditContext(platformRepository, {
      authUserId: authUser.id,
      cookies: await cookies(),
    });
    await auditPlatformWorkspaceMutation(platformRepository, platformAuditContext, {
      action: "platform.workspace.ghl.mappings.update",
      resourceType: "ghl_integration",
      metadata: {
        defaultRepUpdated: body.defaultRepId !== undefined,
        mappingCount: mappings?.length ?? null,
        route: "/api/integrations/ghl/mappings",
      },
    });
  }

  return fromServiceResult(result);
}

function normalizeMapping(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const mapping = value as MappingInput;

  if (typeof mapping.argosUserId !== "string" || typeof mapping.ghlUserId !== "string") {
    return null;
  }

  return {
    argosUserId: mapping.argosUserId,
    ghlUserId: mapping.ghlUserId,
    ghlUserEmail: typeof mapping.ghlUserEmail === "string" ? mapping.ghlUserEmail : null,
    ghlUserName: typeof mapping.ghlUserName === "string" ? mapping.ghlUserName : null,
  };
}

function isNormalizedMapping(value: NormalizedMapping | null): value is NormalizedMapping {
  return value !== null;
}

function notConfigured() {
  return Response.json(
    {
      code: "not_configured",
      error: "GoHighLevel integration is not configured",
    },
    { status: 503 },
  );
}
