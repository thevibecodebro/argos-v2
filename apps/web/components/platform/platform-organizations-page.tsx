"use client";

import styles from "./platform-console.module.css";

import { useState } from "react";
import { cn } from "@argos-v2/ui";
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
import {
  PLATFORM_SESSION_ENDPOINT,
  submitCreateSession,
  submitEndSession,
  toActiveSession,
} from "./platform-console-actions";
import { formatDate, formatPlan } from "./platform-format";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "./platform-types";

type PlatformOrganizationsPageProps = {
  activeSession: PlatformConsoleActiveSession | null;
  organizations: PlatformConsoleOrganization[];
  query: string;
  statusFilter?: "active" | "archived" | "all";
};

export function PlatformOrganizationsPage({
  activeSession,
  organizations,
  query,
  statusFilter = "active",
}: PlatformOrganizationsPageProps) {
  const [session, setSession] = useState(activeSession);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);

  async function handleOpenOrganization(organization: PlatformConsoleOrganization) {
    setSessionStatus(null);
    setSwitchingOrgId(organization.id);

    const formData = new FormData();
    formData.set("orgId", organization.id);

    try {
      const data = await submitCreateSession(fetch, formData, organization.id);
      setSession(toActiveSession(data, organizations));
      setSessionStatus("Opening Organization.");
      window.location.assign("/dashboard");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to open Organization");
    } finally {
      setSwitchingOrgId(null);
    }
  }

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
      className={`${styles.workspace} mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8`}
      data-platform-organizations-page="true"
    >
      <OperationalToolbar
        actions={[
          {
            href: "/platform/organizations/new",
            icon: "add_business",
            label: "Create organization",
            variant: "primary",
          },
          {
            href: "/platform/sessions",
            icon: "input",
            label: "Access History",
            variant: "secondary",
          },
        ]}
        description="Find an Organization and open audited access when needed."
        status={{ icon: "business", label: `${organizations.length} visible`, tone: "muted" }}
        title="Organizations"
      />

      {session ? (
        <section
          className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
          data-platform-active-session="true"
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
        </section>
      ) : null}

      {sessionStatus ? (
        <p role="status" className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
          {sessionStatus}
        </p>
      ) : null}

      <section className="grid min-w-0 gap-3">
        <section
          className={styles.section}
          data-platform-primary-table="organizations"
          data-platform-session-endpoint={PLATFORM_SESSION_ENDPOINT}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Organization status" className="flex flex-wrap gap-2" data-platform-organization-status-filters="true">
              {(["active", "archived", "all"] as const).map((status) => (
                <a
                  className={
                    statusFilter === status
                      ? "forge-button forge-button-primary forge-focus-ring min-h-11 min-w-0 rounded-md px-3 py-2 text-xs"
                      : "forge-button forge-button-ghost forge-focus-ring min-h-11 min-w-0 rounded-md px-3 py-2 text-xs"
                  }
                  aria-current={statusFilter === status ? "page" : undefined}
                  data-platform-organization-status-filter={status}
                  href={buildStatusHref(status, query)}
                  key={status}
                >
                  {status === "all" ? "All" : status === "archived" ? "Archived" : "Active"}
                </a>
              ))}
            </nav>
            <form
              action="/platform/organizations"
              className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row lg:flex-initial"
              data-platform-organization-filters="true"
              method="get"
            >
              <input name="status" type="hidden" value={statusFilter} />
              <label className="sr-only" htmlFor="platform-org-search">Search organizations</label>
              <input
                className="min-h-11 min-w-0 w-full rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 sm:flex-1"
                defaultValue={query}
                id="platform-org-search"
                name="q"
                placeholder="Search organizations"
              />
              <ForgeButton className="shrink-0" icon="search" size="sm" type="submit" variant="secondary">
                Search
              </ForgeButton>
            </form>
          </div>

          {organizations.length ? (
            <ForgeManagementTable
              className="mt-4"
              mobileCards={
                <ForgeMobileTableCards className={styles.mobileRows}>
                  {organizations.map((org) => (
                    <article
                      className={cn(
                        "w-full text-left",
                        isActiveOrganization(session, org) && "border-[color-mix(in_srgb,var(--forge-cyan)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-cyan)_6%,transparent)]",
                      )}
                      key={`${org.id}:mobile`}
                    >
                      <a className={styles.rowAction} href={`/platform/organizations/${encodeURIComponent(org.slug)}`}>
                        {org.name}
                      </a>
                      <p className="mt-1 text-xs text-[var(--forge-muted)]">{org.slug}</p>
                      <dl className={styles.recordDetails}>
                        <div><dt>Created</dt><dd>{formatDate(org.createdAt)}</dd></div>
                      </dl>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <ForgeChip tone="gold">{formatPlan(org.plan)}</ForgeChip>
                        <OpenOrganizationAction
                          isActive={isActiveOrganization(session, org)}
                          isArchived={org.status === "archived"}
                          isOpening={switchingOrgId === org.id}
                          onOpen={() => handleOpenOrganization(org)}
                          organizationId={org.id}
                        />
                      </div>
                    </article>
                  ))}
                </ForgeMobileTableCards>
              }
            >
              <table className="w-full table-fixed text-left text-sm">
                <thead className="text-[11px] font-semibold text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {organizations.map((org) => (
                    <tr
                      className={cn(
                        "transition-colors",
                        isActiveOrganization(session, org) && "bg-[color-mix(in_srgb,var(--forge-cyan)_5%,transparent)]",
                      )}
                      key={org.id}
                    >
                      <td className="px-4 py-3">
                        <a
                          className="block break-words font-semibold text-[var(--forge-text)] transition hover:text-[var(--forge-cyan)]"
                          href={`/platform/organizations/${encodeURIComponent(org.slug)}`}
                        >
                          {org.name}
                        </a>
                        <p className="mt-1 break-words text-xs text-[var(--forge-muted)]">{org.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ForgeChip tone="gold">{formatPlan(org.plan)}</ForgeChip>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--forge-muted)]">
                        {formatDate(org.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <OpenOrganizationAction
                          isActive={isActiveOrganization(session, org)}
                          isArchived={org.status === "archived"}
                          isOpening={switchingOrgId === org.id}
                          onOpen={() => handleOpenOrganization(org)}
                          organizationId={org.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ForgeManagementTable>
          ) : (
            <ForgeEmptyState
              className="mt-4"
              description={
                query
                  ? `No organizations found for "${query}".`
                  : "Create the first customer Organization from Agency."
              }
              icon="business"
              title="No organizations found"
            />
          )}
        </section>
      </section>
    </OperationalWorkspace>
  );
}

function buildStatusHref(status: "active" | "archived" | "all", query: string) {
  const params = new URLSearchParams();

  if (status !== "active") {
    params.set("status", status);
  }

  if (query) {
    params.set("q", query);
  }

  const search = params.toString();
  return search ? `/platform/organizations?${search}` : "/platform/organizations";
}

function isActiveOrganization(
  session: PlatformConsoleActiveSession | null,
  organization: PlatformConsoleOrganization,
) {
  return session?.targetOrgId === organization.id || session?.targetOrgSlug === organization.slug;
}

function OpenOrganizationAction({
  isActive,
  isArchived,
  isOpening,
  onOpen,
  organizationId,
}: {
  isActive: boolean;
  isArchived: boolean;
  isOpening: boolean;
  onOpen: () => void;
  organizationId: string;
}) {
  const className = styles.rowAction;

  if (isActive) {
    return (
      <a
        className={className}
        data-platform-open-organization={organizationId}
        href="/dashboard"
      >
        Open Organization
      </a>
    );
  }

  if (isArchived) {
    return (
      <span
        className="text-xs font-semibold text-[var(--forge-muted)]"
        data-platform-open-organization={organizationId}
      >
        Archived
      </span>
    );
  }

  return (
    <button
      className={className}
      data-platform-open-organization={organizationId}
      disabled={isOpening}
      onClick={onOpen}
      type="button"
    >
      {isOpening ? "Opening" : "Open Organization"}
    </button>
  );
}
