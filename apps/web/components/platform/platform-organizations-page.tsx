"use client";

import { useState } from "react";
import { cn } from "@argos-v2/ui";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeManagementTable,
  ForgeMobileTableCards,
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
import { formatDate, formatPlan } from "./platform-format";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "./platform-types";

type PlatformOrganizationsPageProps = {
  activeSession: PlatformConsoleActiveSession | null;
  organizations: PlatformConsoleOrganization[];
  query: string;
};

export function PlatformOrganizationsPage({
  activeSession,
  organizations,
  query,
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
      className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8"
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

      {sessionStatus ? (
        <p className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
          {sessionStatus}
        </p>
      ) : null}

      <section className="grid min-w-0 gap-3">
        <ForgeSurface
          className="min-w-0 p-4"
          data-platform-primary-table="organizations"
          data-platform-session-endpoint={PLATFORM_SESSION_ENDPOINT}
          variant="panel"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="forge-page-eyebrow">Organization list</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Organizations</h2>
            </div>
            <form
              action="/platform/organizations"
              className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row lg:flex-initial"
              data-platform-organization-filters="true"
              method="get"
            >
              <label className="sr-only" htmlFor="platform-org-search">Search organizations</label>
              <input
                className="min-h-10 w-full rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                defaultValue={query}
                id="platform-org-search"
                name="q"
                placeholder="Search organizations"
              />
              <ForgeButton icon="search" size="sm" type="submit" variant="secondary">
                Search
              </ForgeButton>
            </form>
          </div>

          {organizations.length ? (
            <ForgeManagementTable
              className="mt-4"
              mobileCards={
                <ForgeMobileTableCards>
                  {organizations.map((org) => (
                    <article
                      className={cn(
                        "w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4 text-left transition hover:border-[color-mix(in_srgb,var(--forge-gold)_32%,transparent)]",
                        isActiveOrganization(session, org) && "border-[color-mix(in_srgb,var(--forge-cyan)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-cyan)_6%,transparent)]",
                      )}
                      key={`${org.id}:mobile`}
                    >
                      <p className="truncate text-sm font-semibold text-[var(--forge-text)]">{org.name}</p>
                      <p className="mt-1 truncate text-sm text-[var(--forge-muted)]">{org.slug}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <ForgeChip tone="gold">{formatPlan(org.plan)}</ForgeChip>
                        <OpenOrganizationAction
                          isActive={isActiveOrganization(session, org)}
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
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
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
                          className="block truncate font-semibold text-[var(--forge-text)] transition hover:text-[var(--forge-cyan)]"
                          href={`/platform/organizations/${encodeURIComponent(org.slug)}`}
                        >
                          {org.name}
                        </a>
                        <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">{org.slug}</p>
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
        </ForgeSurface>
      </section>
    </OperationalWorkspace>
  );
}

function isActiveOrganization(
  session: PlatformConsoleActiveSession | null,
  organization: PlatformConsoleOrganization,
) {
  return session?.targetOrgId === organization.id || session?.targetOrgSlug === organization.slug;
}

function OpenOrganizationAction({
  isActive,
  isOpening,
  onOpen,
  organizationId,
}: {
  isActive: boolean;
  isOpening: boolean;
  onOpen: () => void;
  organizationId: string;
}) {
  const className =
    "text-xs font-semibold uppercase tracking-[0.12em] text-[var(--forge-cyan)] transition hover:text-[var(--forge-gold)] disabled:text-[var(--forge-muted)]";

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
