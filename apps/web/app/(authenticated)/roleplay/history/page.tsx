import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  ForgeChip,
  ForgeErrorState,
  ForgeScoreMeter,
  ForgeTableShell,
  type ForgeTone,
} from "@/components/forge";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { listRoleplaySessions } from "@/lib/roleplay/service";
import type { RoleplaySession } from "@/lib/roleplay/types";

export default async function RoleplayHistoryPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();

  if (!authUser) {
    notFound();
  }

  const result = await listRoleplaySessions(createRoleplayRepository(), authUser.id);

  if (!result.ok) {
    return (
      <AuthenticatedPageContainer>
        <OperationalWorkspace data-roleplay-route="history">
          <OperationalToolbar
            actions={[{ href: "/roleplay", icon: "mic", label: "Practice", variant: "secondary" }]}
            description="Review completed roleplays and reopen a session when you need the full practice context."
            eyebrow="Coach"
            title="Roleplay history"
          />
          <ForgeErrorState
            description={result.error}
            title="Roleplay history unavailable"
          />
        </OperationalWorkspace>
      </AuthenticatedPageContainer>
    );
  }

  const completedSessions = result.data.sessions.filter((session) => session.status === "complete");
  const selectedSession = completedSessions[0] ?? null;
  const averageScore = completedSessions.length
    ? Math.round(
        completedSessions.reduce((sum, session) => sum + (session.overallScore ?? 0), 0) /
          completedSessions.length,
      )
    : null;
  const generatedCount = completedSessions.filter((session) => isGeneratedSession(session)).length;

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-roleplay-route="history">
        <OperationalToolbar
          actions={[{ href: "/roleplay", icon: "mic", label: "Practice", variant: "secondary" }]}
          description="Review completed roleplays and reopen a session when you need the full practice context."
          eyebrow="Coach"
          status={{ icon: "history", label: `${completedSessions.length} completed`, tone: "muted" }}
          title="Roleplay history"
        />

        <OperationalMetricStrip
          metrics={[
            {
              icon: "task_alt",
              label: "Completed",
              tone: completedSessions.length > 0 ? "success" : "muted",
              value: completedSessions.length,
            },
            {
              icon: "query_stats",
              label: "Avg score",
              tone: averageScore === null ? "muted" : roleplayScoreTone(averageScore),
              value: averageScore ?? "--",
            },
            {
              icon: "auto_awesome",
              label: "Generated",
              tone: generatedCount > 0 ? "gold" : "muted",
              value: generatedCount,
            },
            {
              icon: "timer",
              label: "Last session",
              tone: selectedSession ? "cyan" : "muted",
              value: selectedSession ? formatDate(selectedSession.createdAt) : "--",
            },
          ]}
        />

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <ForgeTableShell className="min-w-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--forge-border)] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    <th className="px-4 py-3">Scenario</th>
                    <th className="px-4 py-3">Persona</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border)]">
                  {completedSessions.length ? (
                    completedSessions.map((session) => (
                      <tr
                        className="bg-[rgba(255,244,230,0.018)] text-sm text-[var(--forge-text)]"
                        key={session.id}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{scenarioLabel(session)}</p>
                          {isGeneratedSession(session) ? (
                            <ForgeChip className="mt-2" tone="gold">
                              Generated from call
                            </ForgeChip>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--forge-muted)]">
                          {getSessionPersonaLabel(session)}
                        </td>
                        <td className="px-4 py-3">
                          <ForgeScoreMeter
                            className="w-28"
                            label="Session score"
                            showValue
                            tone={roleplayScoreTone(session.overallScore)}
                            value={session.overallScore ?? 0}
                            valueSuffix="%"
                          />
                        </td>
                        <td className="px-4 py-3 text-[var(--forge-muted)]">{formatDuration(session)}</td>
                        <td className="px-4 py-3 text-[var(--forge-muted)]">{formatDate(session.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            className="font-semibold text-[var(--forge-gold)] underline hover:text-[var(--forge-gold)]/80"
                            href={`/roleplay?sessionId=${session.id}`}
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-sm text-[var(--forge-muted)]" colSpan={6}>
                        Completed sessions appear here after you finish and score a roleplay.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ForgeTableShell>

          <OperationalPreviewDrawer
            actions={
              selectedSession
                ? [
                    {
                      href: `/roleplay?sessionId=${selectedSession.id}`,
                      icon: "open_in_new",
                      label: "Review session",
                      variant: "primary",
                    },
                    { href: "/roleplay", icon: "mic", label: "Practice", variant: "secondary" },
                  ]
                : [{ href: "/roleplay", icon: "mic", label: "Start practice", variant: "secondary" }]
            }
            description={
              selectedSession
                ? "Open this session for transcript, scorecard, and coaching context."
                : "Recent score context appears here once roleplays are completed."
            }
            eyebrow="Selected session"
            title={selectedSession ? scenarioLabel(selectedSession) : "No completed sessions"}
          >
            <div className="grid gap-2 text-sm">
              <PreviewRow label="Persona" value={selectedSession ? getSessionPersonaLabel(selectedSession) : "--"} />
              <PreviewRow label="Score" value={selectedSession?.overallScore ?? "--"} />
              <PreviewRow label="Duration" value={selectedSession ? formatDuration(selectedSession) : "--"} />
              <PreviewRow label="Date" value={selectedSession ? formatDate(selectedSession.createdAt) : "--"} />
            </div>
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function isGeneratedSession(session: RoleplaySession) {
  return session.origin === "generated_from_call";
}

function scenarioLabel(session: RoleplaySession) {
  return session.personaDetails?.objectionType ?? (isGeneratedSession(session) ? "Generated roleplay" : "Practice Session");
}

function getSessionPersonaLabel(session: RoleplaySession) {
  return session.personaDetails?.name
    ?? (session.origin === "generated_from_call" ? "Anonymized buyer" : session.persona ?? "Prospect");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatDuration(session: RoleplaySession) {
  const seconds = session.transcript.length * 45;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function roleplayScoreTone(score: number | null | undefined): ForgeTone {
  if (typeof score !== "number") return "muted";
  if (score >= 80) return "cyan";
  if (score >= 65) return "gold";
  return "danger";
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
