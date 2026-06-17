import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeManagementTable,
  ForgeMobileTableCards,
  ForgeSurface,
} from "@/components/forge";
import {
  OperationalMetricStrip,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import type { PlatformDashboardSnapshot } from "@/lib/platform/dashboard";
import { formatDate, formatPercent, formatPlan } from "./platform-format";

type PlatformDashboardPageProps = {
  dashboard: PlatformDashboardSnapshot;
};

export function PlatformDashboardPage({ dashboard }: PlatformDashboardPageProps) {
  return (
    <OperationalWorkspace
      className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8"
      data-platform-dashboard-page="true"
    >
      <OperationalToolbar
        actions={[
          {
            href: "/platform/organizations",
            icon: "business",
            label: "Organizations",
            variant: "secondary",
          },
          {
            href: "/platform/organizations/new",
            icon: "add_business",
            label: "Create organization",
            variant: "primary",
          },
        ]}
        description="Organization health, usage, and risk."
        eyebrow="Agency"
        status={{
          icon: "warning",
          label: `${dashboard.summary.atRiskOrganizations} at risk`,
          tone: dashboard.summary.atRiskOrganizations > 0 ? "ember" : "success",
        }}
        title="Agency"
      >
        <form
          action="/platform/dashboard"
          className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_120px_140px_150px_150px_auto]"
          data-platform-dashboard-filters="true"
          method="get"
        >
          <label className="sr-only" htmlFor="platform-dashboard-search">
            Search organizations
          </label>
          <input
            className="min-h-10 min-w-0 rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 sm:col-span-2 xl:col-span-1"
            defaultValue={dashboard.filters.query}
            id="platform-dashboard-search"
            name="q"
            placeholder="Search organizations"
          />
          <DashboardSelect
            label="Range"
            name="range"
            options={[
              ["7d", "7 days"],
              ["30d", "30 days"],
              ["90d", "90 days"],
            ]}
            value={dashboard.filters.range}
          />
          <DashboardSelect
            label="Plan"
            name="plan"
            options={[
              ["all", "All plans"],
              ["trial", "Trial"],
              ["pro", "Pro"],
              ["enterprise", "Enterprise"],
            ]}
            value={dashboard.filters.plan}
          />
          <DashboardSelect
            label="Activity"
            name="activity"
            options={[
              ["all", "All activity"],
              ["active", "Active"],
              ["inactive", "Inactive"],
              ["at-risk", "At risk"],
            ]}
            value={dashboard.filters.activity}
          />
          <DashboardSelect
            label="Call status"
            name="callStatus"
            options={[
              ["all", "All calls"],
              ["complete", "Reviewed"],
              ["failed", "Failed"],
              ["processing", "Processing"],
            ]}
            value={dashboard.filters.callStatus}
          />
          <ForgeButton icon="filter_list" size="sm" type="submit" variant="secondary">
            Apply
          </ForgeButton>
        </form>
      </OperationalToolbar>

      <OperationalMetricStrip
        data-platform-dashboard-metrics="true"
        metrics={[
          {
            icon: "business",
            label: "Active organizations",
            tone: "cyan",
            value: dashboard.summary.activeOrganizations,
          },
          {
            icon: "fact_check",
            label: "Calls reviewed",
            tone: "gold",
            value: dashboard.summary.callsReviewed,
          },
          {
            icon: "done_all",
            label: "Review completion",
            tone: "success",
            value: `${dashboard.summary.reviewCompletionRate}%`,
          },
          {
            icon: "warning",
            label: "At risk",
            tone: dashboard.summary.atRiskOrganizations > 0 ? "ember" : "success",
            value: dashboard.summary.atRiskOrganizations,
          },
          {
            icon: "groups",
            label: "Active seats",
            tone: "muted",
            value: dashboard.summary.activeSeats,
          },
        ]}
      />

      {dashboard.alerts.length ? (
        <ForgeSurface
          className="p-3"
          data-platform-dashboard-alerts="true"
          variant="panel"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 font-[var(--font-display)] text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--forge-muted)]">
              Agency alerts
            </p>
            {dashboard.alerts.map((alert) => (
              <a
                className="flex min-h-9 min-w-0 items-center gap-2 rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--forge-text)] transition hover:border-[color-mix(in_srgb,var(--forge-gold)_34%,transparent)]"
                href={alert.href}
                key={alert.href}
              >
                <ForgeChip tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "ember" : "muted"}>
                  {alert.count}
                </ForgeChip>
                <span className="truncate">{alert.label}</span>
              </a>
            ))}
          </div>
        </ForgeSurface>
      ) : null}

      <ForgeSurface
        className="p-4"
        data-platform-risk-queue="true"
        variant="panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="forge-page-eyebrow">Risk queue</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">
              Organizations needing attention
            </h2>
          </div>
          <ForgeChip icon="table_chart" tone="muted">
            {dashboard.summary.totalOrganizations} organizations
          </ForgeChip>
        </div>

        {dashboard.rows.length ? (
          <ForgeManagementTable
            className="mt-4"
            mobileCards={
              <ForgeMobileTableCards>
                {dashboard.rows.map((row) => (
                  <a
                    className="block rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4 text-left transition hover:border-[color-mix(in_srgb,var(--forge-gold)_32%,transparent)]"
                    href={`/platform/organizations/${encodeURIComponent(row.slug)}`}
                    key={`${row.id}:mobile`}
                  >
                    <p className="truncate text-sm font-semibold text-[var(--forge-text)]">{row.name}</p>
                    <p className="mt-1 truncate text-sm text-[var(--forge-muted)]">{row.slug}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ForgeChip tone="gold">{formatPlan(row.plan)}</ForgeChip>
                      <ForgeChip tone={row.riskReasons.length ? "ember" : "success"}>
                        {row.riskReasons.length ? row.riskReasons[0] : "Healthy"}
                      </ForgeChip>
                    </div>
                  </a>
                ))}
              </ForgeMobileTableCards>
            }
          >
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[22%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
                <tr>
                  <th className="px-3 py-3">Organization</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Last activity</th>
                  <th className="px-3 py-3">Calls</th>
                  <th className="px-3 py-3">Avg score</th>
                  <th className="px-3 py-3">Training</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                {dashboard.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="min-w-0 px-3 py-3">
                      <p className="truncate font-semibold text-[var(--forge-text)]">{row.name}</p>
                      <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">{row.slug}</p>
                    </td>
                    <td className="px-3 py-3">
                      <ForgeChip tone="gold">{formatPlan(row.plan)}</ForgeChip>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--forge-muted)]">
                      {formatDate(row.lastActivityAt)}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[var(--forge-text)]">
                      {row.reviewedCalls}/{row.totalCalls}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[var(--forge-text)]">
                      {row.averageScore ?? "n/a"}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[var(--forge-text)]">
                      {formatPercent(row.trainingCompletionRate)}
                    </td>
                    <td className="min-w-0 px-3 py-3">
                      <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
                        {row.riskReasons.length ? (
                          row.riskReasons.map((reason) => (
                            <ForgeChip
                              className="max-w-full whitespace-normal break-words leading-tight"
                              key={`${row.id}:${reason}`}
                              tone="ember"
                            >
                              {reason}
                            </ForgeChip>
                          ))
                        ) : (
                          <ForgeChip tone="success">Healthy</ForgeChip>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <a
                        className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--forge-cyan)]"
                        href={`/platform/organizations/${encodeURIComponent(row.slug)}`}
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ForgeManagementTable>
        ) : (
          <ForgeEmptyState
            className="mt-4"
            description="Adjust the filters or create an Organization to begin tracking agency health."
            icon="business"
            title="No organizations match these filters"
          />
        )}
      </ForgeSurface>
    </OperationalWorkspace>
  );
}

function DashboardSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs text-[var(--forge-muted)]">
      <span>{label}</span>
      <select
        className="min-h-10 min-w-0 rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
        defaultValue={value}
        name={name}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
