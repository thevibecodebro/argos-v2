import { cookies } from "next/headers";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createIngestionTitleFiltersRepository } from "@/lib/ingestion-title-filters/create-repository";
import {
  getOrganizationIngestionTitleFilters,
  replaceOrganizationIngestionTitleFilters,
} from "@/lib/ingestion-title-filters/service";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = await createEffectiveTenantRepository(
    createIngestionTitleFiltersRepository(),
    authUser.id,
  );

  return fromServiceResult(
    await getOrganizationIngestionTitleFilters(repository, authUser.id),
  );
}

export async function PUT(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const body = await request.json().catch(() => null);
  const repository = await createEffectiveTenantRepository(
    createIngestionTitleFiltersRepository(),
    authUser.id,
  );
  const result = await replaceOrganizationIngestionTitleFilters(
    repository,
    authUser.id,
    body,
  );

  if (result.ok) {
    const platformRepository = createPlatformRepository();
    const platformAuditContext = await getPlatformMutationAuditContext(
      platformRepository,
      {
        authUserId: authUser.id,
        cookies: await cookies(),
      },
    );
    await auditPlatformWorkspaceMutation(
      platformRepository,
      platformAuditContext,
      {
        action: "platform.workspace.ingestion_title_filters.update",
        metadata: {
          configured: result.data.configured,
          excludePhraseCount: result.data.excludePhrases.length,
          includePhraseCount: result.data.includePhrases.length,
          route: "/api/organizations/ingestion-title-filters",
        },
        resourceType: "organization_ingestion_title_filters",
      },
    );
  }

  return fromServiceResult(result);
}
