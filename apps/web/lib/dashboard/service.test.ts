import { describe, expect, it, vi } from "vitest";
import {
  getCurrentUserProfile,
  getDashboardSummary,
  type DashboardRepository,
} from "./service";

function createRepository(
  overrides: Partial<DashboardRepository> = {},
): DashboardRepository {
  return {
    findCurrentUserByAuthId: vi.fn(),
    findRecentCallsByRepId: vi.fn(),
    findScoredCallsByRepIdSince: vi.fn(),
    ...overrides,
  };
}

describe("getCurrentUserProfile", () => {
  it("returns null when the authenticated user is not provisioned in the app database", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
    });

    const profile = await getCurrentUserProfile(repository, "auth-user-id");

    expect(profile).toBeNull();
  });

  it("maps the database record into an app-facing profile", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "5eb6eb29-8da8-457d-a2c6-9afd2308672d",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: {
          id: "de6607b8-355c-461d-a80c-f1a342f7028f",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
    });

    const profile = await getCurrentUserProfile(repository, "auth-user-id");

    expect(profile).toEqual({
      id: "5eb6eb29-8da8-457d-a2c6-9afd2308672d",
      email: "rep@argos.ai",
      role: "rep",
      fullName: "Riley Stone",
      org: {
        id: "de6607b8-355c-461d-a80c-f1a342f7028f",
        name: "Argos Demo Org",
        slug: "argos-demo-org",
        plan: "trial",
      },
    });
  });
});

describe("getDashboardSummary", () => {
  it("returns null when there is no current user record", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
    });

    const summary = await getDashboardSummary(repository, "auth-user-id", new Date("2026-03-27T00:00:00.000Z"));

    expect(summary).toBeNull();
  });

  it("builds the dashboard summary from recent calls and 30-day scored calls", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "5eb6eb29-8da8-457d-a2c6-9afd2308672d",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: {
          id: "de6607b8-355c-461d-a80c-f1a342f7028f",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
      findRecentCallsByRepId: vi.fn().mockResolvedValue([
        {
          id: "call-3",
          callTopic: "ACME renewal",
          createdAt: new Date("2026-03-26T12:00:00.000Z"),
          overallScore: 88,
          status: "complete",
        },
        {
          id: "call-2",
          callTopic: "Northstar discovery",
          createdAt: new Date("2026-03-20T12:00:00.000Z"),
          overallScore: null,
          status: "evaluating",
        },
      ]),
      findScoredCallsByRepIdSince: vi.fn().mockResolvedValue([
        {
          id: "call-3",
          callTopic: "ACME renewal",
          createdAt: new Date("2026-03-26T12:00:00.000Z"),
          overallScore: 88,
          status: "complete",
        },
        {
          id: "call-1",
          callTopic: "Globex objection handling",
          createdAt: new Date("2026-03-10T12:00:00.000Z"),
          overallScore: 72,
          status: "complete",
        },
      ]),
    });

    const summary = await getDashboardSummary(
      repository,
      "auth-user-id",
      new Date("2026-03-27T00:00:00.000Z"),
    );

    expect(summary).toEqual({
      user: {
        id: "5eb6eb29-8da8-457d-a2c6-9afd2308672d",
        email: "rep@argos.ai",
        role: "rep",
        fullName: "Riley Stone",
        org: {
          id: "de6607b8-355c-461d-a80c-f1a342f7028f",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      },
      metrics: {
        rolling30DayAverageScore: 80,
        callsReviewed30Days: 2,
      },
      recentCalls: [
        {
          id: "call-3",
          callTopic: "ACME renewal",
          createdAt: "2026-03-26T12:00:00.000Z",
          overallScore: 88,
          status: "complete",
        },
        {
          id: "call-2",
          callTopic: "Northstar discovery",
          createdAt: "2026-03-20T12:00:00.000Z",
          overallScore: null,
          status: "evaluating",
        },
      ],
    });
  });
});
