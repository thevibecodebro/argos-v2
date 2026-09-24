import { ResponsiveAside } from "@/components/responsive-aside";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  ForgeChip,
  ForgeEmptyState,
  ForgeErrorState,
  ForgeScoreMeter,
  ForgeManagementTable,
  ForgeMobileTableCards,
  type ForgeTone,
} from "@/components/forge";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { listRoleplaySessions } from "@/lib/roleplay/service";
import type { RoleplaySession } from "@/lib/roleplay/types";
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

  if (!result.ok) {
    return (
      <AuthenticatedPageContainer>
        <OperationalWorkspace data-roleplay-route="history">
          <OperationalToolbar
            actions={[{ href: "/roleplay", icon: "mic", label: "Practice", variant: "secondary" }]}
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
  const sectionClassName = selectedSession
    ? "grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_320px]"
    : "grid min-w-0 gap-3";

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-roleplay-route="history">
        <OperationalToolbar
          actions={[{ href: "/roleplay", icon: "mic", label: "Practice", variant: "secondary" }]}
          eyebrow="Coach"
          status={{ icon: "history", label: `${completedSessions.length} completed`, tone: "muted" }}
          title="Roleplay history"
        />

        <section className={sectionClassName}>
          <div className="min-w-0" data-forge-table="true">
            <ForgeManagementTable mobileCards={
              <ForgeMobileTableCards>
                {completedSessions.length ? completedSessions.map((session) => (
                  <article className="min-w-0 space-y-3 break-words" key={session.id}>
                    <h2 className="text-sm font-semibold">{scenarioLabel(session)}</h2>
                    {isGeneratedSession(session) ? <ForgeChip tone="gold">Generated from call</ForgeChip> : null}
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2"><dt className="text-xs text-[var(--forge-muted)]">Persona</dt><dd className="mt-1">{getSessionPersonaLabel(session)}</dd></div>
                      <div><dt className="text-xs text-[var(--forge-muted)]">Score</dt><dd className="forge-tabular-nums mt-1 font-semibold">{session.overallScore ?? 0}%</dd></div>
                      <div><dt className="text-xs text-[var(--forge-muted)]">Duration</dt><dd className="forge-tabular-nums mt-1">{formatDuration(session)}</dd></div>
                      <div className="col-span-2"><dt className="text-xs text-[var(--forge-muted)]">Date</dt><dd className="mt-1">{formatDate(session.createdAt)}</dd></div>
                    </dl>
                    <Link aria-label={`Review ${scenarioLabel(session)}`} className="forge-focus-ring inline-flex min-h-11 items-center text-sm font-semibold text-[var(--forge-gold)] underline" href={`/roleplay?sessionId=${session.id}`}>Review</Link>
                  </article>
                )) : <ForgeEmptyState description="Completed practice sessions will appear here." title="No roleplay sessions" />}
              </ForgeMobileTableCards>
            }>
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
                          className="bg-[color-mix(in_srgb,var(--forge-text)_1.8%,transparent)] text-sm text-[var(--forge-text)]"
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
                        <td className="p-4" colSpan={6}>
                          <ForgeEmptyState
                            description="Completed practice sessions will appear here."
                            title="No roleplay sessions"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ForgeManagementTable>
          </div>

          {selectedSession ? (
            <ResponsiveAside title="Session details">
            <OperationalPreviewDrawer
              actions={[
                {
                  href: `/roleplay?sessionId=${selectedSession.id}`,
                  icon: "open_in_new",
                  label: "Review session",
                  variant: "primary",
                },
                { href: "/roleplay", icon: "mic", label: "Practice", variant: "secondary" },
              ]}
              data-selected-object-drawer="true"
              eyebrow="Selected session"
              title={scenarioLabel(selectedSession)}
            >
              <div className="grid gap-2 text-sm">
                <PreviewRow label="Persona" value={getSessionPersonaLabel(selectedSession)} />
                <PreviewRow label="Score" value={selectedSession.overallScore ?? "--"} />
                <PreviewRow label="Duration" value={formatDuration(selectedSession)} />
                <PreviewRow label="Date" value={formatDate(selectedSession.createdAt)} />
              </div>
            </OperationalPreviewDrawer>
            </ResponsiveAside>
          ) : null}
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
