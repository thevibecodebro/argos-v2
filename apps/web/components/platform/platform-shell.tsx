"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import { ArgosLogo } from "@/components/argos-logo";
import { ForgeChip, ForgeIcon } from "@/components/forge";
import { PlatformOrganizationSwitcher } from "./platform-organization-switcher";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
  PlatformRole,
  PlatformStaffStatus,
} from "./platform-types";

type PlatformShellProps = {
  activePath: string;
  activeSession: PlatformConsoleActiveSession | null;
  children?: ReactNode;
  currentUserEmail: string;
  organizationCount: number;
  organizations: PlatformConsoleOrganization[];
  staffRole: PlatformRole;
  staffStatus: PlatformStaffStatus;
};

const platformNavItems = [
  { href: "/platform/dashboard", icon: "dashboard", label: "Agency" },
  { href: "/platform/organizations", icon: "business", label: "Organizations" },
  { href: "/platform/sessions", icon: "input", label: "Access History" },
  { href: "/platform/staff", icon: "admin_panel_settings", label: "Staff" },
] as const;

export function PlatformShell({
  activePath,
  activeSession,
  children,
  currentUserEmail,
  organizationCount,
  organizations,
  staffRole,
  staffStatus,
}: PlatformShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [primaryRailCollapsed, setPrimaryRailCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("argos.primaryRailCollapsed");
    if (saved === "true" || saved === "false") {
      setPrimaryRailCollapsed(saved === "true");
    }
  }, []);

  function togglePrimaryRail() {
    setPrimaryRailCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("argos.primaryRailCollapsed", String(next));
      return next;
    });
  }

  return (
    <div
      className="forge-shell min-h-dvh text-[var(--forge-text)]"
      data-platform-shell="true"
      data-primary-rail-collapsed={primaryRailCollapsed ? "true" : "false"}
      data-shell-theme="forge"
    >
      {mobileNavOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[rgba(5,4,3,0.68)] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "forge-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col px-4 py-5 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:px-4",
          primaryRailCollapsed && "lg:w-20 lg:px-3",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        data-platform-sidebar="true"
        data-primary-rail-collapsed={primaryRailCollapsed ? "true" : "false"}
        id="platform-navigation"
      >
        <div className={cn("mb-7 px-1", primaryRailCollapsed && "lg:px-0")}>
          <div className="flex items-center justify-between gap-3">
            <div className={cn(primaryRailCollapsed && "lg:sr-only")}>
              <ArgosLogo
                className="block w-28"
                decorative
                imageClassName="block h-auto w-full"
                placement="primary-rail"
              />
              <p className="mt-0.5 font-[var(--font-display)] text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[var(--forge-gold)]">
                Revenue Command
              </p>
            </div>
            <button
              aria-label={primaryRailCollapsed ? "Expand navigation" : "Collapse navigation"}
              className="forge-icon-button hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:flex"
              onClick={togglePrimaryRail}
              title={primaryRailCollapsed ? "Expand navigation" : "Collapse navigation"}
              type="button"
            >
              <PlatformPrimaryRailToggleIcon state={primaryRailCollapsed ? "expand" : "collapse"} />
            </button>
          </div>
        </div>

        <PlatformOrganizationSwitcher
          activeSession={activeSession}
          collapsed={primaryRailCollapsed}
          organizationCount={organizationCount}
          organizations={organizations}
        />

        <nav
          aria-label="Agency navigation"
          className={cn("flex-1 space-y-1 overflow-y-auto pr-1", primaryRailCollapsed && "lg:pr-0")}
        >
          {platformNavItems.map((item) => (
            <PlatformNavLink
              active={activePath === item.href}
              collapsed={primaryRailCollapsed}
              href={item.href}
              icon={item.icon}
              key={item.href}
              label={item.label}
              onClick={() => setMobileNavOpen(false)}
            />
          ))}
        </nav>

        <div
          className={cn(
            "mt-4 border-t border-[var(--forge-border)] pt-3",
            primaryRailCollapsed && "lg:px-0",
          )}
        >
          {activeSession ? (
            <a
              aria-label="Open Organization"
              className={cn(
                "forge-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em]",
                primaryRailCollapsed && "lg:h-11 lg:justify-center lg:px-0",
              )}
              data-navigation-link="/dashboard"
              data-platform-organization-view-link="active"
              href="/dashboard"
              title={primaryRailCollapsed ? "Open Organization" : undefined}
            >
              <ForgeIcon name="open_in_new" size={18} />
              <span className={cn("truncate", primaryRailCollapsed && "lg:sr-only")}>
                Open Organization
              </span>
            </a>
          ) : (
            <div
              aria-label="Open Organization"
              className={cn(
                "forge-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em] opacity-60",
                primaryRailCollapsed && "lg:h-11 lg:justify-center lg:px-0",
              )}
              data-platform-organization-view-link="disabled"
              title={primaryRailCollapsed ? "Open Organization" : undefined}
            >
              <ForgeIcon name="lock" size={18} />
              <span className={cn("truncate", primaryRailCollapsed && "lg:sr-only")}>
                Open Organization
              </span>
            </div>
          )}
        </div>
      </aside>

      <div
        className={cn(
          "min-h-dvh transition-[padding] duration-300 lg:pl-64",
          primaryRailCollapsed && "lg:pl-20",
        )}
        data-auth-shell-content="true"
      >
        <header
          className={cn(
            "forge-topbar fixed left-0 right-0 top-0 z-30 flex min-h-16 items-center justify-between gap-3 px-4 py-3 backdrop-blur-xl transition-[left] duration-300 lg:left-64 lg:px-7",
            primaryRailCollapsed && "lg:left-20",
          )}
        >
          <button
            aria-controls="platform-navigation"
            aria-expanded={mobileNavOpen}
            aria-label="Open navigation"
            className="forge-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            type="button"
          >
            <ForgeIcon name="filter_list" size={22} />
          </button>

          <div className="ml-auto flex min-w-0 items-center gap-2 text-xs text-[var(--forge-muted)]">
            <ForgeChip icon="admin_panel_settings" tone="gold">
              {staffRole}
            </ForgeChip>
            {activeSession ? (
              <ForgeChip icon="input" tone="cyan">
                {activeSession.targetOrgName}
              </ForgeChip>
            ) : null}
            {staffStatus !== "active" ? (
              <ForgeChip icon="warning" tone="danger">
                {staffStatus}
              </ForgeChip>
            ) : null}
            <span className="hidden max-w-[240px] truncate sm:inline">
              {currentUserEmail}
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--forge-border)] bg-[rgba(255,244,230,0.045)] font-[var(--font-display)] text-sm font-bold text-[var(--forge-gold)]">
              {currentUserEmail.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="min-h-dvh pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}

function PlatformNavLink({
  active,
  collapsed,
  href,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  href: string;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "forge-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em]",
        collapsed && "lg:h-11 lg:justify-center lg:px-0",
        active && "forge-nav-link--active",
      )}
      data-navigation-link={href}
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <ForgeIcon name={icon} size={18} />
      <span className={cn("truncate", collapsed && "lg:sr-only")}>
        {label}
      </span>
    </a>
  );
}

function PlatformPrimaryRailToggleIcon({
  state,
}: {
  state: "collapse" | "expand";
}) {
  const isCollapse = state === "collapse";

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      data-primary-rail-toggle-icon={state}
      fill="none"
      focusable="false"
      viewBox="0 0 20 20"
    >
      <rect
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
        width="13.5"
        x="3.25"
        y="4"
      />
      <path d="M7.25 4.75v10.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      {isCollapse ? (
        <path
          d="M13.25 8.25 9.5 12l3.75 3.75M9.75 12h5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      ) : (
        <path
          d="M9 8.25 12.75 12 9 15.75M5.25 12h7.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
}
