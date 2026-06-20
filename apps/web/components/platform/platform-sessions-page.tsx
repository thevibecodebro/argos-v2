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
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  submitEndSession,
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
  recentSessions,
}: PlatformSessionsPageProps) {
  const [session, setSession] = useState(activeSession);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);

  async function handleEndSession() {
    setSessionStatus(null);
    setIsEndingSession(true);

    try {
      await submitEndSession(fetch);
      setSession(null);
      setSessionStatus("Back in Agency.");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to return to Agency");
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
        description="Review automatic Organization access and Agency audit events."
        status={{
          icon: session ? "input" : "lock",
          label: session ? "Organization open" : "No Organization open",
          tone: session ? "cyan" : "muted",
        }}
        title="Access History"
      />

      {session ? (
        <ForgeSurface
          className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
          data-platform-active-session="true"
          variant="panel"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ForgeChip icon="input" tone="cyan">Active Organization access</ForgeChip>
              <span className="truncate text-sm font-semibold text-[var(--forge-text)]">
                {session.targetOrgName}
              </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[var(--forge-muted)]">
              Reason: {session.reason} · Expires {formatDate(session.expiresAt)}
            </p>
            {sessionStatus ? (
              <p className="mt-2 text-sm text-[var(--forge-muted)]">{sessionStatus}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <ForgeButton href="/dashboard" icon="open_in_new" size="sm" variant="primary">
              Open Organization
            </ForgeButton>
            <ForgeButton
              disabled={isEndingSession}
              icon="logout"
              onClick={handleEndSession}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isEndingSession ? "Returning" : "Back to Agency"}
            </ForgeButton>
          </div>
        </ForgeSurface>
      ) : null}

      <section className="grid min-w-0 gap-3">
        <div className="grid min-w-0 gap-3">
          <ForgeSurface className="p-4" variant="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="forge-page-eyebrow">Access trail</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Recent access</h2>
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
                description="Organization access records appear here automatically."
                icon="history"
                title="No recent access"
              />
            )}
          </ForgeSurface>

          <ForgeSurface className="p-4" data-platform-audit-events="true" variant="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="forge-page-eyebrow">Agency audit</p>
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
                description="Agency actions such as Organization creation and access changes appear here."
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
