import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticatedAppShell } from "../components/app-shell";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

const managerUser = {
  email: "jared@example.com",
  fullName: "Jared Newman",
  orgName: "Argos Team",
  role: "manager" as const,
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
    // Header items
    expect(html).toContain('href="/upload"');
    // Account menu and bottom rail utility items
    expect(html).toContain('data-account-menu-item="notifications"');
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('data-primary-rail-footer-link="settings"');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain('data-primary-rail-section-label="true"');
    expect(html).not.toContain("Review");
    expect(html).not.toContain("Coach");
    expect(html).not.toContain("People");
    expect(html).not.toContain("System");
    expect(html).not.toContain("Workspace scope");
    expect(html).not.toContain("Active scope");
    expect(html).toContain("Manager");
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
    expect(html).toContain("Open navigation");
    expect(html).toContain("Revenue Command");
    expect(html).not.toContain("Sales forge");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("border-r-2");
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
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('data-primary-rail-label="true"');
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
});
