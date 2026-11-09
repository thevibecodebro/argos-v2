"use client";

import styles from "./platform-console.module.css";

import { useState } from "react";
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
import type { PlatformOrganizationDetailSnapshot } from "@/lib/platform/organization-detail";
import {
  INTERO_PRACTICE_PILOT_CAPABILITIES,
  type ManagedCapabilityKey,
} from "@/lib/access/managed-capabilities";
import {
  buildCoachingAccessEndpoint,
  buildResendAdminInviteEndpoint,
  submitArchiveOrganization,
  submitCoachingAccess,
  submitResendAdminInvite,
} from "./platform-console-actions";
import { formatAccessSessionStatus, formatDate, formatPercent, formatPlan } from "./platform-format";

type PlatformOrganizationDetailPageProps = {
  organization: PlatformOrganizationDetailSnapshot;
};

const MANAGED_CAPABILITY_OPTIONS: {
  description: string;
  key: ManagedCapabilityKey;
  label: string;
}[] = [
  { key: "training", label: "Training", description: "Training modules and assignments" },
  { key: "roleplay", label: "Roleplay", description: "Practice sessions and history" },
  { key: "roleplay_voice", label: "Voice roleplay", description: "Realtime voice and speech generation" },
  { key: "custom_scenarios", label: "Custom scenarios", description: "Organization-specific practice scenarios" },
  { key: "team_rubrics", label: "Team rubrics", description: "Different rubrics by department or team" },
  { key: "practice_reporting", label: "Practice reporting", description: "Training and roleplay progress reporting" },
  { key: "call_upload", label: "Call upload", description: "Manual recording uploads" },
  { key: "call_ingestion", label: "Call ingestion", description: "Automated recording imports" },
  { key: "call_scoring", label: "Call scoring", description: "AI scoring and call review" },
  { key: "highlights", label: "Highlights", description: "Saved call moments and clips" },
  { key: "call_analytics", label: "Call analytics", description: "Call score trends and reporting" },
  { key: "leaderboard", label: "Leaderboard", description: "Team call performance rankings" },
  { key: "integration_google_meet", label: "Google Meet", description: "Google Meet ingestion integration" },
  { key: "integration_ghl", label: "GoHighLevel", description: "GoHighLevel ingestion integration" },
  { key: "integration_zoom", label: "Zoom", description: "Zoom ingestion integration" },
  { key: "workspace_branding", label: "Workspace branding", description: "Logo and theme controls" },
];

export function PlatformOrganizationDetailPage({
  organization,
}: PlatformOrganizationDetailPageProps) {
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [reason, setReason] = useState("");
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const alertStatus = organization.alerts.length
    ? `${organization.alerts.length} alerts`
    : "Healthy";
  const isArchived = organization.organization.status === "archived";

  async function resendAdminInvite() {
    setResendMessage(null);
    setIsResendingInvite(true);

    try {
      const result = await submitResendAdminInvite(fetch, organization.organization.slug);
      setResendMessage(`Invite resent to ${result.invite.email}.`);
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : "Unable to resend admin invite.");
    } finally {
      setIsResendingInvite(false);
    }
  }

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
      className={`${styles.workspace} mx-auto w-full max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8`}
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
        status={{
          icon: organization.alerts.length ? "warning" : "check_circle",
          label: alertStatus,
          tone: organization.alerts.length ? "ember" : "success",
        }}
        title={organization.organization.name}
      />

      {organization.adminInviteResend ? (
        <section
          className={styles.section}
          data-platform-admin-invite-resend="true"
          data-platform-admin-invite-resend-endpoint={buildResendAdminInviteEndpoint(
            organization.organization.slug,
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className={styles.sectionTitle}>
                Initial admin has not accepted yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
                Pending invite for {organization.adminInviteResend.email} expires{" "}
                {formatDate(organization.adminInviteResend.expiresAt)}.
              </p>
            </div>
            <ForgeButton
              disabled={isArchived || isResendingInvite}
              icon="mark_email_read"
              onClick={resendAdminInvite}
              size="sm"
              type="button"
              variant="primary"
            >
              {isResendingInvite ? "Resending" : "Resend admin invite"}
            </ForgeButton>
          </div>
          {resendMessage ? (
            <p className="mt-3 text-sm text-[var(--forge-muted)]" role="status">
              {resendMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <CoachingAccessPanel organization={organization} />

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className={styles.section} data-platform-org-health="true">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={styles.sectionTitle}>
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
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] py-3"
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
        </section>

        <section className={styles.section} data-platform-org-billing="true">
          <h2 className={styles.sectionTitle}>Billing</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailRow label="Members" value={String(organization.summary.members)} />
            <DetailRow label="Admins" value={String(organization.summary.admins)} />
            <DetailRow label="Reviewed calls" value={String(organization.callStats.reviewedCalls)} />
            <DetailRow label="Processing" value={String(organization.callStats.processingCalls)} />
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
        </section>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-2">
        <section className={styles.section} data-platform-org-access="true">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={styles.sectionTitle}>
                Recent agency access
              </h2>
            </div>
            <ForgeButton href="/platform/sessions" icon="input" size="sm" variant="secondary">
              Access History
            </ForgeButton>
          </div>

          {organization.access.recentSessions.length ? (
            <ForgeManagementTable className="mt-4" mobileCards={
              <ForgeMobileTableCards className={styles.mobileRows}>
                {organization.access.recentSessions.map((session) => {
                  const status = formatAccessSessionStatus(session);
                  return (
                    <article key={session.id}>
                      <p className="text-sm font-semibold">{session.staffEmailSnapshot}</p>
                      <dl className={styles.recordDetails}>
                        <div><dt>Reason</dt><dd>{session.reason}</dd></div>
                        <div><dt>Status</dt><dd><ForgeChip tone={status === "active" ? "cyan" : "muted"}>{status}</ForgeChip></dd></div>
                        <div><dt>Started</dt><dd>{formatDate(session.startedAt)}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </ForgeMobileTableCards>
            }>
              <table className="w-full table-fixed text-left text-sm">
                <thead className="text-[11px] font-semibold text-[var(--forge-muted)]">
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
                          <span className="break-words">{session.reason}</span>
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
        </section>

        <section className={styles.section} data-platform-org-audit="true">
          <div>
            <h2 className={styles.sectionTitle}>Audit events</h2>
          </div>

          {organization.auditEvents.length ? (
            <ForgeManagementTable className="mt-4" mobileCards={
              <ForgeMobileTableCards className={styles.mobileRows}>
                {organization.auditEvents.map((event) => (
                  <article key={event.id}>
                    <p className="text-sm font-semibold">{event.action}</p>
                    <dl className={styles.recordDetails}>
                      <div><dt>Staff</dt><dd>{event.staffEmailSnapshot ?? "System"}</dd></div>
                      <div><dt>Reason</dt><dd>{event.reason}</dd></div>
                      <div><dt>Created</dt><dd>{formatDate(event.createdAt)}</dd></div>
                    </dl>
                  </article>
                ))}
              </ForgeMobileTableCards>
            }>
              <table className="w-full table-fixed text-left text-sm">
                <thead className="text-[11px] font-semibold text-[var(--forge-muted)]">
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
                        <span className="break-words">{event.reason}</span>
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
        </section>
      </section>

      <section
        className={`${styles.section} ${styles.archive}`}
        data-platform-organization-archive={organization.organization.id}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className={styles.sectionTitle}>
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
              className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
              disabled={isArchived || isArchiving}
              onChange={(event) => setReason(event.currentTarget.value)}
              placeholder="Duplicate workspace"
              value={reason}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
            Type slug to confirm
            <input
              className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
              disabled={isArchived || isArchiving}
              onChange={(event) => setConfirmationSlug(event.currentTarget.value)}
              placeholder={organization.organization.slug}
              value={confirmationSlug}
            />
          </label>
          <button
            className="forge-button forge-button-primary forge-focus-ring min-h-11 min-w-0 rounded-md px-4 py-2 text-sm"
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
      </section>
    </OperationalWorkspace>
  );
}

function CoachingAccessPanel({
  organization,
}: {
  organization: PlatformOrganizationDetailSnapshot;
}) {
  const grant = organization.coachingAccess;
  const [packageName, setPackageName] = useState<"solo" | "team">(
    grant?.package ?? "team",
  );
  const [seatLimit, setSeatLimit] = useState(String(grant?.seatLimit ?? 2));
  const [startsAt, setStartsAt] = useState(grant?.startsAt.slice(0, 10) ?? "");
  const [endsAt, setEndsAt] = useState(grant?.endsAt.slice(0, 10) ?? "");
  const [contractReference, setContractReference] = useState(
    grant?.contractReference ?? "",
  );
  const [notes, setNotes] = useState(grant?.notes ?? "");
  const [capabilities, setCapabilities] = useState<ManagedCapabilityKey[]>(
    grant?.capabilities ?? [...INTERO_PRACTICE_PILOT_CAPABILITIES],
  );
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasStripeAccess = organization.billing.activeSubscriptionCount > 0;
  const canReactivate = grant?.status === "paused" && !hasStripeAccess;
  const isEnterprise =
    organization.organization.plan.trim().toLowerCase() === "enterprise";

  async function mutate(action: "pause" | "reactivate" | "revoke" | "save") {
    setMessage(null);
    setIsSaving(true);

    try {
      const result = await submitCoachingAccess(
        fetch,
        organization.organization.slug,
        action === "save"
          ? {
              action,
              capabilities,
              contractReference,
              endsAt,
              expectedVersion: grant?.version ?? 0,
              notes,
              package: packageName,
              reason,
              seatLimit: Number(seatLimit),
              startsAt,
            }
          : { action, expectedVersion: grant?.version ?? 0, reason },
      );
      setMessage(
        action === "save"
          ? "Managed access saved."
          : `Managed access ${result.grant.status}.`,
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update managed access.");
      setIsSaving(false);
    }
  }

  return (
    <section
      className={styles.section}
      data-platform-coaching-access={grant?.status ?? "none"}
      data-platform-coaching-access-endpoint={buildCoachingAccessEndpoint(
        organization.organization.slug,
      )}

    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className={styles.sectionTitle}>
            Managed feature access
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--forge-muted)]">
            Contract-backed access is an explicit allow-list. Anything not selected is
            unavailable to this organization, and access ends automatically on the
            contract end date. Only Argos platform staff can change these settings;
            organization admins cannot view or edit them.
            {isEnterprise ? " Enterprise plans include unlimited live voice." : ""}
          </p>
        </div>
        <ForgeChip
          tone={
            grant?.status === "active"
              ? "success"
              : grant?.status === "paused"
                ? "ember"
                : "muted"
          }
        >
          {grant ? grant.status : hasStripeAccess ? "Stripe active" : "Not configured"}
        </ForgeChip>
      </div>

      {hasStripeAccess ? (
        <p className="mt-3 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
          This organization has an active Stripe subscription. Cancel it before enabling
          managed access so the two entitlement sources cannot overlap.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
          Package
          <select
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving}
            onChange={(event) => {
              const value = event.currentTarget.value as "solo" | "team";
              setPackageName(value);
              if (value === "solo") setSeatLimit("1");
            }}
            value={packageName}
          >
            <option value="solo">Solo</option>
            <option value="team">Team</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
          Contract seats
          <input
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving || packageName === "solo"}
            min={packageName === "solo" ? 1 : 2}
            onChange={(event) => setSeatLimit(event.currentTarget.value)}
            type="number"
            value={seatLimit}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
          Starts
          <input
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving}
            onChange={(event) => setStartsAt(event.currentTarget.value)}
            type="date"
            value={startsAt}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
          Ends
          <input
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving}
            onChange={(event) => setEndsAt(event.currentTarget.value)}
            type="date"
            value={endsAt}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)] md:col-span-2">
          Contract reference
          <input
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving}
            onChange={(event) => setContractReference(event.currentTarget.value)}
            placeholder="Coaching agreement or CRM reference"
            value={contractReference}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)] md:col-span-2">
          Internal notes
          <input
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving}
            onChange={(event) => setNotes(event.currentTarget.value)}
            placeholder="Optional"
            value={notes}
          />
        </label>
      </div>

      <div className={styles.capabilities}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--forge-text)]">Enabled features</p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
              These controls are enforced server-side for managed organizations.
            </p>
          </div>
          <ForgeButton
            disabled={isSaving}
            onClick={() => setCapabilities([...INTERO_PRACTICE_PILOT_CAPABILITIES])}
            size="sm"
            type="button"
            variant="secondary"
          >
            Apply Intero practice pilot
          </ForgeButton>
        </div>
        <div className="mt-3 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
          {MANAGED_CAPABILITY_OPTIONS.map((option) => (
            <label
              className={styles.capability}
              key={option.key}
            >
              <input
                checked={capabilities.includes(option.key)}
                className="mt-1"
                disabled={isSaving}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;

                  setCapabilities((current) =>
                    checked
                      ? [...current, option.key]
                      : current.filter((key) => key !== option.key),
                  );
                }}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--forge-text)]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-[var(--forge-muted)]">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1 text-sm font-semibold text-[var(--forge-text)]">
          Audit reason
          <input
            className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 text-sm text-[var(--forge-text)] outline-none"
            disabled={isSaving}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="Intero pilot access approved"
            value={reason}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {grant?.status === "active" ? (
            <ForgeButton
              disabled={isSaving || !reason.trim()}
              onClick={() => mutate("pause")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Pause
            </ForgeButton>
          ) : null}
          {canReactivate ? (
            <ForgeButton
              disabled={isSaving || !reason.trim()}
              onClick={() => mutate("reactivate")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Reactivate
            </ForgeButton>
          ) : null}
          {grant && grant.status !== "revoked" ? (
            <ForgeButton
              disabled={isSaving || !reason.trim()}
              onClick={() => mutate("revoke")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Revoke
            </ForgeButton>
          ) : null}
          <ForgeButton
            disabled={
              isSaving ||
              hasStripeAccess ||
              !reason.trim() ||
              !contractReference.trim() ||
              !startsAt ||
              !endsAt
            }
            onClick={() => mutate("save")}
            size="sm"
            type="button"
            variant="primary"
          >
            {isSaving ? "Saving" : grant ? "Save managed access" : "Enable managed access"}
          </ForgeButton>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--forge-muted)]">
        Access model: {organization.organization.accessModel}. Revision: {grant?.version ?? 0}.
        {isEnterprise ? " Live voice usage: Unlimited." : ""}
      </p>
      {message ? (
        <p className="mt-2 text-sm text-[var(--forge-muted)]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--forge-muted)]">{label}</dt>
      <dd className="forge-tabular-nums text-right font-semibold text-[var(--forge-text)]">{value}</dd>
    </div>
  );
}
