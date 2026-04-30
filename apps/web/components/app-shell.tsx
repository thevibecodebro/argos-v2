"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "./forge";
import type { AppUserRole } from "@/lib/users/roles";

type ShellUser = {
  email: string;
  fullName: string;
  orgName?: string | null;
  role: AppUserRole | null;
};

type AuthenticatedAppShellProps = {
  children: React.ReactNode;
  initialPrimaryRailCollapsed?: boolean;
  user: ShellUser;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  visibleTo?: AppUserRole[];
};

type CurrentArea = {
  eyebrow: string;
  label: string;
};

const navGroups: NavGroup[] = [
  {
    label: "Review",
    icon: "query_stats",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/calls", label: "Calls", icon: "library_books" },
      { href: "/highlights", label: "Highlights", icon: "auto_awesome" },
    ],
  },
  {
    label: "Coach",
    icon: "psychology",
    items: [
      { href: "/training", label: "Training", icon: "school" },
      { href: "/roleplay", label: "Roleplay", icon: "psychology" },
    ],
  },
  {
    label: "People",
    icon: "group",
    visibleTo: ["manager", "executive", "admin"],
    items: [
      { href: "/team", label: "Team", icon: "group" },
      { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
    ],
  },
  {
    label: "System",
    icon: "settings",
    items: [
      { href: "/notifications", label: "Notifications", icon: "notifications" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export function AuthenticatedAppShell({
  children,
  initialPrimaryRailCollapsed = false,
  user,
}: AuthenticatedAppShellProps) {
  const currentPath = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [primaryRailCollapsed, setPrimaryRailCollapsed] = useState(initialPrimaryRailCollapsed);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  const initials = getInitials(user.fullName || user.email);
  const currentArea = getCurrentArea(currentPath);
  const roleLabel = formatRole(user.role);
  const roleContext = user.role ? `${roleLabel} view` : "Workspace view";

  const visibleGroups = navGroups.filter((group) => {
    if (!group.visibleTo) return true;
    if (!user.role) return false;
    return group.visibleTo.includes(user.role);
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountOpen]);

  useEffect(() => {
    function handleAccountMenuKeydown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setAccountOpen(false);
      window.requestAnimationFrame(() => accountTriggerRef.current?.focus());
    }

    if (accountOpen) {
      document.addEventListener("keydown", handleAccountMenuKeydown);
    }

    return () => document.removeEventListener("keydown", handleAccountMenuKeydown);
  }, [accountOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentPath]);

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
    <div className="forge-shell min-h-dvh text-[var(--forge-text)]" data-shell-theme="forge">
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
        data-primary-rail-collapsed={primaryRailCollapsed ? "true" : "false"}
        id="auth-navigation"
      >
        <div className={cn(
          "mb-7 rounded-[1.35rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.055)]",
          primaryRailCollapsed && "lg:p-2",
        )}>
          <div className="flex items-center justify-between gap-3">
            <div className={cn(primaryRailCollapsed && "lg:sr-only")}>
              <h1 className="font-[var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-[var(--forge-text)]">
                Argos
              </h1>
              <p className="mt-0.5 font-[var(--font-display)] text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[var(--forge-gold)]">
                Sales forge
              </p>
            </div>
            {primaryRailCollapsed ? null : (
              <ForgeIcon className="text-[var(--forge-gold)]" name="insights" size={21} />
            )}
            <button
              aria-label={primaryRailCollapsed ? "Expand navigation" : "Collapse navigation"}
              className="forge-icon-button hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:flex"
              onClick={togglePrimaryRail}
              title={primaryRailCollapsed ? "Expand navigation" : "Collapse navigation"}
              type="button"
            >
              <ForgeIcon name={primaryRailCollapsed ? "chevron_right" : "chevron_left"} size={20} />
            </button>
          </div>
          <div
            className={cn(
              "mt-4 rounded-2xl border border-[var(--forge-border)] bg-[rgba(5,4,3,0.38)] p-3",
              primaryRailCollapsed && "lg:hidden",
            )}
            data-primary-rail-detail="true"
          >
            <p className="font-[var(--font-display)] text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
              Workspace scope
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-[var(--forge-text)]">
              {user.orgName ?? "Command workspace"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--forge-muted)]">
              {roleContext}
            </p>
          </div>
        </div>

        <nav
          className={cn("flex-1 space-y-1 overflow-y-auto pr-1", primaryRailCollapsed && "lg:pr-0")}
          aria-label="Primary navigation"
        >
          {visibleGroups.map((group) => {
            const groupActive = group.items.some((item) => isRouteActive(currentPath, item.href));
            return (
              <div className="mt-4" key={group.label}>
                <p
                  className={cn("forge-nav-section-label mb-1 px-3", primaryRailCollapsed && "lg:sr-only")}
                  data-active={groupActive ? "true" : "false"}
                  data-primary-rail-section-label="true"
                >
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isRouteActive(currentPath, item.href);
                    return (
                      <NavLink
                        active={active}
                        collapsed={primaryRailCollapsed}
                        href={item.href}
                        icon={item.icon}
                        key={item.href}
                        label={item.label}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div
          className={cn(
            "mt-4 border-t border-[var(--forge-border)] pt-3 text-xs leading-5 text-[var(--forge-muted)]",
            primaryRailCollapsed && "lg:hidden",
          )}
          data-primary-rail-detail="true"
        >
          <span className="font-[var(--font-display)] font-bold uppercase tracking-[0.16em] text-[var(--forge-gold)]">
            Active scope
          </span>
          <span className="mt-1 block truncate">{roleContext}</span>
        </div>
      </aside>

      <div className={cn("min-h-dvh transition-[padding] duration-300 lg:pl-64", primaryRailCollapsed && "lg:pl-20")}>
        <header className={cn(
          "forge-topbar fixed left-0 right-0 top-0 z-30 flex min-h-16 items-center justify-between gap-3 px-4 py-3 backdrop-blur-xl transition-[left] duration-300 lg:left-64 lg:px-7",
          primaryRailCollapsed && "lg:left-20",
        )}>
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-controls="auth-navigation"
              aria-expanded={mobileNavOpen}
              aria-label="Open navigation"
              className="forge-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <ForgeIcon name="filter_list" size={22} />
            </button>

            <div className="min-w-0">
              <p className="font-[var(--font-display)] text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[var(--forge-gold)]">
                {currentArea.eyebrow}
              </p>
              <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                {currentArea.label}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-2 text-right sm:block">
              <p className="max-w-40 truncate text-xs font-semibold text-[var(--forge-text)]">
                {user.orgName ?? "Argos"}
              </p>
              <p className="font-[var(--font-display)] text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                {roleLabel}
              </p>
            </div>

            <Link
              className={cn(
                "forge-button hidden px-3 py-2 text-xs uppercase tracking-[0.18em] sm:inline-flex",
                isRouteActive(currentPath, "/upload")
                  ? "forge-button-primary"
                  : "forge-button-secondary",
              )}
              href="/upload"
            >
              <ForgeIcon name="cloud_upload" size={16} />
              Upload call
            </Link>

            <Link
              aria-label="Notifications"
              className="forge-icon-button flex h-10 w-10 items-center justify-center rounded-2xl"
              data-active={isRouteActive(currentPath, "/notifications") ? "true" : "false"}
              href="/notifications"
            >
              <ForgeIcon name="notifications" size={20} />
            </Link>

            <div className="relative" ref={accountRef}>
              <button
                aria-controls="account-menu"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="forge-icon-button flex h-10 w-10 items-center justify-center rounded-full font-[var(--font-display)] text-sm font-bold text-[var(--forge-gold)]"
                onClick={() => setAccountOpen((v) => !v)}
                ref={accountTriggerRef}
                type="button"
              >
                {initials}
              </button>

              <div
                aria-hidden={!accountOpen}
                className={cn(
                  "forge-account-menu absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-3xl transition duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  accountOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0",
                )}
                id="account-menu"
                role="menu"
              >
                <div className="border-b border-[var(--forge-border)] px-4 py-3">
                  <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                    {user.fullName || user.email}
                  </p>
                  {user.fullName ? (
                    <p className="mt-0.5 truncate text-xs text-[var(--forge-muted)]">{user.email}</p>
                  ) : null}
                  <p className="mt-1 font-[var(--font-display)] text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
                    {roleLabel}
                  </p>
                </div>

                <Link
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--forge-muted)] transition hover:bg-[rgba(241,191,123,0.07)] hover:text-[var(--forge-text)]"
                  href="/settings"
                  onClick={() => setAccountOpen(false)}
                  role="menuitem"
                  tabIndex={accountOpen ? 0 : -1}
                >
                  <ForgeIcon name="settings" size={17} />
                  Settings
                </Link>

                <div className="border-t border-[var(--forge-border)]">
                  <form action="/auth/signout" method="post">
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--forge-muted)] transition hover:bg-[rgba(255,113,108,0.09)] hover:text-[var(--forge-text)]"
                      role="menuitem"
                      tabIndex={accountOpen ? 0 : -1}
                      type="submit"
                    >
                      <ForgeIcon name="logout" size={17} />
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-dvh pt-16">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "forge-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em]",
        collapsed && "lg:h-11 lg:justify-center lg:px-0",
        active && "forge-nav-link--active",
      )}
      href={href}
      title={collapsed ? label : undefined}
    >
      <ForgeIcon name={icon} size={18} />
      <span className={cn("truncate", collapsed && "lg:sr-only")} data-primary-rail-label="true">
        {label}
      </span>
    </Link>
  );
}

function isRouteActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRole(role: AppUserRole | null) {
  if (!role) return "Workspace";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getCurrentArea(currentPath: string): CurrentArea {
  if (currentPath === "/dashboard") return { eyebrow: "Operating pulse", label: "Dashboard" };
  if (currentPath.startsWith("/calls")) return { eyebrow: "Call intake", label: "Calls" };
  if (currentPath.startsWith("/highlights")) return { eyebrow: "Coaching evidence", label: "Highlights" };
  if (currentPath.startsWith("/upload")) return { eyebrow: "Call intake", label: "Upload call" };
  if (currentPath.startsWith("/roleplay")) return { eyebrow: "Simulation bay", label: "Roleplay" };
  if (currentPath.startsWith("/training")) return { eyebrow: "Curriculum bench", label: "Training" };
  if (currentPath.startsWith("/team")) return { eyebrow: "People operations", label: "Team" };
  if (currentPath.startsWith("/leaderboard")) return { eyebrow: "Performance ranks", label: "Leaderboard" };
  if (currentPath.startsWith("/notifications")) return { eyebrow: "Activity inbox", label: "Notifications" };
  if (currentPath.startsWith("/settings")) return { eyebrow: "System settings", label: "Settings" };
  return { eyebrow: "Sales forge", label: "Workspace" };
}
