"use client";

import { useState } from "react";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeManagementTable,
  ForgeSurface,
} from "@/components/forge";
import {
  OperationalMetricStrip,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import type { PlatformOrganizationDetailSnapshot } from "@/lib/platform/organization-detail";
import { submitArchiveOrganization } from "./platform-console-actions";
import { formatAccessSessionStatus, formatDate, formatPercent, formatPlan } from "./platform-format";

type PlatformOrganizationDetailPageProps = {
  organization: PlatformOrganizationDetailSnapshot;
};

export function PlatformOrganizationDetailPage({
  organization,
}: PlatformOrganizationDetailPageProps) {
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [reason, setReason] = useState("");
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const alertStatus = organization.alerts.length
    ? `${organization.alerts.length} alerts`
    : "Healthy";
  const isArchived = organization.organization.status === "archived";

  async function archiveOrganization() {
    setArchiveMessage(null);
    setIsArchiving(true);

    try {
      const result = await submitArchiveOrganization(fetch, {
        confirmationSlug,
        orgId: organization.organization.id,
        reason,
      });
      setArchiveMessage(
        `Organization archived. ${result.detachedUserCount} users detached.`,
      );
      window.location.assign("/platform/organizations?status=archived");
    } catch (error) {
      setArchiveMessage(error instanceof Error ? error.message : "Unable to archive organization.");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <OperationalWorkspace
      className="mx-auto w-full max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8"
      data-platform-organization-detail-page="true"
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
            href: "/platform/sessions",
            icon: "input",
            label: "Access History",
            variant: "secondary",
          },
        ]}
        description={`${formatPlan(organization.organization.plan)} organization created ${formatDate(organization.organization.createdAt)}.`}
        eyebrow="Organization"
        status={{
          icon: organization.alerts.length ? "warning" : "check_circle",
          label: alertStatus,
          tone: organization.alerts.length ? "ember" : "success",
        }}
        title={organization.organization.name}
      />

      <OperationalMetricStrip
        metrics={[
          {
            icon: "group",
            label: "Members",
            tone: "muted",
            value: organization.summary.members,
          },
          {
            icon: "admin_panel_settings",
            label: "Admins",
            tone: organization.summary.admins ? "success" : "danger",
            value: organization.summary.admins,
          },
          {
            icon: "fact_check",
            label: "Reviewed calls",
            tone: "gold",
            value: organization.callStats.reviewedCalls,
          },
          {
            icon: "pending",
            label: "Processing",
            tone: organization.callStats.processingCalls ? "ember" : "muted",
            value: organization.callStats.processingCalls,
          },
        ]}
      />

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ForgeSurface className="min-w-0 p-4" data-platform-org-health="true" variant="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="forge-page-eyebrow">Health</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">
                Agency alerts
              </h2>
            </div>
            <ForgeChip tone={organization.alerts.length ? "ember" : "success"}>
              {alertStatus}
            </ForgeChip>
          </div>

          {organization.alerts.length ? (
            <div className="mt-4 grid gap-2">
              {organization.alerts.map((alert) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2"
                  key={alert.label}
                >
                  <span className="text-sm text-[var(--forge-text)]">{alert.label}</span>
                  <ForgeChip tone={alert.severity === "critical" ? "danger" : "ember"}>
                    {alert.severity}
                  </ForgeChip>
                </div>
              ))}
            </div>
          ) : (
            <ForgeEmptyState
              className="mt-4"
              description="No agency alerts are active for this Organization."
              icon="check_circle"
              title="No active alerts"
            />
          )}
        </ForgeSurface>

        <ForgeSurface className="p-4" data-platform-org-billing="true" variant="panel">
          <p className="forge-page-eyebrow">Billing</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Plan ops</h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <DetailRow label="Plan" value={formatPlan(organization.organization.plan)} />
            <DetailRow
              label="Active subscriptions"
              value={String(organization.billing.activeSubscriptionCount)}
            />
            <DetailRow label="Seats" value={String(organization.billing.seats)} />
            <DetailRow
              label="Pending invites"
              value={String(organization.summary.pendingInvites)}
            />
            <DetailRow
              label="Training"
              value={formatPercent(organization.summary.trainingCompletionRate)}
            />
          </dl>
        </ForgeSurface>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-2">
        <ForgeSurface className="min-w-0 p-4" data-platform-org-access="true" variant="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="forge-page-eyebrow">Access</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">
                Recent agency access
              </h2>
            </div>
            <ForgeButton href="/platform/sessions" icon="input" size="sm" variant="secondary">
              Access History
            </ForgeButton>
          </div>

          {organization.access.recentSessions.length ? (
            <ForgeManagementTable className="mt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {organization.access.recentSessions.map((session) => {
                    const status = formatAccessSessionStatus(session);

                    return (
                      <tr key={session.id}>
                        <td className="px-4 py-3 text-[var(--forge-text)]">
                          {session.staffEmailSnapshot}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-[var(--forge-muted)]">
                          <span className="line-clamp-2">{session.reason}</span>
                        </td>
                        <td className="px-4 py-3">
                          <ForgeChip tone={status === "active" ? "cyan" : "muted"}>
                            {status}
                          </ForgeChip>
                        </td>
                        <td className="px-4 py-3 text-[var(--forge-muted)]">
                          {formatDate(session.startedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ForgeManagementTable>
          ) : (
            <ForgeEmptyState
              className="mt-4"
              description="No agency access has been recorded for this Organization."
              icon="lock"
              title="No recent agency access"
            />
          )}
        </ForgeSurface>

        <ForgeSurface className="min-w-0 p-4" data-platform-org-audit="true" variant="panel">
          <div>
            <p className="forge-page-eyebrow">Audit</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Audit events</h2>
          </div>

          {organization.auditEvents.length ? (
            <ForgeManagementTable className="mt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {organization.auditEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3 font-semibold text-[var(--forge-text)]">
                        {event.action}
                      </td>
                      <td className="px-4 py-3 text-[var(--forge-muted)]">
                        {event.staffEmailSnapshot ?? "System"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-[var(--forge-muted)]">
                        <span className="line-clamp-2">{event.reason}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--forge-muted)]">
                        {formatDate(event.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ForgeManagementTable>
          ) : (
            <ForgeEmptyState
              className="mt-4"
              description="No agency audit events have been recorded for this Organization."
              icon="history"
              title="No audit events"
            />
          )}
        </ForgeSurface>
      </section>

      <ForgeSurface
        className="min-w-0 border-[color-mix(in_srgb,var(--forge-danger)_28%,var(--forge-border))] p-4"
        data-platform-organization-archive={organization.organization.id}
        variant="panel"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="forge-page-eyebrow">Danger zone</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">
              Archive organization
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--forge-muted)]">
              Archive this organization, detach its users, and preserve its calls, billing,
              integrations, and audit history.
            </p>
          </div>
          <ForgeChip tone={isArchived ? "muted" : "danger"}>
            {isArchived ? "Archived" : "Active"}
          </ForgeChip>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
            Reason
            <input
              className="min-h-10 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
              disabled={isArchived || isArchiving}
              onChange={(event) => setReason(event.currentTarget.value)}
              placeholder="Duplicate workspace"
              value={reason}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
            Type slug to confirm
            <input
              className="min-h-10 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
              disabled={isArchived || isArchiving}
              onChange={(event) => setConfirmationSlug(event.currentTarget.value)}
              placeholder={organization.organization.slug}
              value={confirmationSlug}
            />
          </label>
          <button
            className="forge-button forge-button-primary forge-focus-ring min-h-10 rounded-lg px-4 py-2 text-sm"
            disabled={
              isArchived ||
              isArchiving ||
              !reason.trim() ||
              confirmationSlug.trim() !== organization.organization.slug
            }
            onClick={archiveOrganization}
            type="button"
          >
            Archive organization
          </button>
        </div>
        {archiveMessage ? (
          <p className="mt-3 text-sm text-[var(--forge-muted)]" role="status">
            {archiveMessage}
          </p>
        ) : null}
      </ForgeSurface>
    </OperationalWorkspace>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--forge-muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--forge-text)]">{value}</dd>
    </div>
  );
}
