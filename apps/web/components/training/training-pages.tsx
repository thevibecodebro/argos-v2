import Link from "next/link";
import type { ReactNode } from "react";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeChip, ForgeEmptyState, ForgeTableShell } from "@/components/forge";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { TrainingLearnerPanel } from "@/components/panel-loaders/training-learner-panel-loader";
import { TrainingCurriculumPanel } from "@/components/panel-loaders/training-curriculum-panel-loader";
import type { TrainingCurriculumPanelProps } from "@/components/training-panel";
import type { TrainingModuleSummary, TrainingTeamProgress } from "@/lib/training/service";

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] px-4 text-sm font-medium text-[var(--forge-text)] hover:bg-[var(--forge-surface-2)]";
function trainingTabs(current: "learner" | "team" | "builder") {
  return [
    { href: "/training", label: "My training", current: current === "learner" },
    { href: "/training/team", label: "Team progress", current: current === "team" },
    { href: "/training/builder", label: "Curriculum", current: current === "builder" },
  ];
}

export function TrainingLearnerPageView({ canManage, canViewHighlights = false, canViewManagerPages = canManage, modules, children }: { canManage: boolean; canViewHighlights?: boolean; canViewManagerPages?: boolean; modules: TrainingModuleSummary[]; children?: ReactNode }) {
  return (
    <AuthenticatedPageContainer>
      <div className="min-w-0 space-y-6" data-operational-workspace="true" data-training-route="operational-workspace">
        <WorkspacePageHeader
          title="Training"
          description="Review assigned modules and complete the next lesson."
          tabs={canViewManagerPages ? trainingTabs("learner") : [{ href: "/training", label: "My training", current: true }]}
          navigationLabel="Training navigation"
          actions={!canManage && canViewHighlights ? <Link className={actionClass} href="/highlights">Open highlights</Link> : undefined}
        />
        <section className="min-w-0" data-training-workspace="module-progress">{children ?? <TrainingLearnerPanel initialModules={modules} />}</section>
      </div>
    </AuthenticatedPageContainer>
  );
}

export function TrainingBuilderPageView({ children, ...props }: TrainingCurriculumPanelProps & { children?: ReactNode }) {
  return (
    <AuthenticatedPageContainer>
      <div className="min-w-0 space-y-6" data-operational-workspace="true" data-training-route="builder">
        <WorkspacePageHeader title="Curriculum" description="Create modules, assign training, and draft with AI." tabs={trainingTabs("builder")} navigationLabel="Training navigation" />
        <section className="min-w-0" data-training-workspace="builder">{children ?? <TrainingCurriculumPanel {...props} />}</section>
      </div>
    </AuthenticatedPageContainer>
  );
}

export function TrainingTeamPageView({ teamRows, canViewProfiles = false }: { teamRows: TrainingTeamProgress[]; canViewProfiles?: boolean }) {
  return (
    <AuthenticatedPageContainer>
      <div className="min-w-0 space-y-6" data-operational-workspace="true" data-training-route="team-progress">
        <WorkspacePageHeader title="Team progress" description="Review assignments and follow up on stalled training." tabs={trainingTabs("team")} navigationLabel="Training navigation" />
        <section className="min-w-0">
          <div data-forge-table="true">
            <ForgeTableShell className="min-w-0 overflow-hidden">
              <div className="divide-y divide-[var(--forge-border)] md:hidden" data-training-mobile-progress="true">
                {teamRows.length ? teamRows.map((row) => (
                  <article className="min-w-0 space-y-3 p-4" key={row.repId}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        {canViewProfiles ? <Link className="inline-flex min-h-11 items-center break-words font-medium text-[var(--forge-text)] hover:underline" href={`/team/${row.repId}`}>{formatRepName(row)}</Link> : <p className="break-words text-sm font-medium text-[var(--forge-text)]">{formatRepName(row)}</p>}
                        <p className="break-all text-xs text-[var(--forge-muted)]">{row.email}</p>
                      </div>
                      <ForgeChip tone={completionTone(row.completionRate)}>{completionLabel(row)}</ForgeChip>
                    </div>
                    <dl className="grid grid-cols-3 gap-3 text-sm">
                      <div><dt className="text-xs text-[var(--forge-muted)]">Assigned</dt><dd className="forge-tabular-nums mt-1">{row.assigned}</dd></div>
                      <div><dt className="text-xs text-[var(--forge-muted)]">Passed</dt><dd className="forge-tabular-nums mt-1">{row.passed}</dd></div>
                      <div><dt className="text-xs text-[var(--forge-muted)]">Completion</dt><dd className="forge-tabular-nums mt-1">{row.completionRate}%</dd></div>
                    </dl>
                  </article>
                )) : <ForgeEmptyState description="Assigned lessons will appear here once reps start training." title="No team training progress" />}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] text-left text-xs font-medium text-[var(--forge-muted)]">
                      <th className="px-4 py-3" scope="col">Rep</th>
                      <th className="px-4 py-3" scope="col">Assigned</th>
                      <th className="px-4 py-3" scope="col">Passed</th>
                      <th className="px-4 py-3" scope="col">Completion</th>
                      <th className="px-4 py-3" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)]">
                    {teamRows.length ? (
                      teamRows.map((row) => (
                        <tr
                          className="bg-[color-mix(in_srgb,var(--forge-text)_1.8%,transparent)] text-sm text-[var(--forge-text)]"
                          key={row.repId}
                        >
                          <td className="px-4 py-3">
                            {canViewProfiles ? <Link className="inline-flex min-h-11 items-center font-medium hover:underline" href={`/team/${row.repId}`}>{formatRepName(row)}</Link> : <p className="font-medium">{formatRepName(row)}</p>}
                            <p className="mt-1 text-xs text-[var(--forge-muted)]">{row.email}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums">{row.assigned}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums">{row.passed}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums">{row.completionRate}%</td>
                          <td className="px-4 py-3">
                            <ForgeChip tone={completionTone(row.completionRate)}>
                              {completionLabel(row)}
                            </ForgeChip>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4" colSpan={5}>
                          <ForgeEmptyState
                            description="Assigned lessons will appear here once reps start training."
                            title="No team training progress"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ForgeTableShell>
          </div>
        </section>
      </div>
    </AuthenticatedPageContainer>
  );
}

function formatRepName(rep: Pick<TrainingTeamProgress, "firstName" | "lastName" | "email">) {
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ") || rep.email;
}

function completionLabel(row: TrainingTeamProgress) {
  if (row.assigned === 0) return "Unassigned";
  if (row.completionRate >= 80) return "On track";
  if (row.completionRate >= 50) return "Needs follow-up";
  return "Stalled";
}

function completionTone(value: number) {
  if (value >= 80) return "success";
  if (value >= 50) return "gold";
  if (value > 0) return "ember";
  return "muted";
}
