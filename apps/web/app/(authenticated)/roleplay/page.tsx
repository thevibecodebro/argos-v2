import { notFound } from "next/navigation";
import { RoleplayPanel } from "@/components/panel-loaders/roleplay-panel-loader";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeErrorState } from "@/components/forge";
import {
  OperationalMetricStrip,
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

  const completedSessions = result.data.sessions.filter((session) => session.status === "complete");
  const activeSessions = result.data.sessions.filter((session) => session.status !== "complete");
  const averageScore = completedSessions.length
    ? Math.round(
        completedSessions.reduce((sum, session) => sum + (session.overallScore ?? 0), 0) /
          completedSessions.length,
      )
    : null;

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

        <OperationalMetricStrip
          metrics={[
            {
              icon: "theater_comedy",
              label: "Scenarios",
              tone: "gold",
              value: result.data.personas.length,
            },
            {
              icon: "bolt",
              label: "Active",
              tone: activeSessions.length > 0 ? "cyan" : "muted",
              value: activeSessions.length,
            },
            {
              icon: "task_alt",
              label: "Completed",
              tone: completedSessions.length > 0 ? "success" : "muted",
              value: completedSessions.length,
            },
            {
              icon: "query_stats",
              label: "Avg score",
              tone: averageScore === null ? "muted" : averageScore >= 75 ? "success" : "gold",
              value: averageScore === null ? "--" : averageScore,
            },
          ]}
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
