"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";
import { ArgosLogo } from "./argos-logo";
import {
  bottomTabs,
  getVisibleNavGroups,
  type BottomTabItem,
} from "./app-navigation";
import { CommandPalette } from "./command-palette";
import { FeedbackDialogLoader } from "./feedback-dialog-loader";
import { ForgeIcon } from "./forge";
import { PlatformOrganizationSwitcher } from "./platform/platform-organization-switcher";
import { RoleOnboardingGuide } from "./role-onboarding-guide";
import {
  DEFAULT_WORKSPACE_THEME,
  workspaceThemeToForgeVars,
  type WorkspaceTheme,
} from "@/lib/organizations/workspace-theme";
import type { AppUserRole } from "@/lib/users/roles";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "./platform/platform-types";

type ShellUser = {
  email: string;
  fullName: string;
  id: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
  role: AppUserRole | null;
  workspaceTheme?: WorkspaceTheme | null;
};

type AuthenticatedAppShellProps = {
  children: React.ReactNode;
  initialPrimaryRailCollapsed?: boolean;
  platformSwitcher?: {
    activeSession: PlatformConsoleActiveSession | null;
    organizations: PlatformConsoleOrganization[];
  };
  user: ShellUser;
};

type NavigationDestination = {
  href: string;
  label: string;
};

type NavigationPendingState = {
  announcement: string;
  isPending: boolean;
  pendingHref: string | null;
};

export function AuthenticatedAppShell({
  children,
  initialPrimaryRailCollapsed = false,
  platformSwitcher,
  user,
}: AuthenticatedAppShellProps) {
  const currentPath = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [guideReplaySignal, setGuideReplaySignal] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [primaryRailCollapsed, setPrimaryRailCollapsed] = useState(
    initialPrimaryRailCollapsed,
  );
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  const initials = getInitials(user.fullName || user.email);
  const roleLabel = formatRole(user.role);
  const hasDockedSecondaryRail = isDockedSecondaryRailRoute(currentPath);
  // Orgs without a saved theme fall back to the default workspace theme
  // (warm-Indigo light), so the authenticated app is light by default.
  const workspaceThemeVars = workspaceThemeToForgeVars(
    user.workspaceTheme ?? DEFAULT_WORKSPACE_THEME,
  ) as CSSProperties;

  const visibleGroups = getVisibleNavGroups(user.role);
  const visibleItems = visibleGroups.flatMap((group) => group.items);
  const navigationDestinations: NavigationDestination[] = visibleItems.map(
    ({ href, label }) => ({ href, label }),
  );
  const navigationPendingState = getNavigationPendingState({
    currentPath,
    destinations: navigationDestinations,
    pendingHref,
  });

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
    setPendingHref((current) =>
      current && isRouteActive(currentPath, current) ? null : current,
    );
  }, [currentPath]);

  useEffect(() => {
    if (!pendingHref) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPendingHref((current) => (current === pendingHref ? null : current));
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [pendingHref]);

  useEffect(() => {
    function handleCommandShortcut(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    document.addEventListener("keydown", handleCommandShortcut);
    return () =>
      document.removeEventListener("keydown", handleCommandShortcut);
  }, []);

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

  function handleRouteLinkClick(
    event: ReactMouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isRouteActive(currentPath, href)
    ) {
      return;
    }

    setPendingHref(href);
  }

  return (
    <div
      aria-busy={navigationPendingState.isPending ? "true" : undefined}
      className="forge-shell min-h-dvh text-[var(--forge-text)]"
      data-docked-secondary-rail={hasDockedSecondaryRail ? "true" : undefined}
      data-navigation-pending={
        navigationPendingState.isPending ? "true" : undefined
      }
      data-navigation-pending-href={navigationPendingState.pendingHref ?? undefined}
      data-primary-rail-collapsed={primaryRailCollapsed ? "true" : "false"}
      data-shell-theme="forge"
      style={workspaceThemeVars}
    >
      <p
        aria-live="polite"
        className="sr-only"
        id="auth-navigation-status"
        role="status"
      >
        {navigationPendingState.announcement}
      </p>

      {/* ===== Primary rail — full on desktop, icon-only on tablet, hidden on phones ===== */}
      <aside
        className={cn(
          "forge-sidebar fixed inset-y-0 left-0 z-50 hidden h-dvh flex-col py-5 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] md:flex md:w-20 md:px-3",
          primaryRailCollapsed ? "lg:w-20 lg:px-3" : "lg:w-64 lg:px-4",
        )}
        data-primary-rail-collapsed={primaryRailCollapsed ? "true" : "false"}
        id="auth-navigation"
      >
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between gap-3">
            <div
              className={cn(
                "sr-only",
                primaryRailCollapsed ? "lg:sr-only" : "lg:not-sr-only",
              )}
            >
              {user.orgLogoUrl ? (
                <img
                  alt={`${user.orgName ?? "Organization"} logo`}
                  className="max-h-10 max-w-36 object-contain"
                  data-primary-rail-org-logo="true"
                  decoding="async"
                  height={40}
                  src={user.orgLogoUrl}
                  width={144}
                />
              ) : (
                <ArgosLogo
                  className="block w-28"
                  decorative
                  imageClassName="block h-auto w-full"
                  placement="primary-rail"
                />
              )}
              <p className="mt-0.5 font-[var(--font-display)] text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                Revenue Command
              </p>
            </div>
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
              <PrimaryRailToggleIcon
                state={primaryRailCollapsed ? "expand" : "collapse"}
              />
            </button>
          </div>
        </div>

        {platformSwitcher ? (
          <PlatformOrganizationSwitcher
            activeSession={platformSwitcher.activeSession}
            collapsed={primaryRailCollapsed}
            organizations={platformSwitcher.organizations}
          />
        ) : null}

        <nav
          className="flex-1 space-y-0.5 overflow-y-auto pr-0 lg:pr-1"
          aria-label="Primary navigation"
        >
          {visibleGroups.map((group) => (
            <div className="mb-1.5" key={group.label}>
              <p
                className={cn(
                  "forge-nav-section-label px-3 pb-1 pt-3",
                  primaryRailCollapsed ? "lg:hidden" : "hidden lg:block",
                  "md:hidden",
                )}
                data-primary-rail-section={group.label}
              >
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink
                  active={isRouteActive(currentPath, item.href)}
                  collapsed={primaryRailCollapsed}
                  href={item.href}
                  icon={item.icon}
                  key={item.href}
                  label={item.label}
                  onClick={(event) => handleRouteLinkClick(event, item.href)}
                  pending={navigationPendingState.pendingHref === item.href}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer identity chip */}
        <div className="mt-3 flex items-center gap-3 border-t border-[var(--forge-border)] px-1 pt-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--forge-sidebar-active-bg)] font-[var(--font-display)] text-xs font-semibold text-[var(--forge-sidebar-active-text)]"
          >
            {initials}
          </span>
          <div
            className={cn(
              "min-w-0 leading-tight",
              primaryRailCollapsed ? "hidden" : "hidden lg:block",
            )}
            data-primary-rail-identity="true"
          >
            <p className="truncate text-sm font-semibold text-[var(--forge-sidebar-text)]">
              {user.fullName || user.email}
            </p>
            <p className="truncate text-xs text-[var(--forge-sidebar-muted)]">
              {roleLabel}
            </p>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "min-h-dvh pb-20 transition-[padding] duration-300 md:pb-0 md:pl-20",
          primaryRailCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
        data-auth-shell-content="true"
      >
        <header
          className={cn(
            "forge-topbar fixed left-0 right-0 top-0 z-30 flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition-[left] duration-300 md:left-20 lg:px-7",
            primaryRailCollapsed ? "lg:left-20" : "lg:left-64",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* Compact brand mark on phones, where the rail is hidden. */}
            <span className="md:hidden" data-topbar-brand="true">
              <ArgosLogo
                className="block w-24"
                decorative
                imageClassName="block h-auto w-full"
                placement="topbar"
              />
            </span>
          </div>

          {/* Command palette trigger (⌘K) — the global jump-to / search. */}
          <button
            aria-label="Search and commands"
            className="forge-command-trigger mx-auto hidden h-10 max-w-sm flex-1 items-center gap-2 rounded-xl px-3 text-left text-sm md:flex"
            data-command-trigger="true"
            onClick={() => setCommandOpen(true)}
            type="button"
          >
            <ForgeIcon name="search" size={16} />
            <span className="flex-1 truncate text-[var(--forge-topbar-muted)]">
              Search calls, reps…
            </span>
            <kbd className="forge-command-kbd">⌘K</kbd>
          </button>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              aria-label="Search and commands"
              className="forge-icon-button flex h-10 w-10 items-center justify-center rounded-xl md:hidden"
              data-command-trigger="mobile"
              onClick={() => setCommandOpen(true)}
              type="button"
            >
              <ForgeIcon name="search" size={20} />
            </button>
            <Link
              className="forge-button forge-button-primary flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold sm:px-4"
              data-global-create="upload"
              data-navigation-pending={
                navigationPendingState.pendingHref === "/upload"
                  ? "true"
                  : undefined
              }
              href="/upload"
              onClick={(event) => handleRouteLinkClick(event, "/upload")}
            >
              <ForgeIcon name="upload" size={18} />
              <span className="hidden sm:inline">Upload</span>
            </Link>

            <div className="relative" ref={accountRef}>
              <button
                aria-controls="account-menu"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="forge-icon-button flex h-10 w-10 items-center justify-center rounded-full font-[var(--font-display)] text-sm font-bold text-[var(--forge-topbar-text)]"
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

                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--forge-muted)] transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_7%,transparent)] hover:text-[var(--forge-text)]"
                  data-account-menu-item="feedback"
                  onClick={() => {
                    setFeedbackOpen(true);
                    setAccountOpen(false);
                  }}
                  role="menuitem"
                  tabIndex={accountOpen ? 0 : -1}
                  type="button"
                >
                  <ForgeIcon name="chat_bubble" size={17} />
                  Bugs and feedback
                </button>

                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--forge-muted)] transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_7%,transparent)] hover:text-[var(--forge-text)]"
                  data-account-menu-item="product-guide"
                  onClick={() => {
                    setGuideReplaySignal((value) => value + 1);
                    setAccountOpen(false);
                  }}
                  role="menuitem"
                  tabIndex={accountOpen ? 0 : -1}
                  type="button"
                >
                  <ForgeIcon name="lightbulb" size={17} />
                  Product guide
                </button>

                <Link
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--forge-muted)] transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_7%,transparent)] hover:text-[var(--forge-text)]"
                  data-account-menu-item="notifications"
                  data-navigation-pending={
                    navigationPendingState.pendingHref === "/notifications"
                      ? "true"
                      : undefined
                  }
                  href="/notifications"
                  onClick={(event) => {
                    handleRouteLinkClick(event, "/notifications");
                    setAccountOpen(false);
                  }}
                  role="menuitem"
                  tabIndex={accountOpen ? 0 : -1}
                >
                  <ForgeIcon name="notifications" size={17} />
                  Notifications
                </Link>

                <div className="border-t border-[var(--forge-border)]">
                  <form action="/auth/signout" method="post">
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--forge-muted)] transition hover:bg-[color-mix(in_srgb,var(--forge-danger)_9%,transparent)] hover:text-[var(--forge-text)]"
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

        {feedbackOpen ? (
          <FeedbackDialogLoader
            onOpenChange={setFeedbackOpen}
            open={feedbackOpen}
          />
        ) : null}
        <main className="min-h-dvh pt-16">
          <RoleOnboardingGuide
            currentPath={currentPath}
            replaySignal={guideReplaySignal}
            role={user.role}
            userId={user.id}
          />
          {children}
        </main>
      </div>

      <CommandPalette
        onBeforeNavigate={setPendingHref}
        onOpenChange={setCommandOpen}
        open={commandOpen}
        role={user.role}
      />

      {/* ===== Mobile bottom tab bar ===== */}
      <nav
        aria-label="Primary"
        className="forge-bottom-bar fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around md:hidden"
        data-mobile-tabbar="true"
      >
        {bottomTabs.map((tab) => (
          <BottomTab
            active={isRouteActive(currentPath, tab.href)}
            key={tab.href}
            onClick={(event) => handleRouteLinkClick(event, tab.href)}
            tab={tab}
          />
        ))}
      </nav>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
  onClick,
  pending,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  collapsed: boolean;
  onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  pending: boolean;
}) {
  return (
    <Link
      aria-label={label}
      aria-current={active ? "page" : undefined}
      aria-describedby={pending ? "auth-navigation-status" : undefined}
      className={cn(
        "forge-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.84rem] font-medium md:h-11 md:justify-center md:px-0",
        collapsed
          ? "lg:h-11 lg:justify-center lg:px-0"
          : "lg:h-auto lg:justify-start lg:px-3",
        active && "forge-nav-link--active",
        pending && "forge-nav-link--pending",
      )}
      data-navigation-link={href}
      data-navigation-pending={pending ? "true" : undefined}
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <ForgeIcon name={icon} size={18} />
      <span
        className={cn(
          "truncate",
          collapsed ? "sr-only" : "sr-only lg:not-sr-only",
        )}
        data-primary-rail-label="true"
      >
        {label}
      </span>
    </Link>
  );
}

function BottomTab({
  tab,
  active,
  onClick,
}: {
  tab: BottomTabItem;
  active: boolean;
  onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  if (tab.fab) {
    return (
      <Link
        aria-label={tab.label}
        className="flex flex-1 items-center justify-center"
        data-global-create="upload"
        href={tab.href}
        onClick={onClick}
      >
        <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--forge-gold)] text-[var(--forge-on-accent)] shadow-[0_8px_24px_color-mix(in_srgb,var(--forge-gold)_40%,transparent)]">
          <ForgeIcon name={tab.icon} size={22} />
        </span>
      </Link>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={tab.label}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.62rem] font-semibold",
        active
          ? "text-[var(--forge-sidebar-active-text)]"
          : "text-[var(--forge-sidebar-muted)]",
      )}
      data-mobile-tab={tab.href}
      href={tab.href}
      onClick={onClick}
    >
      <ForgeIcon name={tab.icon} size={20} />
      <span>{tab.label}</span>
    </Link>
  );
}

function PrimaryRailToggleIcon({
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
      <path
        d="M7.25 4.75v10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
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

function isRouteActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function getNavigationPendingState({
  currentPath,
  destinations,
  pendingHref,
}: {
  currentPath: string;
  destinations: NavigationDestination[];
  pendingHref: string | null;
}): NavigationPendingState {
  if (!pendingHref || isRouteActive(currentPath, pendingHref)) {
    return {
      announcement: "",
      isPending: false,
      pendingHref: null,
    };
  }

  const destination = destinations.find((item) => item.href === pendingHref);

  return {
    announcement: `Opening ${destination?.label ?? "page"}`,
    isPending: true,
    pendingHref,
  };
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
