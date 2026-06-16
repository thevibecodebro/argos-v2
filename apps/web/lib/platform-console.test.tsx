import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformCreateOrganizationPage } from "../components/platform/platform-create-organization-page";
import { PlatformDashboardPage } from "../components/platform/platform-dashboard-page";
import { PlatformOrganizationsPage } from "../components/platform/platform-organizations-page";
import { PlatformSessionsPage } from "../components/platform/platform-sessions-page";
import { PlatformShell } from "../components/platform/platform-shell";
import { PlatformStaffPage } from "../components/platform/platform-staff-page";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
  PlatformConsoleStaffMember,
} from "../components/platform/platform-types";
import { parsePlatformDashboardFilters } from "./platform/dashboard";

const organizations: PlatformConsoleOrganization[] = [
  {
    createdAt: "2026-06-11T15:30:00.000Z",
    id: "org-1",
    name: "Acme Health",
    plan: "trial",
    slug: "acme-health",
  },
];

const activeSession: PlatformConsoleActiveSession = {
  expiresAt: "2026-06-11T16:30:00.000Z",
  id: "session-1",
  reason: "Support escalation",
  targetOrgId: "org-1",
  targetOrgName: "Acme Health",
  targetOrgSlug: "acme-health",
};

const platformStaff: PlatformConsoleStaffMember[] = [
  {
    createdAt: "2026-06-10T15:30:00.000Z",
    email: "owner@argos.test",
    role: "owner",
    status: "active",
    updatedAt: "2026-06-10T15:30:00.000Z",
    userId: "staff-1",
  },
];

const shellProps = {
  activePath: "/platform/dashboard",
  activeSession: null,
  currentUserEmail: "operator@argos.test",
  organizationCount: organizations.length,
  organizations,
  staffRole: "owner" as const,
  staffStatus: "active" as const,
};

describe("PlatformShell", () => {
  it("renders real platform routes in the left rail", () => {
    const html = renderToStaticMarkup(
      createElement(PlatformShell, shellProps, "Platform content"),
    );

    expect(html).toContain('data-platform-shell="true"');
    expect(html).toContain('data-platform-sidebar="true"');
    expect(html).toContain('data-navigation-link="/platform/dashboard"');
    expect(html).toContain('data-navigation-link="/platform/organizations"');
    expect(html).toContain('data-navigation-link="/platform/sessions"');
    expect(html).toContain('data-navigation-link="/platform/staff"');
    expect(html).not.toContain('data-navigation-link="/platform/organizations/new"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Dashboard");
    expect(html).toContain("Organizations");
    expect(html).toContain("Sessions");
    expect(html).toContain("Staff");
    expect(html).not.toContain(">Create<");
    expect(html).not.toContain("#platform-");
    expect(html).not.toContain("Sub-account");
    expect(html).not.toContain("Subaccounts");
    expect(html).not.toContain("subaccount");
  });

  it("keeps organization view gated behind an active session", () => {
    const disabledHtml = renderToStaticMarkup(
      createElement(PlatformShell, shellProps, "Platform content"),
    );
    const activeHtml = renderToStaticMarkup(
      createElement(
        PlatformShell,
        { ...shellProps, activeSession },
        "Platform content",
      ),
    );

    expect(disabledHtml).toContain('data-platform-organization-view-link="disabled"');
    expect(activeHtml).toContain('data-platform-organization-view-link="active"');
    expect(activeHtml).toContain('href="/dashboard"');
  });

  it("provides a persistent GoHighLevel-style organization switcher in the platform shell", () => {
    const html = renderToStaticMarkup(
      createElement(
        PlatformShell,
        { ...shellProps, activeSession },
        "Platform content",
      ),
    );

    expect(html).toContain('data-platform-organization-switcher="true"');
    expect(html).toContain('data-platform-organization-switcher-search="true"');
    expect(html).toContain('data-platform-organization-option="org-1"');
    expect(html).toContain('data-platform-session-endpoint="/api/platform/sessions"');
    expect(html).toContain("Switch organization");
    expect(html).toContain("Acme Health");
    expect(html).toContain("Current organization");
    expect(html).not.toContain("Sub-account");
    expect(html).not.toContain("sub-account");
    expect(html).not.toContain("Subaccount");
    expect(html).not.toContain("subaccount");
  });
});

describe("platform page components", () => {
  it("renders the combined dashboard stats, filters, and risk queue", () => {
    const filters = parsePlatformDashboardFilters({}, new Date("2026-06-16T15:00:00.000Z"));
    const html = renderToStaticMarkup(
      createElement(PlatformDashboardPage, {
        dashboard: {
          alerts: [
            {
              count: 1,
              href: "/platform/dashboard?callStatus=failed",
              label: "Organizations with failed-call risk",
              severity: "warning",
            },
          ],
          filters,
          rows: [
            {
              activeSubscriptionCount: 1,
              averageScore: 64,
              completedTrainingAssignments: 1,
              createdAt: "2026-06-01T15:00:00.000Z",
              failedCalls: 1,
              id: "org-1",
              lastActivityAt: "2026-06-14T15:00:00.000Z",
              name: "Acme Health",
              plan: "trial",
              processingCalls: 0,
              reviewedCalls: 10,
              riskReasons: ["Avg score below 70"],
              riskScore: 2,
              seats: 5,
              slug: "acme-health",
              totalCalls: 10,
              totalTrainingAssignments: 4,
              trainingCompletionRate: 25,
            },
          ],
          summary: {
            activeOrganizations: 1,
            activeSeats: 5,
            atRiskOrganizations: 1,
            callsReviewed: 10,
            reviewCompletionRate: 100,
            totalOrganizations: 1,
          },
        },
      }),
    );

    expect(html).toContain('data-platform-dashboard-page="true"');
    expect(html).toContain('data-platform-dashboard-filters="true"');
    expect(html).toContain('data-platform-dashboard-alerts="true"');
    expect(html).toContain('data-platform-risk-queue="true"');
    expect(html).toContain("Organizations needing attention");
    expect(html).toContain("Organizations with failed-call risk");
    expect(html).toContain("Active organizations");
    expect(html).toContain("Calls reviewed");
    expect(html).toContain("Review completion");
    expect(html).toContain("At risk");
    expect(html).toContain("Active seats");
    expect(html).toContain("Avg score below 70");
    expect(html).toContain('href="/platform/organizations/acme-health"');
  });

  it("renders organizations as a focused table with audited session actions", () => {
    const html = renderToStaticMarkup(
      createElement(PlatformOrganizationsPage, {
        activeSession: null,
        organizations,
        query: "",
      }),
    );

    expect(html).toContain('data-platform-organizations-page="true"');
    expect(html).toContain('data-platform-primary-table="organizations"');
    expect(html).toContain('data-platform-session-endpoint="/api/platform/sessions"');
    expect(html).toContain("Acme Health");
    expect(html).toContain('href="/platform/organizations/acme-health"');
    expect(html).toContain("Start session");
    expect(html).not.toContain("#platform-");
  });

  it("renders sessions, create, and staff pages as separate workspaces", () => {
    const sessionsHtml = renderToStaticMarkup(
      createElement(PlatformSessionsPage, {
        activeSession,
        organizations,
        recentSessions: [
          {
            endedAt: null,
            expiresAt: "2026-06-11T16:30:00.000Z",
            id: "session-1",
            reason: "Support escalation",
            staffEmailSnapshot: "operator@argos.test",
            startedAt: "2026-06-11T15:30:00.000Z",
            status: "active",
            targetOrgName: "Acme Health",
            targetOrgSlug: "acme-health",
          },
        ],
        auditEvents: [
          {
            action: "platform.session.create",
            createdAt: "2026-06-11T15:30:00.000Z",
            id: "audit-1",
            reason: "Support escalation",
            resourceType: "platform_access_session",
            staffEmailSnapshot: "operator@argos.test",
          },
        ],
      }),
    );
    const createHtml = renderToStaticMarkup(
      createElement(PlatformCreateOrganizationPage),
    );
    const staffHtml = renderToStaticMarkup(
      createElement(PlatformStaffPage, {
        currentUserId: "staff-2",
        platformStaff,
        staffRole: "owner",
      }),
    );

    expect(sessionsHtml).toContain('data-platform-sessions-page="true"');
    expect(sessionsHtml).toContain("Recent sessions");
    expect(sessionsHtml).toContain("expired");
    expect(sessionsHtml).toContain("Audit events");
    expect(sessionsHtml).toContain("platform.session.create");
    expect(createHtml).toContain('data-platform-create-page="true"');
    expect(createHtml).toContain('data-platform-create-organization-page="true"');
    expect(createHtml).toContain('data-platform-create-endpoint="/api/platform/organizations"');
    expect(staffHtml).toContain('data-platform-staff-page="true"');
    expect(staffHtml).toContain('data-platform-staff-endpoint="/api/platform/staff"');
  });
});
