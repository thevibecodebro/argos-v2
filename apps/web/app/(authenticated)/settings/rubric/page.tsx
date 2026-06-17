import { DEFAULT_CALL_SCORING_RUBRIC } from "@argos-v2/call-processing";
import { ForgeChip, ForgeTableShell } from "@/components/forge";
import type { RubricSummary, RubricWithCategories } from "@/lib/rubrics/types";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { loadAdminRubricSettings } from "./rubric-page-data";

export default async function SettingsRubricPage() {
  const { activeRubric, history } = await loadAdminRubricSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/rubric/builder", icon: "edit_note", label: "Open builder", variant: "primary" }]}
      description="Configure the scoring rubric used across reviewed calls."
      previewDescription="Active rubric and scoring-system history."
      previewRows={[
        { label: "Active rubric", value: activeRubric?.name ?? "Default template" },
        { label: "Categories", value: activeRubric?.categories.length ?? DEFAULT_CALL_SCORING_RUBRIC.categories.length },
        { label: "History", value: history.length },
        { label: "Status", tone: activeRubric ? "success" : "muted", value: activeRubric ? "Active" : "Default" },
      ]}
      previewTitle="Rubric status"
      route="rubrics"
      title="Rubrics"
    >
      <section className="grid gap-3" data-rubric-route="overview">
        <article className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
            Active rubric
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--forge-text)]">
                {activeRubric?.name ?? "Default template"}
              </h2>
              <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
                {activeRubric?.description ?? "The starter rubric is used until an admin publishes a custom version."}
              </p>
            </div>
            <ForgeChip tone={activeRubric ? "success" : "muted"}>
              {activeRubric ? `v${activeRubric.version}` : "Default"}
            </ForgeChip>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <OverviewStat label="Categories" value={activeRubric?.categories.length ?? DEFAULT_CALL_SCORING_RUBRIC.categories.length} />
            <OverviewStat label="History" value={history.length} />
            <OverviewStat label="Status" value={activeRubric ? "Active" : "Default"} />
          </div>
        </article>

        <section aria-labelledby="rubric-version-history-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--forge-text)]" id="rubric-version-history-title">
              Version history
            </h2>
            <span className="text-xs font-semibold text-[var(--forge-muted)]">
              {history.length} versions
            </span>
          </div>
          <ForgeTableShell className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--forge-border)] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Categories</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border)]">
                  {history.length ? (
                    history.map((entry) => (
                      <RubricHistoryRow entry={entry} key={entry.id} />
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-sm text-[var(--forge-muted)]" colSpan={5}>
                        Published rubric versions appear here after the first custom rubric is activated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ForgeTableShell>
        </section>
      </section>
    </SettingsOperationalLayout>
  );
}

function OverviewStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_55%,transparent)] px-3 py-2">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--forge-text)]">{value}</p>
    </div>
  );
}

function RubricHistoryRow({ entry }: { entry: RubricSummary }) {
  return (
    <tr className="bg-[color-mix(in_srgb,var(--forge-text)_1.8%,transparent)] text-sm text-[var(--forge-text)]">
      <td className="px-4 py-3 font-semibold tabular-nums">v{entry.version}</td>
      <td className="px-4 py-3">
        <p className="font-semibold">{entry.name}</p>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--forge-muted)]">{entry.description}</p>
      </td>
      <td className="px-4 py-3">
        <ForgeChip tone={entry.isActive ? "success" : entry.status === "draft" ? "gold" : "muted"}>
          {entry.isActive ? "Active" : entry.status}
        </ForgeChip>
      </td>
      <td className="px-4 py-3 font-semibold tabular-nums">{entry.categoryCount}</td>
      <td className="px-4 py-3 text-[var(--forge-muted)]">{formatDate(entry.updatedAt)}</td>
    </tr>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}
