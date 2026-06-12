import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformConsole } from "../components/platform/platform-console";

const baseProps = {
  activeSession: null,
  currentUserEmail: "operator@argos.test",
  currentUserId: "staff-2",
  organizations: [
    {
      createdAt: "2026-06-11T15:30:00.000Z",
      id: "org-1",
      name: "Acme Health",
      plan: "trial",
      slug: "acme-health",
    },
  ],
  platformStaff: [
    {
      createdAt: "2026-06-10T15:30:00.000Z",
      email: "owner@argos.test",
      role: "owner" as const,
      status: "active" as const,
      updatedAt: "2026-06-10T15:30:00.000Z",
      userId: "staff-1",
    },
  ],
  query: "",
  staffRole: "owner" as const,
  staffStatus: "active" as const,
};

describe("PlatformConsole", () => {
  it("renders the platform shell, organization controls, and staff controls", () => {
    const html = renderToStaticMarkup(createElement(PlatformConsole, baseProps));

    expect(html).toContain('data-platform-console="true"');
    expect(html).toContain("Platform operations");
    expect(html).toContain("Acme Health");
    expect(html).toContain("acme-health");
    expect(html).toContain('data-platform-create-endpoint="/api/platform/organizations"');
    expect(html).toContain('data-platform-session-endpoint="/api/platform/sessions"');
    expect(html).toContain("Create organization");
    expect(html).toContain("Initial admin email");
    expect(html).toContain("Platform staff");
    expect(html).toContain('data-platform-staff-endpoint="/api/platform/staff"');
    expect(html).toContain("Staff email");
    expect(html).toContain("Revocation reason");
    expect(html).toContain("owner@argos.test");
    expect(html).toContain("operator@argos.test");
  });

  it("renders the active organization session banner", () => {
    const html = renderToStaticMarkup(
      createElement(PlatformConsole, {
        ...baseProps,
        activeSession: {
          expiresAt: "2026-06-11T16:30:00.000Z",
          id: "session-1",
          reason: "Support escalation",
          targetOrgId: "org-1",
          targetOrgName: "Acme Health",
          targetOrgSlug: "acme-health",
        },
      }),
    );

    expect(html).toContain("Active org session");
    expect(html).toContain("End session");
    expect(html).toContain("Support escalation");
    expect(html).toContain("Acme Health");
    expect(html).toContain('href="/dashboard"');
  });

  it("renders empty and search states without losing the creation flow", () => {
    const html = renderToStaticMarkup(
      createElement(PlatformConsole, {
        ...baseProps,
        organizations: [],
        query: "missing org",
      }),
    );

    expect(html).toContain("No organizations found");
    expect(html).toContain("missing org");
    expect(html).toContain("Create organization");
    expect(html).toContain("No active platform session");
  });
});
