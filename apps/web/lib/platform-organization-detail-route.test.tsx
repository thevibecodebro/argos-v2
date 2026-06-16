import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrganizationDetailSnapshot = vi.fn();
const getPlatformPageContext = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound,
}));

vi.mock("@/lib/platform/page-context", () => ({
  getPlatformPageContext,
}));

describe("Platform organization detail route", () => {
  beforeEach(() => {
    vi.resetModules();
    getOrganizationDetailSnapshot.mockReset();
    getPlatformPageContext.mockReset();
    notFound.mockClear();

    getPlatformPageContext.mockResolvedValue({
      activeSession: null,
      currentUserEmail: "operator@argos.test",
      repository: {
        getOrganizationDetailSnapshot,
      },
      staff: { role: "owner", status: "active", userId: "staff-1" },
    });
    getOrganizationDetailSnapshot.mockResolvedValue({
      access: { activeSessionCount: 0, recentSessions: [] },
      alerts: [
        { label: "No active admin", severity: "critical" },
        { label: "Processing backlog", severity: "warning" },
      ],
      auditEvents: [
        {
          action: "platform.organization.create",
          createdAt: "2026-06-16T15:00:00.000Z",
          id: "event-1",
          reason: "Customer launch",
          resourceType: "organization",
          staffEmailSnapshot: "owner@argos.test",
        },
      ],
      billing: { activeSubscriptionCount: 1, seats: 4, subscriptions: [] },
      callStats: {
        averageScore: 64,
        failedCalls: 1,
        lastCallAt: "2026-06-15T15:00:00.000Z",
        processingCalls: 2,
        reviewedCalls: 8,
        totalCalls: 10,
      },
      invites: [],
      members: [],
      organization: {
        createdAt: "2026-06-01T15:00:00.000Z",
        id: "org-1",
        name: "Acme Health",
        plan: "trial",
        slug: "acme-health",
      },
      roleplayStats: { lastRoleplayAt: null, roleplaySessions: 0 },
      summary: {
        admins: 0,
        members: 0,
        pendingInvites: 0,
        trainingCompletionRate: null,
      },
      trainingStats: {
        completedTrainingAssignments: 0,
        totalTrainingAssignments: 0,
      },
    });
  });

  it("renders one organization as a support workspace", async () => {
    const route = await import("../app/platform/organizations/[slug]/page");
    const element = await route.default({
      params: Promise.resolve({ slug: "acme-health" }),
    });

    const html = renderToStaticMarkup(element);

    expect(getPlatformPageContext).toHaveBeenCalledWith({
      pathname: "/platform/organizations/acme-health",
    });
    expect(getOrganizationDetailSnapshot).toHaveBeenCalledWith("acme-health");
    expect(html).toContain('data-platform-organization-detail-page="true"');
    expect(html).toContain("Acme Health");
    expect(html).toContain("No active admin");
    expect(html).toContain("Processing backlog");
    expect(html).toContain("Billing");
    expect(html).toContain("Access");
    expect(html).toContain("Audit events");
    expect(html).not.toContain("Sub-account");
  });

  it("uses notFound for a missing organization", async () => {
    getOrganizationDetailSnapshot.mockResolvedValueOnce(null);

    const route = await import("../app/platform/organizations/[slug]/page");

    await expect(
      route.default({
        params: Promise.resolve({ slug: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
