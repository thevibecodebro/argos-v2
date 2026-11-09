"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./platform-console.module.css";
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
  const switcherId = useId();
  const menuId = `${switcherId}-menu`;
  const searchId = `${switcherId}-search`;
  const [session, setSession] = useState(activeSession);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    maxHeight: number;
    width: number;
  }>();
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(activeSession);
  }, [activeSession]);

  useLayoutEffect(() => {
    if (!switcherOpen) {
      setMenuPosition(undefined);
      return;
    }

    function positionMenu() {
      const wrapper = switcherRef.current;
      if (!wrapper || wrapper.closest("[data-mobile-organization-switcher]")) return;

      const trigger = wrapper.querySelector<HTMLButtonElement>("[data-platform-organization-switcher-trigger]");
      if (!trigger) return;
      const wrapperRect = wrapper.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const margin = 16;
      const width = Math.min(320, Math.max(0, viewportWidth - margin * 2));
      const besideRail = window.innerWidth >= 1024 ||
        (window.innerWidth >= 768 && Boolean(wrapper.closest("#auth-navigation")));
      const preferredLeft = besideRail ? wrapperRect.right + 12 : wrapperRect.left;
      const preferredTop = besideRail ? triggerRect.top : triggerRect.bottom + 8;
      // Keep enough of a short-screen menu visible to scroll through its return action.
      const visibleHeight = Math.min(240, Math.max(0, viewportHeight - margin * 2));
      const left = Math.max(viewportLeft + margin, Math.min(preferredLeft, viewportLeft + viewportWidth - width - margin));
      const top = Math.max(viewportTop + margin, Math.min(preferredTop, viewportTop + viewportHeight - visibleHeight - margin));

      setMenuPosition({
        left: left - wrapperRect.left,
        top: top - wrapperRect.top,
        maxHeight: Math.max(0, viewportTop + viewportHeight - top - margin),
        width,
      });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    window.visualViewport?.addEventListener("resize", positionMenu);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      window.visualViewport?.removeEventListener("resize", positionMenu);
    };
  }, [switcherOpen]);

  useEffect(() => {
    if (!switcherOpen) return;
    switcherRef.current?.querySelector<HTMLInputElement>("input[type='search']")?.focus();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && switcherRef.current?.contains(target)) {
        return;
      }

      setSwitcherOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSwitcherOpen(false);
        switcherRef.current?.querySelector<HTMLButtonElement>("[data-platform-organization-switcher-trigger]")?.focus();
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
      setSessionStatus("Back in Argos Admin Dashboard.");
      window.location.assign("/platform/dashboard");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to return to Argos Admin Dashboard");
    } finally {
      setSwitchingOrgId(null);
    }
  }

  return (
    <div
      className={cn(
        styles.switcher,
        collapsed && styles.switcherCollapsed,
        className,
      )}
      data-platform-organization-switcher="true"
      ref={switcherRef}
    >
      <button
        aria-controls={menuId}
        aria-expanded={switcherOpen}
        aria-haspopup="dialog"
        aria-label={activeName ? `Switch organization: ${activeName}` : "Switch organization"}
        className={styles.switcherTrigger}
        data-platform-organization-switcher-trigger="true"
        onClick={() => setSwitcherOpen((current) => !current)}
        type="button"
      >
        <span className="sr-only">Switch organization</span>
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--forge-text)_8%,transparent)] text-sm font-semibold text-[var(--forge-text)]">
            {initialOf(activeName)}
          </span>
          <span className={cn("min-w-0 flex-1", collapsed && "lg:sr-only")} data-platform-switcher-label="true">
            <span className="block break-words text-sm font-semibold text-[var(--forge-text)]">
              {activeName ?? "Select organization"}
            </span>
            <span className="block break-words text-xs text-[var(--forge-muted)]">
              {session
                ? "Current organization"
                : `${organizationCount ?? organizations.length} organizations`}
            </span>
          </span>
          <span className={cn(collapsed && "lg:hidden")} data-platform-switcher-chevron="true">
            <ForgeIcon name="unfold_more" size={18} />
          </span>
        </div>
      </button>

      <div
        aria-hidden={!switcherOpen}
        className={styles.switcherMenu}
        role="dialog"
        aria-label="Switch organization"
        data-platform-organization-switcher-menu="true"
        data-state={switcherOpen ? "open" : "closed"}
        hidden={!switcherOpen}
        id={menuId}
        style={menuPosition}
      >
        <label className="sr-only" htmlFor={searchId}>
          Search organizations
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--forge-muted)]">
            <ForgeIcon name="search" size={16} />
          </span>
          <input
            className={styles.switcherSearch}
            data-platform-organization-switcher-search="true"
            id={searchId}
            onChange={(event) => setOrganizationQuery(event.target.value)}
            placeholder="Search for an organization"
            type="search"
            value={organizationQuery}
          />
        </div>

        <p className="mt-3 px-1 text-xs font-semibold text-[var(--forge-muted)]">
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
                  aria-current={isCurrent ? "true" : undefined}
                  className={styles.switcherOption}
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
                    <span className="block break-words text-sm font-semibold text-[var(--forge-text)]">
                      {organization.name}
                    </span>
                    <span className="block break-words text-xs text-[var(--forge-muted)]">
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--forge-border)] px-3 py-2 text-xs font-semibold text-[var(--forge-muted)] transition hover:border-[color-mix(in_srgb,var(--forge-gold)_40%,transparent)] hover:text-[var(--forge-text)] disabled:opacity-60"
              data-platform-return-to-agency="true"
              disabled={switchingOrgId !== null}
              onClick={handleEndSession}
              type="button"
            >
              <ForgeIcon name="arrow_back" size={15} />
              {switchingOrgId === "ending"
                ? "Returning…"
                : "Return to Argos Admin Dashboard"}
            </button>
          </div>
        ) : (
          <a
            className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--forge-border)] px-3 py-2 text-xs font-semibold text-[var(--forge-muted)] hover:text-[var(--forge-text)]"
            href="/platform/dashboard"
          >
            <ForgeIcon name="arrow_back" size={15} />
            Return to Argos Admin Dashboard
          </a>
        )}
        {sessionStatus ? (
          <p role="status" className="mt-2 rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2 text-xs text-[var(--forge-muted)]">
            {sessionStatus}
          </p>
        ) : null}
      </div>
    </div>
  );
}
