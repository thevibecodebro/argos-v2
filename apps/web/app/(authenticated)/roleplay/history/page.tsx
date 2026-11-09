import { notFound } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeErrorState } from "@/components/forge";
import { OperationalWorkspace } from "@/components/operational-workspace";
import { RoleplayHistoryPanel } from "@/components/roleplay-history-panel";
import { RoleplayPageHeader } from "@/components/roleplay-page-header";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { listRoleplaySessions } from "@/lib/roleplay/service";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";

export default async function RoleplayHistoryPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();

  if (!authUser) {
    notFound();
  }

  const capabilityAccess = await requireManagedCapabilityForPage(authUser.id, "roleplay");

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await listRoleplaySessions(repository, authUser.id, {
    includeOtherReps: hasManagedCapability(capabilityAccess.access, "practice_reporting"),
  });

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-roleplay-route="history">
        {result.ok ? (
          <RoleplayHistoryPanel sessions={result.data.sessions} />
        ) : (
          <>
            <RoleplayPageHeader activeTab="history" />
            <ForgeErrorState description={result.error} title="Roleplay history unavailable" />
          </>
        )}
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
