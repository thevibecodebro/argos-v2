"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "@/components/forge";
import {
  PLATFORM_SESSION_ENDPOINT,
  submitCreateSession,
  submitEndSession,
  toActiveSession,
} from "./platform-console-actions";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "./platform-types";

type PlatformOrganizationSwitcherProps = {
  activeSession: PlatformConsoleActiveSession | null;
  className?: string;
  collapsed?: boolean;
  organizationCount?: number;
  organizations: PlatformConsoleOrganization[];
};

export function PlatformOrganizationSwitcher({
  activeSession,
  className,
  collapsed = false,
  organizationCount,
  organizations,
}: PlatformOrganizationSwitcherProps) {
  const [session, setSession] = useState(activeSession);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  useEffect(() => {
    setSession(activeSession);
  }, [activeSession]);

  const filteredOrganizations = useMemo(() => {
    const query = organizationQuery.trim().toLowerCase();

    if (!query) {
      return organizations;
    }

    return organizations.filter((organization) => {
      const name = organization.name.toLowerCase();
      const slug = organization.slug.toLowerCase();
      const plan = organization.plan.toLowerCase();

      return name.includes(query) || slug.includes(query) || plan.includes(query);
    });
  }, [organizationQuery, organizations]);

  const activeOrganization =
    organizations.find(
      (organization) =>
        organization.id === session?.targetOrgId ||
        organization.slug === session?.targetOrgSlug,
    ) ?? null;

  async function handleLaunchOrganization(organization: PlatformConsoleOrganization) {
    setSessionStatus(null);
    setSwitchingOrgId(organization.id);

    const formData = new FormData();
    formData.set("orgId", organization.id);

    try {
      const data = await submitCreateSession(fetch, formData, organization.id);
      setSession(toActiveSession(data, organizations));
      window.location.assign("/dashboard");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to launch organization");
    } finally {
      setSwitchingOrgId(null);
    }
  }

  async function handleEndSession() {
    setSessionStatus(null);
    setSwitchingOrgId("ending");

    try {
      await submitEndSession(fetch);
      setSession(null);
      setSessionStatus("Organization session ended.");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to end organization session");
    } finally {
      setSwitchingOrgId(null);
    }
  }

  return (
    <details
      className={cn(
        "mb-4 rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-3",
        collapsed && "lg:sr-only",
        className,
      )}
      data-platform-organization-switcher="true"
    >
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <p className="font-[var(--font-display)] text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
          Platform
        </p>
        <p className="mt-1 font-[var(--font-display)] text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[var(--forge-muted)]">
          Switch organization
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
              {activeOrganization?.name ?? session?.targetOrgName ?? "Select organization"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--forge-muted)]">
              {session ? "Current organization" : `${organizationCount ?? organizations.length} organizations`}
            </p>
          </div>
          <ForgeIcon name="unfold_more" size={18} />
        </div>
      </summary>

      <div className="mt-3 border-t border-[var(--forge-border)] pt-3">
        <label className="sr-only" htmlFor="platform-organization-switch-search">
          Search organizations
        </label>
        <input
          className="min-h-9 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
          data-platform-organization-switcher-search="true"
          id="platform-organization-switch-search"
          onChange={(event) => setOrganizationQuery(event.target.value)}
          placeholder="Search organizations"
          type="search"
          value={organizationQuery}
        />
        <div
          className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1"
          data-platform-session-endpoint={PLATFORM_SESSION_ENDPOINT}
        >
          {filteredOrganizations.length ? (
            filteredOrganizations.map((organization) => {
              const isCurrent =
                organization.id === session?.targetOrgId ||
                organization.slug === session?.targetOrgSlug;

              return (
                <button
                  className={cn(
                    "w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-[rgba(241,191,123,0.28)] hover:bg-[rgba(241,191,123,0.06)]",
                    isCurrent && "border-[rgba(136,218,247,0.22)] bg-[rgba(136,218,247,0.06)]",
                  )}
                  data-platform-organization-option={organization.id}
                  disabled={switchingOrgId !== null}
                  key={organization.id}
                  onClick={() => handleLaunchOrganization(organization)}
                  type="button"
                >
                  <span className="block truncate text-sm font-semibold text-[var(--forge-text)]">
                    {organization.name}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-[var(--forge-muted)]">
                    <span className="truncate">{organization.slug}</span>
                    <span className="shrink-0 font-semibold uppercase tracking-[0.1em] text-[var(--forge-cyan)]">
                      {switchingOrgId === organization.id
                        ? "Opening"
                        : isCurrent
                          ? "Current"
                          : "Switch"}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-xs text-[var(--forge-muted)]">
              No organizations match this search.
            </p>
          )}
        </div>
        {session ? (
          <div className="mt-2 grid gap-2">
            <a
              className="forge-nav-link flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em]"
              href="/dashboard"
            >
              <ForgeIcon name="open_in_new" size={16} />
              Open workspace
            </a>
            <button
              className="rounded-xl border border-[var(--forge-border-strong)]/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--forge-muted)] transition hover:text-[var(--forge-text)] disabled:opacity-60"
              disabled={switchingOrgId !== null}
              onClick={handleEndSession}
              type="button"
            >
              {switchingOrgId === "ending" ? "Ending session" : "End session"}
            </button>
          </div>
        ) : null}
        {sessionStatus ? (
          <p className="mt-2 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-xs text-[var(--forge-muted)]">
            {sessionStatus}
          </p>
        ) : null}
      </div>
    </details>
  );
}
