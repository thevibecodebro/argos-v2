import styles from "./platform-console.module.css";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeManagementTable,
  ForgeMobileTableCards,
} from "@/components/forge";
import {
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
      className={`${styles.workspace} mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8`}
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
        title="Argos Admin Dashboard"
      >
        <form
          action="/platform/dashboard"
          className="grid min-w-0 items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_120px_140px_150px_150px_auto]"
          data-platform-dashboard-filters="true"
          method="get"
        >
          <label className="sr-only" htmlFor="platform-dashboard-search">
            Search organizations
          </label>
          <input
            className="min-h-11 min-w-0 self-end rounded-md border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 sm:col-span-2 xl:col-span-1"
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

      <dl className={styles.summary} data-platform-dashboard-metrics="true">
        <div><dt>Active organizations</dt><dd>{dashboard.summary.activeOrganizations}</dd></div>
        <div><dt>Calls reviewed</dt><dd>{dashboard.summary.callsReviewed}</dd></div>
        <div><dt>Review completion</dt><dd>{dashboard.summary.reviewCompletionRate}%</dd></div>
        <div><dt>At risk</dt><dd>{dashboard.summary.atRiskOrganizations}</dd></div>
        <div><dt>Active seats</dt><dd>{dashboard.summary.activeSeats}</dd></div>
      </dl>

      {dashboard.alerts.length ? (
        <section
          className={styles.section}
          data-platform-dashboard-alerts="true"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-sm font-semibold text-[var(--forge-muted)]">
              Platform alerts
            </p>
            {dashboard.alerts.map((alert) => (
              <a
                className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--forge-text)] transition hover:border-[color-mix(in_srgb,var(--forge-gold)_34%,transparent)]"
                href={alert.href}
                key={alert.href}
              >
                <ForgeChip tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "ember" : "muted"}>
                  {alert.count}
                </ForgeChip>
                <span>{alert.label}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className={styles.section}
        data-platform-risk-queue="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={styles.sectionTitle}>
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
              <ForgeMobileTableCards className={styles.mobileRows}>
                {dashboard.rows.map((row) => (
                  <a
                    className="block text-left"
                    href={`/platform/organizations/${encodeURIComponent(row.slug)}`}
                    key={`${row.id}:mobile`}
                  >
                    <p className="break-words text-sm font-semibold text-[var(--forge-text)]">{row.name}</p>
                    <p className="mt-1 break-words text-xs text-[var(--forge-muted)]">{row.slug}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ForgeChip tone="gold">{formatPlan(row.plan)}</ForgeChip>
                      {row.riskReasons.length ? row.riskReasons.map((reason) => (
                        <ForgeChip key={reason} tone="ember">{reason}</ForgeChip>
                      )) : <ForgeChip tone="success">Healthy</ForgeChip>}
                    </div>
                    <dl className={styles.recordDetails}>
                      <div><dt>Last activity</dt><dd>{formatDate(row.lastActivityAt)}</dd></div>
                      <div><dt>Calls</dt><dd className="forge-tabular-nums">{row.reviewedCalls}/{row.totalCalls}</dd></div>
                      <div><dt>Avg score</dt><dd className="forge-tabular-nums">{row.averageScore ?? "n/a"}</dd></div>
                      <div><dt>Training</dt><dd className="forge-tabular-nums">{formatPercent(row.trainingCompletionRate)}</dd></div>
                    </dl>
                  </a>
                ))}
              </ForgeMobileTableCards>
            }
          >
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead className="text-[11px] font-semibold text-[var(--forge-muted)]">
                <tr>
                  <th className="px-3 py-3">Organization</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Last activity</th>
                  <th className="px-3 py-3">Calls</th>
                  <th className="px-3 py-3">Avg score</th>
                  <th className="px-3 py-3">Training</th>
                  <th className="px-3 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                {dashboard.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="min-w-0 px-3 py-3">
                      <a
                        className="block break-words font-semibold text-[var(--forge-text)] transition hover:text-[var(--forge-cyan)]"
                        href={`/platform/organizations/${encodeURIComponent(row.slug)}`}
                      >
                        {row.name}
                      </a>
                      <p className="mt-1 break-words text-xs text-[var(--forge-muted)]">{row.slug}</p>
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
      </section>
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
        className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
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
