import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeChip, ForgeEmptyState, ForgeTableShell } from "@/components/forge";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import type { TrainingTeamProgress } from "@/lib/training/service";
import { loadTrainingPageData } from "../training-page-data";

export default async function TrainingTeamPage() {
  const {
    canManage,
    teamRows,
  } = await loadTrainingPageData({ includeTeamProgress: true });

  if (!canManage) {
    redirect("/training");
  }

  const selectedRep = teamRows.find((row) => row.completionRate < 70) ?? teamRows[0] ?? null;
  const sectionClassName = selectedRep
    ? "grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
    : "grid min-w-0 gap-3";

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-training-route="team-progress">
        <OperationalToolbar
          actions={[
            { href: "/training", icon: "school", label: "My training", variant: "secondary" },
            { href: "/training/builder", icon: "edit_note", label: "Curriculum", variant: "secondary" },
          ]}
          description="Scan team progress, spot stalled assignments, and choose the next coaching follow-up."
          eyebrow="Coach"
          status={{ icon: "groups", label: `${teamRows.length} reps`, tone: "muted" }}
          title="Team progress"
        />

        <section className={sectionClassName}>
          <div data-forge-table="true">
            <ForgeTableShell className="min-w-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] text-left text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                      <th className="px-4 py-3">Rep</th>
                      <th className="px-4 py-3">Assigned</th>
                      <th className="px-4 py-3">Passed</th>
                      <th className="px-4 py-3">Completion</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)]">
                    {teamRows.length ? (
                      teamRows.map((row) => (
                        <tr
                          className="bg-[rgba(255,244,230,0.018)] text-sm text-[var(--forge-text)]"
                          key={row.repId}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold">{formatRepName(row)}</p>
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

          {selectedRep ? (
            <OperationalPreviewDrawer
              actions={[
                { href: "/training/builder", icon: "assignment_add", label: "Assign module", variant: "primary" },
                { href: `/team/${selectedRep.repId}`, icon: "person", label: "Open profile", variant: "secondary" },
              ]}
              data-selected-object-drawer="true"
              description="Use this rep as the next training follow-up. Keep the table for scan, then move to the profile or builder when action is needed."
              eyebrow="Next follow-up"
              title={formatRepName(selectedRep)}
            >
              <div className="grid gap-2 text-sm">
                <PreviewRow label="Assigned" value={selectedRep.assigned} />
                <PreviewRow label="Passed" value={selectedRep.passed} />
                <PreviewRow label="Completion" value={`${selectedRep.completionRate}%`} />
                <PreviewRow label="Status" value={completionLabel(selectedRep)} />
              </div>
            </OperationalPreviewDrawer>
          ) : null}
        </section>
      </OperationalWorkspace>
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
