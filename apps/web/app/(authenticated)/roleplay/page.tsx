import { notFound } from "next/navigation";
import { RoleplayPanel } from "@/components/panel-loaders/roleplay-panel-loader";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeErrorState } from "@/components/forge";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { listRoleplaySessions } from "@/lib/roleplay/service";

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

  const result = await listRoleplaySessions(createRoleplayRepository(), authUser.id);

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
        />
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
