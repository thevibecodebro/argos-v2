import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { HighlightsWorkspace } from "@/components/highlights-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listHighlights } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function HighlightsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (authUser) await requireManagedCapabilityForPage(authUser.id, "highlights");
  const repository = authUser
    ? await createEffectiveTenantRepository(createCallsRepository(), authUser.id)
    : null;
  const result = authUser
    ? await listHighlights(repository ?? createCallsRepository(), authUser.id)
    : null;
  const highlights = result?.ok ? result.data.highlights : [];

  return <AuthenticatedPageContainer><HighlightsWorkspace highlights={highlights} error={result && !result.ok ? result.error : null} /></AuthenticatedPageContainer>;
}
