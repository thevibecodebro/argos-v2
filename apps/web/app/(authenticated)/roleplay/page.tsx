import { notFound } from "next/navigation";
import { RoleplayPanel } from "@/components/panel-loaders/roleplay-panel-loader";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeErrorState } from "@/components/forge";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { listRoleplaySessions } from "@/lib/roleplay/service";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function RoleplayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const authUser = await getCachedAuthenticatedSupabaseUser();

  if (!authUser) {
    notFound();
  }

  const capabilityAccess = await requireManagedCapabilityForPage(authUser.id, "roleplay");
  const practiceReportingEnabled = hasManagedCapability(
    capabilityAccess.access,
    "practice_reporting",
  );
  const voiceEnabled = hasManagedCapability(capabilityAccess.access, "roleplay_voice");

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await listRoleplaySessions(repository, authUser.id, {
    includeOtherReps: practiceReportingEnabled,
  });

  if (!result.ok) {
    return (
      <AuthenticatedPageContainer>
        <OperationalWorkspace data-roleplay-route="operational-workspace">
          <OperationalToolbar
            description="Practice sales conversations from call evidence and coaching scenarios."
            eyebrow="Coach"
            title="Roleplay"
          />
          <ForgeErrorState
            description={result.error}
            title="Roleplay unavailable"
          />
        </OperationalWorkspace>
      </AuthenticatedPageContainer>
    );
  }

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-roleplay-route="operational-workspace">
        <OperationalToolbar
          actions={[{ href: "/roleplay/history", icon: "history", label: "History", variant: "secondary" }]}
          description="Practice sales conversations from call evidence and coaching scenarios."
          eyebrow="Coach"
          status={{ icon: "psychology", label: `${result.data.personas.length} personas`, tone: "muted" }}
          title="Roleplay"
        />

        <RoleplayPanel
          initialPersonas={result.data.personas}
          initialSessions={result.data.sessions}
          initialSessionId={firstSearchParamValue(resolvedSearchParams.sessionId)}
          voiceEnabled={voiceEnabled}
        />
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
