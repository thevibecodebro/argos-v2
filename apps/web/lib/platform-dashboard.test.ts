import { describe, expect, it } from "vitest";
import {
  buildPlatformDashboardSnapshot,
  parsePlatformDashboardFilters,
} from "./platform/dashboard";

const now = new Date("2026-06-16T15:00:00.000Z");

const baseFilters = parsePlatformDashboardFilters({}, now);

describe("platform dashboard aggregates", () => {
  it("builds combined organization health, usage, and risk stats", () => {
    const snapshot = buildPlatformDashboardSnapshot({
      filters: baseFilters,
      now,
      organizations: [
        {
          activeSubscriptionCount: 1,
          completedTrainingAssignments: 2,
          createdAt: "2026-05-01T15:00:00.000Z",
          failedCalls: 2,
          id: "org-1",
          lastActivityAt: "2026-06-15T15:00:00.000Z",
          name: "Acme Health",
          plan: "pro",
          processingCalls: 1,
          reviewedCalls: 8,
          seats: 10,
          slug: "acme-health",
          totalCalls: 10,
          totalTrainingAssignments: 4,
          averageScore: 82,
        },
        {
          activeSubscriptionCount: 1,
          completedTrainingAssignments: 0,
          createdAt: "2026-04-01T15:00:00.000Z",
          failedCalls: 0,
          id: "org-2",
          lastActivityAt: "2026-05-20T15:00:00.000Z",
          name: "C Love",
          plan: "trial",
          processingCalls: 0,
          reviewedCalls: 0,
          seats: 4,
          slug: "c-love",
          totalCalls: 0,
          totalTrainingAssignments: 0,
          averageScore: null,
        },
        {
          activeSubscriptionCount: 0,
          completedTrainingAssignments: 1,
          createdAt: "2026-05-15T15:00:00.000Z",
          failedCalls: 1,
          id: "org-3",
          lastActivityAt: "2026-06-14T15:00:00.000Z",
          name: "Northstar",
          plan: "enterprise",
          processingCalls: 0,
          reviewedCalls: 10,
          seats: 0,
          slug: "northstar",
          totalCalls: 10,
          totalTrainingAssignments: 4,
          averageScore: 64,
        },
      ],
    });

    expect(snapshot.summary.totalOrganizations).toBe(3);
    expect(snapshot.summary.activeOrganizations).toBe(2);
    expect(snapshot.summary.callsReviewed).toBe(18);
    expect(snapshot.summary.reviewCompletionRate).toBe(90);
    expect(snapshot.summary.atRiskOrganizations).toBe(3);
    expect(snapshot.summary.activeSeats).toBe(14);
    expect(snapshot.rows.map((row) => row.name)).toEqual([
      "Northstar",
      "C Love",
      "Acme Health",
    ]);
    expect(snapshot.rows[0]?.riskReasons).toEqual([
      "Avg score below 70",
      "Training completion below 50%",
    ]);
    expect(snapshot.rows[1]?.riskReasons).toEqual(["No activity in 14 days"]);
    expect(snapshot.rows[2]?.riskReasons).toEqual(["Failed calls above 10%"]);
    expect(snapshot.alerts).toEqual([
      {
        count: 1,
        href: "/platform/dashboard?callStatus=processing",
        label: "Organizations with processing backlog",
        severity: "warning",
      },
      {
        count: 1,
        href: "/platform/dashboard?callStatus=failed",
        label: "Organizations with failed-call risk",
        severity: "warning",
      },
      {
        count: 1,
        href: "/platform/dashboard?activity=inactive",
        label: "Inactive organizations",
        severity: "info",
      },
    ]);
  });

  it("parses filters and narrows the organization queue", () => {
    const filters = parsePlatformDashboardFilters(
      {
        activity: "at-risk",
        callStatus: "failed",
        plan: "pro",
        q: "acme",
        range: "90d",
      },
      now,
    );

    const snapshot = buildPlatformDashboardSnapshot({
      filters,
      now,
      organizations: [
        {
          activeSubscriptionCount: 1,
          completedTrainingAssignments: 2,
          createdAt: "2026-05-01T15:00:00.000Z",
          failedCalls: 2,
          id: "org-1",
          lastActivityAt: "2026-06-15T15:00:00.000Z",
          name: "Acme Health",
          plan: "pro",
          processingCalls: 0,
          reviewedCalls: 8,
          seats: 10,
          slug: "acme-health",
          totalCalls: 10,
          totalTrainingAssignments: 4,
          averageScore: 82,
        },
        {
          activeSubscriptionCount: 1,
          completedTrainingAssignments: 1,
          createdAt: "2026-05-01T15:00:00.000Z",
          failedCalls: 0,
          id: "org-2",
          lastActivityAt: "2026-06-15T15:00:00.000Z",
          name: "Beta Health",
          plan: "pro",
          processingCalls: 0,
          reviewedCalls: 8,
          seats: 8,
          slug: "beta-health",
          totalCalls: 8,
          totalTrainingAssignments: 2,
          averageScore: 88,
        },
      ],
    });

    expect(filters.range).toBe("90d");
    expect(filters.from.toISOString()).toBe("2026-03-18T15:00:00.000Z");
    expect(snapshot.rows).toHaveLength(1);
    expect(snapshot.rows[0]?.slug).toBe("acme-health");
    expect(snapshot.summary.totalOrganizations).toBe(1);
  });

  it("keeps alert counts and links aligned with active filters", () => {
    const filters = parsePlatformDashboardFilters(
      {
        activity: "at-risk",
        callStatus: "complete",
        plan: "pro",
        q: "acme",
        range: "90d",
      },
      now,
    );

    const snapshot = buildPlatformDashboardSnapshot({
      filters,
      now,
      organizations: [
        {
          activeSubscriptionCount: 1,
          completedTrainingAssignments: 1,
          createdAt: "2026-05-01T15:00:00.000Z",
          failedCalls: 2,
          id: "org-1",
          lastActivityAt: "2026-06-15T15:00:00.000Z",
          name: "Acme Health",
          plan: "pro",
          processingCalls: 3,
          reviewedCalls: 8,
          seats: 10,
          slug: "acme-health",
          totalCalls: 10,
          totalTrainingAssignments: 4,
          averageScore: 82,
        },
        {
          activeSubscriptionCount: 1,
          completedTrainingAssignments: 1,
          createdAt: "2026-05-01T15:00:00.000Z",
          failedCalls: 2,
          id: "org-2",
          lastActivityAt: "2026-06-15T15:00:00.000Z",
          name: "Beta Health",
          plan: "pro",
          processingCalls: 2,
          reviewedCalls: 8,
          seats: 8,
          slug: "beta-health",
          totalCalls: 10,
          totalTrainingAssignments: 4,
          averageScore: 82,
        },
      ],
    });

    expect(snapshot.rows.map((row) => row.slug)).toEqual(["acme-health"]);
    expect(snapshot.alerts).toEqual([
      {
        count: 1,
        href: "/platform/dashboard?q=acme&range=90d&plan=pro&activity=at-risk&callStatus=processing",
        label: "Organizations with processing backlog",
        severity: "warning",
      },
      {
        count: 1,
        href: "/platform/dashboard?q=acme&range=90d&plan=pro&activity=at-risk&callStatus=failed",
        label: "Organizations with failed-call risk",
        severity: "warning",
      },
    ]);
  });

  it("does not mark a fresh organization with no activity as inactive", () => {
    const snapshot = buildPlatformDashboardSnapshot({
      filters: baseFilters,
      now,
      organizations: [
        {
          activeSubscriptionCount: 0,
          completedTrainingAssignments: 0,
          createdAt: "2026-06-16T14:00:00.000Z",
          failedCalls: 0,
          id: "org-1",
          lastActivityAt: null,
          name: "Fresh Org",
          plan: "trial",
          processingCalls: 0,
          reviewedCalls: 0,
          seats: 0,
          slug: "fresh-org",
          totalCalls: 0,
          totalTrainingAssignments: 0,
          averageScore: null,
        },
        {
          activeSubscriptionCount: 0,
          completedTrainingAssignments: 0,
          createdAt: "2026-05-01T15:00:00.000Z",
          failedCalls: 0,
          id: "org-2",
          lastActivityAt: null,
          name: "Old Org",
          plan: "trial",
          processingCalls: 0,
          reviewedCalls: 0,
          seats: 0,
          slug: "old-org",
          totalCalls: 0,
          totalTrainingAssignments: 0,
          averageScore: null,
        },
      ],
    });

    expect(snapshot.alerts).toEqual([
      {
        count: 1,
        href: "/platform/dashboard?activity=inactive",
        label: "Inactive organizations",
        severity: "info",
      },
    ]);
  });
});
