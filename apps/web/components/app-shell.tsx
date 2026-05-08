"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";
import { FeedbackWidget } from "./feedback-widget";
import { ForgeIcon } from "./forge";
import type { AppUserRole } from "@/lib/users/roles";

type ShellUser = {
  email: string;
  fullName: string;
  orgLogoUrl?: string | null;
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
];

export function AuthenticatedAppShell({
  children,
  initialPrimaryRailCollapsed = false,
  user,
}: AuthenticatedAppShellProps) {
  const currentPath = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [primaryRailCollapsed, setPrimaryRailCollapsed] = useState(
    initialPrimaryRailCollapsed,
  );
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  const initials = getInitials(user.fullName || user.email);
  const roleLabel = formatRole(user.role);
  const hasDockedSecondaryRail = isDockedSecondaryRailRoute(currentPath);

  const visibleGroups = navGroups.filter((group) => {
    if (!group.visibleTo) return true;
    if (!user.role) return false;
    return group.visibleTo.includes(user.role);
  });
  const visibleItems = visibleGroups.flatMap((group) => group.items);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
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

    return () =>
      document.removeEventListener("keydown", handleAccountMenuKeydown);
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
    <div
      className="forge-shell min-h-dvh text-[var(--forge-text)]"
      data-docked-secondary-rail={hasDockedSecondaryRail ? "true" : undefined}
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
          mobileNavOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
        data-primary-rail-collapsed={primaryRailCollapsed ? "true" : "false"}
        id="auth-navigation"
      >
        <div className={cn("mb-7 px-1", primaryRailCollapsed && "lg:px-0")}>
          <div className="flex items-center justify-between gap-3">
            <div className={cn(primaryRailCollapsed && "lg:sr-only")}>
              {user.orgLogoUrl ? (
                <img
                  alt={`${user.orgName ?? "Organization"} logo`}
                  className="max-h-10 max-w-36 object-contain"
                  data-primary-rail-org-logo="true"
                  src={user.orgLogoUrl}
                />
              ) : (
                <h1 className="font-[var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-[var(--forge-text)]">
                  Argos
                </h1>
              )}
              <p className="mt-0.5 font-[var(--font-display)] text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[var(--forge-gold)]">
                Revenue Command
              </p>
            </div>
            {primaryRailCollapsed ? null : (
              <ForgeIcon
                className="text-[var(--forge-gold)]"
                name="insights"
                size={21}
              />
            )}
            <button
              aria-label={
                primaryRailCollapsed
                  ? "Expand navigation"
                  : "Collapse navigation"
              }
              className="forge-icon-button hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:flex"
              onClick={togglePrimaryRail}
              title={
                primaryRailCollapsed
                  ? "Expand navigation"
                  : "Collapse navigation"
              }
              type="button"
            >
              <ForgeIcon
                name={primaryRailCollapsed ? "chevron_right" : "chevron_left"}
                size={20}
              />
            </button>
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 space-y-1 overflow-y-auto pr-1",
            primaryRailCollapsed && "lg:pr-0",
          )}
          aria-label="Primary navigation"
        >
          {visibleItems.map((item) => (
            <NavLink
              active={isRouteActive(currentPath, item.href)}
              collapsed={primaryRailCollapsed}
              href={item.href}
              icon={item.icon}
              key={item.href}
              label={item.label}
            />
          ))}
        </nav>

        <div
          className={cn(
            "mt-4 border-t border-[var(--forge-border)] pt-3",
            primaryRailCollapsed && "lg:px-0",
          )}
        >
          <Link
            aria-current={
              isRouteActive(currentPath, "/settings") ? "page" : undefined
            }
            aria-label="Settings"
            className={cn(
              "forge-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em]",
              primaryRailCollapsed && "lg:h-11 lg:justify-center lg:px-0",
              isRouteActive(currentPath, "/settings") &&
                "forge-nav-link--active",
            )}
            data-primary-rail-footer-link="settings"
            href="/settings"
            title={primaryRailCollapsed ? "Settings" : undefined}
          >
            <ForgeIcon name="settings" size={18} />
            <span
              className={cn("truncate", primaryRailCollapsed && "lg:sr-only")}
              data-primary-rail-label="true"
            >
              Settings
            </span>
          </Link>
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
                    <p className="mt-0.5 truncate text-xs text-[var(--forge-muted)]">
                      {user.email}
                    </p>
                  ) : null}
                  <p className="mt-1 font-[var(--font-display)] text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
                    {roleLabel}
                  </p>
                </div>

                <Link
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--forge-muted)] transition hover:bg-[rgba(241,191,123,0.07)] hover:text-[var(--forge-text)]"
                  data-account-menu-item="notifications"
                  href="/notifications"
                  onClick={() => setAccountOpen(false)}
                  role="menuitem"
                  tabIndex={accountOpen ? 0 : -1}
                >
                  <ForgeIcon name="notifications" size={17} />
                  Notifications
                </Link>

                <Link
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--forge-muted)] transition hover:bg-[rgba(241,191,123,0.07)] hover:text-[var(--forge-text)]"
                  data-account-menu-item="settings"
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
        <FeedbackWidget />
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
      <span
        className={cn("truncate", collapsed && "lg:sr-only")}
        data-primary-rail-label="true"
      >
        {label}
      </span>
    </Link>
  );
}

function isRouteActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function isDockedSecondaryRailRoute(currentPath: string) {
  return (
    currentPath === "/training/builder" ||
    currentPath === "/settings" ||
    currentPath.startsWith("/settings/")
  );
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
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
