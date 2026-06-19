import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WORKSPACE_THEME } from "@/lib/organizations/workspace-theme";
import {
  AuthenticatedAppShell,
  getNavigationPendingState,
} from "../components/app-shell";

const { usePathnameMock, useRouterMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
}));

const managerUser = {
  email: "jared@example.com",
  fullName: "Jared Newman",
  id: "user-manager-1",
  orgName: "Argos Team",
  role: "manager" as const,
};

const adminUser = {
  ...managerUser,
  id: "user-admin-1",
  role: "admin" as const,
};

const platformSwitcher = {
  activeSession: {
    expiresAt: "2026-06-11T16:30:00.000Z",
    id: "session-1",
    reason: "Support escalation",
    targetOrgId: "org-1",
    targetOrgName: "Acme Health",
    targetOrgSlug: "acme-health",
  },
  organizations: [
    {
      createdAt: "2026-06-11T15:30:00.000Z",
      id: "org-1",
      name: "Acme Health",
      plan: "trial",
      slug: "acme-health",
    },
  ],
};

describe("AuthenticatedAppShell", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/dashboard");
  });

  it("renders clickable navigation for the recovered product routes", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    // Sidebar primary nav
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/calls"');
    expect(html).toContain('href="/highlights"');
    expect(html).toContain('href="/roleplay"');
    expect(html).toContain('href="/training"');
    expect(html).toContain('href="/leaderboard"');
    expect(html).toContain('href="/team"');
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('aria-label="Highlights"');
    expect(html).toContain('aria-label="Training"');
    expect(html).toContain('aria-label="Roleplay"');
    expect(html).toContain('aria-label="Leaderboard"');
    // Header topbar stays visually quiet; these actions live elsewhere.
    expect(html).not.toContain('data-navigation-link="/upload"');
    expect(html).not.toContain("Argos Team");
    // Account menu and bottom rail utility items
    expect(html).toContain('data-account-menu-item="feedback"');
    // Notifications lives in the System rail group, not duplicated in the menu.
    expect(html).not.toContain('data-account-menu-item="notifications"');
    expect(html).not.toContain('data-account-menu-item="settings"');
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('data-navigation-link="/settings"');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain('data-primary-rail-section-label="true"');
    // Option A: rail is grouped with section headers (manager sees all four).
    expect(html).toContain('data-primary-rail-section="Review"');
    expect(html).toContain("Coach");
    expect(html).toContain("People");
    expect(html).toContain("System");
    expect(html).not.toContain("Workspace scope");
    expect(html).not.toContain("Active scope");
    expect(html).not.toContain('href="/platform"');
    expect(html).not.toContain('data-navigation-link="/platform"');
    expect(html).not.toContain('data-platform-organization-switcher="true"');
    expect(html).not.toContain("Sub-accounts");
    expect(html).not.toContain("Platform staff");
    expect(html).toContain("Manager");
  });

  it("shows the platform organization switcher inside tenant pages during a platform session", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: adminUser,
        platformSwitcher,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-platform-organization-switcher="true"');
    expect(html).toContain('data-platform-organization-switcher-search="true"');
    expect(html).toContain('data-platform-organization-option="org-1"');
    expect(html).toContain('data-platform-session-endpoint="/api/platform/sessions"');
    expect(html).toContain("Switch organization");
    expect(html).toContain("Current organization");
    expect(html).toContain("Acme Health");
    expect(html).toContain("Return to platform dashboard");
    expect(html).toContain('data-platform-return-to-agency="true"');
    expect(html).not.toContain("Sub-account");
    expect(html).not.toContain("sub-account");
    expect(html).not.toContain("Subaccount");
    expect(html).not.toContain("subaccount");
  });

  it("hides the team navigation item for reps", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: {
          ...managerUser,
          role: "rep" as const,
        },
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).not.toContain('href="/team"');
  });

  it("renders a sign out control in the authenticated shell", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('action="/auth/signout"');
    expect(html).toContain("Sign out");
  });

  it("places the feedback launcher inside the account menu", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-account-menu-item="feedback"');
    expect(html).not.toContain('data-feedback-widget="true"');
    expect(html).toContain("Bugs and feedback");
  });

  it("renders a role-aware workspace launch guide for admins", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: adminUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-role-onboarding-guide="workspace-launch"');
    expect(html).toContain("Workspace launch guide");
    expect(html).toContain("Invite teammates");
    expect(html).toContain("Configure your rubric");
    expect(html).toContain("Product guide");
  });

  it("renders rep-specific first-run guidance without admin setup copy", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: {
          ...managerUser,
          id: "user-rep-1",
          role: "rep" as const,
        },
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-role-onboarding-guide="rep-start"');
    expect(html).toContain("Your sales practice guide");
    expect(html).toContain("Review your calls");
    expect(html).toContain("Open assigned training");
    expect(html).not.toContain("Invite teammates");
  });

  it("adds account menu semantics for keyboard users", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('aria-controls="account-menu"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('id="account-menu"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('tabindex="-1"');
  });

  it("uses the forge shell theme without blue active stripes", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-shell-theme="forge"');
    expect(html).toContain('data-mobile-tabbar="true"');
    expect(html).toContain("Revenue Command");
    expect(html).toContain('data-argos-logo="primary-rail"');
    expect(html).toContain('src="/argos_logo_background.png"');
    expect(html).toContain('aria-label="Collapse navigation"');
    expect(html).toContain('data-primary-rail-toggle-icon="collapse"');
    expect(html).not.toContain('data-forge-icon-name="chevron_left"');
    expect(html).not.toContain('data-forge-icon-name="insights"');
    expect(html).not.toContain("Sales forge");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("border-r-2");
  });

  it("scopes custom workspace theme and navigation variables onto the forge shell", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: {
          ...adminUser,
          workspaceTheme: {
            ...DEFAULT_WORKSPACE_THEME,
            activeMode: "dark",
            colors: {
              ...DEFAULT_WORKSPACE_THEME.colors,
              background: "#102030",
              primary: "#1A5FB4",
              onPrimary: "#FFFFFF",
              focus: "#8DD6FF",
            },
            modes: {
              ...DEFAULT_WORKSPACE_THEME.modes,
              dark: {
                colors: {
                  ...DEFAULT_WORKSPACE_THEME.modes.dark.colors,
                  background: "#102030",
                  primary: "#1A5FB4",
                  onPrimary: "#FFFFFF",
                  focus: "#8DD6FF",
                },
                navigation: {
                  ...DEFAULT_WORKSPACE_THEME.modes.dark.navigation,
                  leftBackground: "#081522",
                  leftActiveText: "#CDE6FF",
                  topBackground: "#0A1724",
                },
              },
            },
          },
        },
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain("--forge-bg:#102030");
    expect(html).toContain("--forge-gold:#1A5FB4");
    expect(html).toContain("--forge-on-accent:#FFFFFF");
    expect(html).toContain("--forge-focus:#8DD6FF");
    expect(html).toContain("--forge-sidebar-bg:#081522");
    expect(html).toContain("--forge-sidebar-active-text:#CDE6FF");
    expect(html).toContain("--forge-topbar-bg:#0A1724");
  });

  it("renders an uploaded organization logo in the primary rail when available", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: {
          ...managerUser,
          orgLogoUrl: "https://assets.example/org-logo.png",
        },
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('src="https://assets.example/org-logo.png"');
    expect(html).toContain('alt="Argos Team logo"');
    expect(html).toContain('data-primary-rail-org-logo="true"');
  });

  it("can render the desktop primary rail in an icon-only collapsed state", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        initialPrimaryRailCollapsed: true,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-primary-rail-collapsed="true"');
    expect(html).toContain("Expand navigation");
    expect(html).toContain('data-primary-rail-toggle-icon="expand"');
    expect(html).not.toContain('data-forge-icon-name="chevron_right"');
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('data-primary-rail-label="true"');
  });

  it("renders the Option-A grouped rail, single global upload, and mobile tab bar", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    // Grouped rail with a System group exposing notifications + settings.
    expect(html).toContain('data-primary-rail-section="Review"');
    expect(html).toContain('data-primary-rail-section="System"');
    expect(html).toContain('data-navigation-link="/notifications"');
    expect(html).toContain('data-navigation-link="/settings"');

    // One global create action — not a duplicated nav destination.
    expect(html).toContain('data-global-create="upload"');
    expect(html).not.toContain('data-navigation-link="/upload"');

    // Command palette trigger (⌘K) is present in the topbar.
    expect(html).toContain('data-command-trigger="true"');
    expect(html).toContain("⌘K");

    // Mobile bottom tab bar with the five Option-A slots.
    expect(html).toContain('data-mobile-tabbar="true"');
    expect(html).toContain('data-mobile-tab="/dashboard"');
    expect(html).toContain('data-mobile-tab="/calls"');
    expect(html).toContain('data-mobile-tab="/training"');
    expect(html).toContain('data-mobile-tab="/settings"');
  });

  it("marks only dense workspace routes for a docked secondary rail", () => {
    usePathnameMock.mockReturnValue("/training/builder");

    const builderHtml = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Builder body"),
      }),
    );

    expect(builderHtml).toContain('data-docked-secondary-rail="true"');
    expect(builderHtml).toContain('data-auth-shell-content="true"');
    expect(builderHtml).not.toContain("Curriculum bench");
    expect(builderHtml).not.toContain("Operating pulse");

    usePathnameMock.mockReturnValue("/training");

    const trainingHtml = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Training body"),
      }),
    );

    expect(trainingHtml).not.toContain('data-docked-secondary-rail="true"');

    usePathnameMock.mockReturnValue("/settings/people");

    const settingsHtml = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Settings body"),
      }),
    );

    expect(settingsHtml).toContain('data-docked-secondary-rail="true"');
  });

  it("keeps a clicked menu destination pending until the route catches up", () => {
    const pending = getNavigationPendingState({
      currentPath: "/dashboard",
      destinations: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/calls", label: "Calls" },
      ],
      pendingHref: "/calls",
    });

    expect(pending).toMatchObject({
      announcement: "Opening Calls",
      isPending: true,
      pendingHref: "/calls",
    });

    const settled = getNavigationPendingState({
      currentPath: "/calls",
      destinations: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/calls", label: "Calls" },
      ],
      pendingHref: "/calls",
    });

    expect(settled).toMatchObject({
      announcement: "",
      isPending: false,
      pendingHref: null,
    });
  });
});
