"use client";

import { useState, type FormEvent } from "react";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeManagementTable,
  ForgeSurface,
} from "@/components/forge";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  PLATFORM_SESSION_ENDPOINT,
  submitCreateSession,
  submitEndSession,
  toActiveSession,
} from "./platform-console-actions";
import { formatAccessSessionStatus, formatDate } from "./platform-format";
import type {
  PlatformAuditEvent,
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
  PlatformRecentSession,
} from "./platform-types";

type PlatformSessionsPageProps = {
  activeSession: PlatformConsoleActiveSession | null;
  auditEvents: PlatformAuditEvent[];
  organizations: PlatformConsoleOrganization[];
  recentSessions: PlatformRecentSession[];
};

export function PlatformSessionsPage({
  activeSession,
  auditEvents,
  organizations,
  recentSessions,
}: PlatformSessionsPageProps) {
  const [session, setSession] = useState(activeSession);
  const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id ?? "");
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionStatus(null);
    setIsSwitching(true);

    const formData = new FormData(event.currentTarget);

    try {
      const data = await submitCreateSession(fetch, formData, selectedOrgId || null);
      setSession(toActiveSession(data, organizations));
      setSessionStatus("Opening organization workspace.");
      window.location.assign("/dashboard");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to start platform session");
    } finally {
      setIsSwitching(false);
    }
  }

  async function handleEndSession() {
    setSessionStatus(null);
    setIsEndingSession(true);

    try {
      await submitEndSession(fetch);
      setSession(null);
      setSessionStatus("Platform session ended.");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to end platform session");
    } finally {
      setIsEndingSession(false);
    }
  }

  return (
    <OperationalWorkspace
      className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8"
      data-platform-sessions-page="true"
    >
      <OperationalToolbar
        actions={[
          {
            href: "/platform/organizations",
            icon: "business",
            label: "Organizations",
            variant: "secondary",
          },
        ]}
        description="Start and review audited organization access."
        eyebrow="Platform"
        status={{
          icon: session ? "input" : "lock",
          label: session ? "Session active" : "No active session",
          tone: session ? "cyan" : "muted",
        }}
        title="Sessions"
      />

      <section className="grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ForgeSurface className="p-4" variant="panel">
          <p className="forge-page-eyebrow">Audited access</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Start session</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">
            Choose an organization and launch tenant view. Audit history is recorded automatically.
          </p>

          {session ? (
            <div
              className="mt-4 rounded-xl border border-[rgba(136,218,247,0.24)] bg-[rgba(136,218,247,0.06)] px-3 py-3"
              data-platform-active-session="true"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ForgeChip icon="input" tone="cyan">Active organization session</ForgeChip>
                <span className="truncate text-sm font-semibold text-[var(--forge-text)]">
                  {session.targetOrgName}
                </span>
              </div>
              <p className="mt-2 text-sm leading-5 text-[var(--forge-muted)]">
                Reason: {session.reason} · Expires {formatDate(session.expiresAt)}
              </p>
              <div className="mt-3 grid gap-2">
                <ForgeButton href="/dashboard" icon="open_in_new" size="sm" variant="primary">
                  Open workspace
                </ForgeButton>
                <ForgeButton
                  disabled={isEndingSession}
                  icon="logout"
                  onClick={handleEndSession}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {isEndingSession ? "Ending" : "End session"}
                </ForgeButton>
              </div>
            </div>
          ) : null}

          <form
            className="mt-4 grid gap-3"
            data-platform-session-endpoint={PLATFORM_SESSION_ENDPOINT}
            onSubmit={handleCreateSession}
          >
            <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
              Organization
              <select
                className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                disabled={!organizations.length}
                name="orgId"
                onChange={(event) => setSelectedOrgId(event.target.value)}
                value={selectedOrgId}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            {sessionStatus ? (
              <p className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
                {sessionStatus}
              </p>
            ) : null}
            <ForgeButton
              disabled={isSwitching || !organizations.length}
              icon="input"
              type="submit"
              variant="primary"
            >
              {isSwitching ? "Opening organization" : "Launch organization"}
            </ForgeButton>
          </form>
        </ForgeSurface>

        <div className="grid min-w-0 gap-3">
        <ForgeSurface className="p-4" variant="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="forge-page-eyebrow">Audit trail</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Recent sessions</h2>
            </div>
            <ForgeChip icon="history" tone="muted">
              {recentSessions.length} records
            </ForgeChip>
          </div>

          {recentSessions.length ? (
            <ForgeManagementTable className="mt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {recentSessions.map((record) => {
                    const status = formatAccessSessionStatus(record);

                    return (
                      <tr key={record.id}>
                        <td className="px-4 py-3">
                          <p className="truncate font-semibold text-[var(--forge-text)]">{record.targetOrgName}</p>
                          <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">{record.targetOrgSlug}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--forge-muted)]">
                          {record.staffEmailSnapshot ?? "unknown"}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs text-[var(--forge-muted)]">
                          <span className="line-clamp-2">{record.reason}</span>
                        </td>
                        <td className="px-4 py-3">
                          <ForgeChip tone={status === "active" ? "cyan" : "muted"}>
                            {status}
                          </ForgeChip>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--forge-muted)]">
                          {formatDate(record.startedAt)}
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
              description="Start a session from this page or an organization row to create the first audit record."
              icon="history"
              title="No recent sessions"
            />
          )}
        </ForgeSurface>

        <ForgeSurface className="p-4" data-platform-audit-events="true" variant="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="forge-page-eyebrow">Platform audit</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Audit events</h2>
            </div>
            <ForgeChip icon="history" tone="muted">
              {auditEvents.length} events
            </ForgeChip>
          </div>

          {auditEvents.length ? (
            <ForgeManagementTable className="mt-4">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[18%]" />
                  <col className="w-[28%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {auditEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="min-w-0 px-4 py-3">
                        <p className="truncate font-semibold text-[var(--forge-text)]">{event.action}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--forge-muted)]">
                        {event.staffEmailSnapshot ?? "unknown"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-[var(--forge-muted)]">
                        <span className="line-clamp-2">{event.reason}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ForgeChip tone="muted">{event.resourceType}</ForgeChip>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--forge-muted)]">
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
              description="Platform actions such as organization creation and session changes appear here."
              icon="history"
              title="No audit events"
            />
          )}
        </ForgeSurface>
        </div>
      </section>
    </OperationalWorkspace>
  );
}
