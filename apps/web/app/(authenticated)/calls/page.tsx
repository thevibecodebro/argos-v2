import { Suspense } from "react";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listCalls } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { getCallsWorkspaceQuery } from "@/components/calls-workspace-query";
import { CallsWorkspace } from "@/components/calls-workspace";
import { ForgeSkeleton } from "@/components/forge";
import { CallsFilters } from "./calls-filters";
import { requireAnyManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CallsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const capabilityAccess = authUser
    ? await requireAnyManagedCapabilityForPage(authUser.id, ["call_upload", "call_ingestion", "call_scoring"])
    : null;
  const scoringEnabled = capabilityAccess ? hasManagedCapability(capabilityAccess.access, "call_scoring") : false;
  const { filters } = getCallsWorkspaceQuery(resolvedSearchParams, scoringEnabled);

  const repository = authUser
    ? await createEffectiveTenantRepository(createCallsRepository(), authUser.id)
    : null;
  const result = authUser && repository
    ? await listCalls(repository, authUser.id, filters)
    : null;

  const calls = result?.ok ? result.data.calls : [];
  const total = result?.ok ? result.data.total : 0;
  const viewer = result?.ok ? result.data.viewer : null;
  const canSeeRep =
    viewer?.role === "admin" ||
    viewer?.role === "manager" ||
    viewer?.role === "executive";
  const query = getCallsWorkspaceQuery(resolvedSearchParams, scoringEnabled, total);
  const canUpload = capabilityAccess ? hasManagedCapability(capabilityAccess.access, "call_upload") : false;
  return <AuthenticatedPageContainer size="wide"><CallsWorkspace calls={calls} total={total} canSeeRep={canSeeRep} canDelete={viewer?.role === "admin"} scoringEnabled={scoringEnabled} canUpload={canUpload} hasActiveFilters={query.hasActiveFilters} error={result && !result.ok ? result.error : null} views={query.views} page={query.page} totalPages={query.totalPages} previousHref={query.previousHref} nextHref={query.nextHref} filters={<Suspense fallback={<ForgeSkeleton lines={2} />}><CallsFilters initialSearch={filters.search ?? ""} scoringEnabled={scoringEnabled} /></Suspense>} /></AuthenticatedPageContainer>;
}
