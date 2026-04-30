import { notFound } from "next/navigation";
import { RoleplayPanel } from "@/components/page-panel-loaders";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
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
        <section className="mb-8 rounded-2xl border border-[rgba(255,159,95,0.22)] bg-[rgba(255,159,95,0.06)] p-6 text-sm leading-7 text-[var(--forge-ember)]">
          <p className="font-bold text-[var(--forge-ember)]">Roleplay unavailable</p>
          <p className="mt-1">{result.error}</p>
        </section>
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
