import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthenticatedAppShell } from "../components/app-shell";

const managerUser = {
  email: "jared@example.com",
  fullName: "Jared Newman",
  orgName: "Argos Team",
  role: "manager" as const,
};

describe("AuthenticatedAppShell", () => {
  it("renders clickable navigation for the recovered product routes", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        currentPath: "/dashboard",
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
  });

  it("hides the team navigation item for reps", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedAppShell, {
        currentPath: "/dashboard",
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
        currentPath: "/dashboard",
        user: managerUser,
        children: createElement("div", null, "Page body"),
      }),
    );

    expect(html).toContain('action="/auth/signout"');
    expect(html).toContain("Sign out");
  });
});
