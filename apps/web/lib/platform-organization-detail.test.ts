import { describe, expect, it } from "vitest";
import { buildPlatformOrganizationDetailSnapshot } from "./platform/organization-detail";

const organization = {
  createdAt: "2026-06-01T15:00:00.000Z",
  id: "org-1",
  name: "Acme Health",
  plan: "trial",
  slug: "acme-health",
};

describe("buildPlatformOrganizationDetailSnapshot", () => {
  it("prioritizes useful platform alerts for one organization", () => {
    const snapshot = buildPlatformOrganizationDetailSnapshot({
      accessSessions: [],
      auditEvents: [],
      billingSubscriptions: [],
      callStats: {
        averageScore: 62,
        failedCalls: 3,
        lastCallAt: "2026-06-15T15:00:00.000Z",
        processingCalls: 2,
        reviewedCalls: 8,
        totalCalls: 12,
      },
      invites: [
        {
          acceptedAt: null,
          createdAt: "2026-06-14T15:00:00.000Z",
          email: "admin@acme.test",
          expiresAt: "2026-06-21T15:00:00.000Z",
          id: "invite-1",
          role: "admin",
        },
      ],
      members: [],
      now: new Date("2026-06-16T15:00:00.000Z"),
      organization,
      roleplayStats: { lastRoleplayAt: null, roleplaySessions: 0 },
      trainingStats: {
        completedTrainingAssignments: 1,
        totalTrainingAssignments: 4,
      },
    });

    expect(snapshot.alerts.map((alert) => alert.label)).toEqual([
      "No active admin",
      "Processing backlog",
      "Failed calls above 10%",
      "Avg score below 70",
      "Training completion below 50%",
    ]);
    expect(snapshot.summary.admins).toBe(0);
    expect(snapshot.summary.pendingInvites).toBe(1);
    expect(snapshot.summary.trainingCompletionRate).toBe(25);
    expect(snapshot.adminInviteResend).toEqual({
      email: "admin@acme.test",
      expiresAt: "2026-06-21T15:00:00.000Z",
    });
  });

  it("summarizes billing and active access without adding nav jobs", () => {
    const snapshot = buildPlatformOrganizationDetailSnapshot({
      accessSessions: [
        {
          endedAt: null,
          expiresAt: "2099-06-16T16:00:00.000Z",
          id: "session-1",
          reason: "Support review",
          staffEmailSnapshot: "owner@argos.test",
          startedAt: "2099-06-16T15:00:00.000Z",
          status: "active",
        },
      ],
      auditEvents: [],
      billingSubscriptions: [
        {
          seatCount: 6,
          status: "trialing",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
        },
      ],
      callStats: {
        averageScore: 82,
        failedCalls: 0,
        lastCallAt: "2026-06-15T15:00:00.000Z",
        processingCalls: 0,
        reviewedCalls: 8,
        totalCalls: 8,
      },
      invites: [],
      members: [
        { email: "admin@acme.test", id: "user-1", role: "admin" },
        { email: "rep@acme.test", id: "user-2", role: "rep" },
      ],
      organization,
      roleplayStats: { lastRoleplayAt: "2026-06-15T15:00:00.000Z", roleplaySessions: 2 },
      trainingStats: {
        completedTrainingAssignments: 4,
        totalTrainingAssignments: 4,
      },
    });

    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.billing.activeSubscriptionCount).toBe(1);
    expect(snapshot.billing.seats).toBe(6);
    expect(snapshot.billing.subscriptions).toHaveLength(1);
    expect(snapshot.access.activeSessionCount).toBe(1);
    expect(snapshot.summary.members).toBe(2);
    expect(snapshot.adminInviteResend).toBeNull();
  });

  it("normalizes expired active access sessions for display", () => {
    const snapshot = buildPlatformOrganizationDetailSnapshot({
      accessSessions: [
        {
          endedAt: null,
          expiresAt: "2026-06-16T14:00:00.000Z",
          id: "session-1",
          reason: "Past support review",
          staffEmailSnapshot: "owner@argos.test",
          startedAt: "2026-06-16T13:00:00.000Z",
          status: "active",
        },
      ],
      auditEvents: [],
      billingSubscriptions: [],
      callStats: {
        averageScore: null,
        failedCalls: 0,
        lastCallAt: null,
        processingCalls: 0,
        reviewedCalls: 0,
        totalCalls: 0,
      },
      invites: [],
      members: [{ email: "admin@acme.test", id: "user-1", role: "admin" }],
      now: new Date("2026-06-16T15:00:00.000Z"),
      organization,
      roleplayStats: { lastRoleplayAt: null, roleplaySessions: 0 },
      trainingStats: {
        completedTrainingAssignments: 0,
        totalTrainingAssignments: 0,
      },
    });

    expect(snapshot.access.activeSessionCount).toBe(0);
    expect(snapshot.access.recentSessions[0]?.status).toBe("expired");
  });
});
