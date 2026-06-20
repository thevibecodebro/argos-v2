"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function initialOf(value: string | null | undefined): string {
  return value?.trim().charAt(0).toUpperCase() || "A";
}

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
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(activeSession);
  }, [activeSession]);

  useEffect(() => {
    if (!switcherOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && switcherRef.current?.contains(target)) {
        return;
      }

      setSwitcherOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSwitcherOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [switcherOpen]);

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

  const activeName =
    activeOrganization?.name ?? session?.targetOrgName ?? null;

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
      setSessionStatus(error instanceof Error ? error.message : "Unable to open Organization");
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
      setSessionStatus("Back in Agency.");
      window.location.assign("/platform/dashboard");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to return to Agency");
    } finally {
      setSwitchingOrgId(null);
    }
  }

  return (
    <div
      className={cn(
        "relative mb-4 rounded-2xl border border-[var(--forge-border)] bg-[var(--forge-surface)] px-2.5 py-2.5",
        collapsed && "lg:sr-only",
        className,
      )}
      data-platform-organization-switcher="true"
      ref={switcherRef}
    >
      <button
        aria-controls="platform-organization-switcher-menu"
        aria-expanded={switcherOpen}
        aria-haspopup="dialog"
        className="w-full text-left"
        data-platform-organization-switcher-trigger="true"
        onClick={() => setSwitcherOpen((current) => !current)}
        type="button"
      >
        <span className="sr-only">Switch organization</span>
        <div className="flex items-center gap-3 rounded-xl px-1.5 py-1 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] active:scale-[0.985]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--forge-text)_8%,transparent)] text-sm font-semibold text-[var(--forge-text)]">
            {initialOf(activeName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--forge-text)]">
              {activeName ?? "Select organization"}
            </span>
            <span className="block truncate text-xs text-[var(--forge-muted)]">
              {session
                ? "Current organization"
                : `${organizationCount ?? organizations.length} organizations`}
            </span>
          </span>
          <ForgeIcon name="unfold_more" size={18} />
        </div>
      </button>

      <div
        aria-hidden={!switcherOpen}
        className={cn(
          "absolute left-full top-0 z-50 ml-2 w-80 origin-left rounded-2xl border border-[var(--forge-border)] bg-[var(--forge-floating-bg)] p-3 shadow-[0_24px_60px_color-mix(in_srgb,var(--forge-text)_18%,transparent)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
          switcherOpen
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[0.98] opacity-0",
        )}
        data-platform-organization-switcher-menu="true"
        data-state={switcherOpen ? "open" : "closed"}
        hidden={!switcherOpen}
        id="platform-organization-switcher-menu"
      >
        <label className="sr-only" htmlFor="platform-organization-switch-search">
          Search organizations
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--forge-muted)]">
            <ForgeIcon name="search" size={16} />
          </span>
          <input
            className="min-h-10 w-full rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)] pl-9 pr-3 text-sm text-[var(--forge-text)] outline-none transition placeholder:text-[var(--forge-muted)] focus:border-[var(--forge-gold)]/60"
            data-platform-organization-switcher-search="true"
            id="platform-organization-switch-search"
            onChange={(event) => setOrganizationQuery(event.target.value)}
            placeholder="Search for an organization"
            type="search"
            value={organizationQuery}
          />
        </div>

        <p className="mt-3 px-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--forge-muted)]">
          All accounts
        </p>

        <div
          className="mt-1.5 max-h-72 space-y-1.5 overflow-y-auto pr-1"
          data-platform-session-endpoint={PLATFORM_SESSION_ENDPOINT}
        >
          {filteredOrganizations.length ? (
            filteredOrganizations.map((organization) => {
              const isCurrent =
                organization.id === session?.targetOrgId ||
                organization.slug === session?.targetOrgSlug;
              const isOpening = switchingOrgId === organization.id;

              return (
                <button
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 py-2.5 text-left transition hover:border-[color-mix(in_srgb,var(--forge-gold)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--forge-gold)_5%,transparent)] disabled:cursor-not-allowed",
                    isCurrent &&
                      "border-[color-mix(in_srgb,var(--forge-gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_8%,transparent)]",
                  )}
                  data-platform-organization-option={organization.id}
                  disabled={switchingOrgId !== null}
                  key={organization.id}
                  onClick={() => handleLaunchOrganization(organization)}
                  type="button"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--forge-text)_8%,transparent)] text-sm font-semibold text-[var(--forge-text)]">
                    {initialOf(organization.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--forge-text)]">
                      {organization.name}
                    </span>
                    <span className="block truncate text-xs text-[var(--forge-muted)]">
                      {isOpening ? "Opening…" : organization.slug}
                    </span>
                  </span>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--forge-gold)_16%,transparent)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--forge-gold)]">
                      Current
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2.5 text-xs text-[var(--forge-muted)]">
              No organizations match this search.
            </p>
          )}
        </div>

        {session ? (
          <div className="mt-3">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--forge-border)] px-3 py-2 text-xs font-semibold text-[var(--forge-muted)] transition hover:border-[color-mix(in_srgb,var(--forge-gold)_40%,transparent)] hover:text-[var(--forge-text)] disabled:opacity-60"
              data-platform-return-to-agency="true"
              disabled={switchingOrgId !== null}
              onClick={handleEndSession}
              type="button"
            >
              <ForgeIcon name="arrow_back" size={15} />
              {switchingOrgId === "ending"
                ? "Returning…"
                : "Return to platform dashboard"}
            </button>
          </div>
        ) : null}
        {sessionStatus ? (
          <p className="mt-2 rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2 text-xs text-[var(--forge-muted)]">
            {sessionStatus}
          </p>
        ) : null}
      </div>
    </div>
  );
}
