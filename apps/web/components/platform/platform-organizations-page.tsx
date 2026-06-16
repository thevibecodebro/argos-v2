"use client";

import { useState, type FormEvent } from "react";
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
  OperationalPreviewDrawer,
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
  const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id ?? "");
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const selectedOrganization = organizations.find((org) => org.id === selectedOrgId) ?? organizations[0] ?? null;

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionStatus(null);
    setIsSwitching(true);

    const formData = new FormData(event.currentTarget);

    try {
      const data = await submitCreateSession(fetch, formData, selectedOrganization?.id ?? null);
      setSession(toActiveSession(data, organizations));
      setSessionStatus("Session active. Open the workspace to operate as org admin.");
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
            label: "Sessions",
            variant: "secondary",
          },
        ]}
        description="Find a customer workspace and start audited access when needed."
        eyebrow="Platform"
        status={{ icon: "business", label: `${organizations.length} visible`, tone: "muted" }}
        title="Organizations"
      />

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ForgeSurface
          className="min-w-0 p-4"
          data-platform-primary-table="organizations"
          data-platform-selected-organization={selectedOrganization?.id ?? "none"}
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
                    <button
                      className={cn(
                        "w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4 text-left transition hover:border-[rgba(241,191,123,0.32)]",
                        selectedOrgId === org.id && "border-[rgba(241,191,123,0.44)] bg-[rgba(241,191,123,0.07)]",
                      )}
                      key={`${org.id}:mobile`}
                      onClick={() => setSelectedOrgId(org.id)}
                      type="button"
                    >
                      <p className="truncate text-sm font-semibold text-[var(--forge-text)]">{org.name}</p>
                      <p className="mt-1 truncate text-sm text-[var(--forge-muted)]">{org.slug}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <ForgeChip tone="gold">{formatPlan(org.plan)}</ForgeChip>
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--forge-cyan)]">
                          {selectedOrgId === org.id ? "Selected" : "Select"}
                        </span>
                      </div>
                    </button>
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
                    <th className="px-4 py-3 text-right">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {organizations.map((org) => (
                    <tr
                      className={cn(
                        "transition-colors",
                        selectedOrgId === org.id && "bg-[rgba(241,191,123,0.055)]",
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
                        <button
                          className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--forge-cyan)] disabled:text-[var(--forge-muted)]"
                          disabled={selectedOrgId === org.id}
                          onClick={() => setSelectedOrgId(org.id)}
                          type="button"
                        >
                          {selectedOrgId === org.id ? "Selected" : "Select"}
                        </button>
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
                  : "Create the first customer organization from the platform workspace."
              }
              icon="business"
              title="No organizations found"
            />
          )}
        </ForgeSurface>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          {selectedOrganization ? (
            <OperationalPreviewDrawer
              actions={[
                {
                  href: `/platform/organizations/${encodeURIComponent(selectedOrganization.slug)}`,
                  icon: "open_in_new",
                  label: "Open detail",
                  variant: "primary",
                },
                {
                  href: "/platform/sessions",
                  icon: "input",
                  label: "View sessions",
                  variant: "secondary",
                },
              ]}
              description="Use audited access when you need to operate inside this workspace."
              eyebrow="Selected organization"
              title={selectedOrganization.name}
            >
              <div className="grid gap-2 text-sm">
                <PlatformDetailRow label="Slug" value={selectedOrganization.slug} />
                <PlatformDetailRow label="Plan" value={formatPlan(selectedOrganization.plan)} />
                <PlatformDetailRow label="Created" value={formatDate(selectedOrganization.createdAt)} />
                <PlatformDetailRow
                  label="Session"
                  value={
                    session?.targetOrgId === selectedOrganization.id ||
                    session?.targetOrgSlug === selectedOrganization.slug
                      ? "Active"
                      : "Not active"
                  }
                />
              </div>
            </OperationalPreviewDrawer>
          ) : null}

          <ForgeSurface className="p-4" variant="panel">
            <p className="forge-page-eyebrow">Audited access</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Start session</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">
              Record why you need access before entering the organization workspace.
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
                    {isEndingSession ? "Ending" : "Back to platform"}
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
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Reason
                <textarea
                  className="min-h-24 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  name="reason"
                  required
                />
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
                {isSwitching ? "Starting session" : "Start session"}
              </ForgeButton>
            </form>
          </ForgeSurface>
        </aside>
      </section>
    </OperationalWorkspace>
  );
}

function PlatformDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="truncate font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
