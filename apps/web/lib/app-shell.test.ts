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
    expect(html).toContain('href="/notifications"');
    // Account menu
    expect(html).toContain('href="/settings"');
    expect(html).toContain("Review");
    expect(html).toContain("Coach");
    expect(html).toContain("People");
    expect(html).toContain("System");
    expect(html).toContain("Workspace scope");
    expect(html).toContain("Manager view");
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

  it("uses the forge shell theme without blue active stripes", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('data-shell-theme="forge"');
    expect(html).toContain("Open navigation");
    expect(html).toContain("Sales forge");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("border-r-2");
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
});
