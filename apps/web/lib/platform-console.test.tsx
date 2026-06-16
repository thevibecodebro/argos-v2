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
    expect(html).toContain('data-platform-layout="agency-control-plane"');
    expect(html).toContain("Agency workspace");
    expect(html).toContain("Organizations");
    expect(html).toContain('id="platform-organizations"');
    expect(html).toContain('id="platform-session"');
    expect(html).toContain('data-platform-primary-table="organizations"');
    expect(html).toContain('data-platform-selected-organization="org-1"');
    expect(html).toContain('data-platform-action-panel="true"');
    expect(html).toContain("Switch organization");
    expect(html).toMatch(/<th[^>]*>Organization<\/th>[\s\S]*<th[^>]*>Plan<\/th>[\s\S]*<th[^>]*>Created<\/th>/);
    expect(html).toContain("Acme Health");
    expect(html).toContain("acme-health");
    expect(html).toContain('data-platform-create-endpoint="/api/platform/organizations"');
    expect(html).toContain('data-platform-session-endpoint="/api/platform/sessions"');
    expect(html).toContain("Create organization");
    expect(html).toContain("Initial admin email");
    expect(html).toContain("Platform staff");
    expect(html).toContain("Staff access stays separate from customer organization roles.");
    expect(html).toContain('data-platform-staff-endpoint="/api/platform/staff"');
    expect(html).toContain("Staff email");
    expect(html).toContain("Revocation reason");
    expect(html).toContain("owner@argos.test");
    expect(html).toContain("operator@argos.test");
    expect(html).not.toContain("Platform operations");
    expect(html).not.toContain("Customer accounts");
    expect(html).not.toContain("Org switch");
    expect(html).not.toContain("Switch account");
    expect(html).not.toContain("select the account");
    expect(html).not.toContain("Select an account");
    expect(html).not.toContain("New customer account");
    expect(html).not.toContain("Sub-account");
    expect(html).not.toContain("Subaccounts");
    expect(html).not.toContain("sub-account");
    expect(html).not.toContain("subaccount");
    expect(html).not.toContain('data-operational-metric-strip="true"');
  });

  it("keeps staff mutation UI owner-only and protects the current owner from self-revoke", () => {
    const operatorHtml = renderToStaticMarkup(
      createElement(PlatformConsole, {
        ...baseProps,
        staffRole: "operator" as const,
      }),
    );

    expect(operatorHtml).toContain("Owner role is required for staff membership changes.");
    expect(operatorHtml).not.toContain('data-platform-staff-endpoint="/api/platform/staff"');
    expect(operatorHtml).not.toContain("Revocation reason");

    const selfOnlyOwnerHtml = renderToStaticMarkup(
      createElement(PlatformConsole, {
        ...baseProps,
        currentUserId: "staff-1",
      }),
    );

    expect(selfOnlyOwnerHtml).toContain('data-platform-staff-endpoint="/api/platform/staff"');
    expect(selfOnlyOwnerHtml).not.toContain("Revocation reason");
    expect(selfOnlyOwnerHtml).not.toContain("Revoke");
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

    expect(html).toContain("Active organization session");
    expect(html).toContain("Back to agency view");
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
