import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeChip, ForgeTableShell } from "@/components/forge";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import type { TrainingTeamProgress } from "@/lib/training/service";
import { loadTrainingPageData } from "../training-page-data";

export default async function TrainingTeamPage() {
  const {
    averageCompletion,
    canManage,
    teamRows,
  } = await loadTrainingPageData({ includeTeamProgress: true });

  if (!canManage) {
    redirect("/training");
  }

  const selectedRep = teamRows.find((row) => row.completionRate < 70) ?? teamRows[0] ?? null;
  const assignedTotal = teamRows.reduce((sum, row) => sum + row.assigned, 0);
  const passedTotal = teamRows.reduce((sum, row) => sum + row.passed, 0);
  const blockedCount = teamRows.filter((row) => row.assigned > 0 && row.completionRate < 50).length;

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

        <OperationalMetricStrip
          metrics={[
            {
              icon: "groups",
              label: "Tracked reps",
              tone: teamRows.length > 0 ? "gold" : "muted",
              value: teamRows.length,
            },
            {
              icon: "assignment",
              label: "Assigned",
              tone: assignedTotal > 0 ? "cyan" : "muted",
              value: assignedTotal,
            },
            {
              icon: "task_alt",
              label: "Passed",
              tone: passedTotal > 0 ? "success" : "muted",
              value: passedTotal,
            },
            {
              icon: blockedCount > 0 ? "warning" : "monitoring",
              label: "Avg completion",
              tone: blockedCount > 0 ? "ember" : completionTone(averageCompletion),
              value: `${averageCompletion}%`,
            },
          ]}
        />

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                      <td className="px-4 py-8 text-sm text-[var(--forge-muted)]" colSpan={5}>
                        Team progress appears after modules are assigned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ForgeTableShell>

          <OperationalPreviewDrawer
            actions={
              selectedRep
                ? [
                    { href: "/training/builder", icon: "assignment_add", label: "Assign module", variant: "primary" },
                    { href: `/team/${selectedRep.repId}`, icon: "person", label: "Open profile", variant: "secondary" },
                  ]
                : [{ href: "/training/builder", icon: "edit_note", label: "Open builder", variant: "secondary" }]
            }
            description={
              selectedRep
                ? "Use this rep as the next training follow-up. Keep the table for scan, then move to the profile or builder when action is needed."
                : "A focused follow-up appears here once team training activity exists."
            }
            eyebrow="Next follow-up"
            title={selectedRep ? formatRepName(selectedRep) : "No training activity"}
          >
            <div className="grid gap-2 text-sm">
              <PreviewRow label="Assigned" value={selectedRep?.assigned ?? 0} />
              <PreviewRow label="Passed" value={selectedRep?.passed ?? 0} />
              <PreviewRow label="Completion" value={`${selectedRep?.completionRate ?? 0}%`} />
              <PreviewRow label="Status" value={selectedRep ? completionLabel(selectedRep) : "No assignments"} />
            </div>
          </OperationalPreviewDrawer>
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
