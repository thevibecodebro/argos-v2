import { notFound } from "next/navigation";
import { RoleplayPanel } from "@/components/page-panel-loaders";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeErrorState } from "@/components/forge";
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
        <ForgeErrorState
          description={result.error}
          title="Roleplay unavailable"
        />
      </AuthenticatedPageContainer>
    );
  }

  return (
    <AuthenticatedPageContainer className="space-y-12">
      <RoleplayPanel
        initialPersonas={result.data.personas}
        initialSessions={result.data.sessions}
        initialSessionId={firstSearchParamValue(resolvedSearchParams.sessionId)}
      />
    </AuthenticatedPageContainer>
  );
}
