import { describe, expect, it, vi } from "vitest";
import {
  getDashboardLeaderboard,
  getExecutiveDashboard,
  getManagerDashboard,
  getCurrentUserProfile,
  getRepDashboard,
  getRepBadges,
  getDashboardSummary,
  getSetupStatus,
  type DashboardRepository,
} from "./service";

function createAccessRepository(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    findActorByAuthUserId: vi.fn(),
    findMembershipsByOrgId: vi.fn(),
    findGrantsByUserId: vi.fn(),
    ...overrides,
  } as {
    findActorByAuthUserId: (authUserId: string) => Promise<{ id: string; role: "admin" | "executive" | "manager" | "rep" | null; orgId: string | null } | null>;
    findMembershipsByOrgId: (orgId: string) => Promise<Array<{ orgId: string; teamId: string; userId: string; membershipType: "rep" | "manager" }>>;
    findGrantsByUserId: (userId: string, orgId: string) => Promise<Array<{ orgId: string; teamId: string; userId: string; permissionKey: "view_team_calls" | "coach_team_calls" | "manage_call_highlights" | "view_team_training" | "manage_team_training" | "manage_team_roster" | "view_team_analytics" }>>;
  };
}

function createRepository(
  overrides: Partial<DashboardRepository> = {},
): DashboardRepository {
  return {
    findCurrentUserByAuthId: vi.fn(),
    findCallCountByOrgIdSince: vi.fn(),
    findCompletedCallsByOrgId: vi.fn(),
    findCompletedCallsByRepId: vi.fn(),
    findCompletedRoleplayCountByOrgId: vi.fn(),
    findCompletedRoleplaysByRepId: vi.fn(),
    findOrgUsersByOrgId: vi.fn(),
    findPassedTrainingByRepId: vi.fn(),
    findRecentCallsByRepId: vi.fn(),
    findScoredCallsByRepIdSince: vi.fn(),
    findTrainingProgressByOrgId: vi.fn(),
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

describe("getManagerDashboard", () => {
  it("scopes manager dashboards to granted teams", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_analytics" },
      ]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
      findOrgUsersByOrgId: vi.fn().mockResolvedValue([
        {
          id: "rep-1",
          email: "jay@argos.ai",
          role: "rep",
          firstName: "Jay",
          lastName: "Newman",
          profileImageUrl: null,
        },
        {
          id: "rep-2",
          email: "taylor@argos.ai",
          role: "rep",
          firstName: "Taylor",
          lastName: "Stone",
          profileImageUrl: null,
        },
      ]),
      findCompletedCallsByOrgId: vi.fn().mockResolvedValue([
        {
          id: "call-1",
          repId: "rep-1",
          overallScore: 70,
          frameControlScore: 68,
          rapportScore: 66,
          discoveryScore: 64,
          painExpansionScore: 62,
          solutionScore: 60,
          objectionScore: 58,
          closingScore: 72,
          durationSeconds: 1800,
          callTopic: "ACME renewal",
          createdAt: new Date("2026-03-25T12:00:00.000Z"),
        },
        {
          id: "call-2",
          repId: "rep-1",
          overallScore: 90,
          frameControlScore: 88,
          rapportScore: 86,
          discoveryScore: 84,
          painExpansionScore: 82,
          solutionScore: 80,
          objectionScore: 78,
          closingScore: 92,
          durationSeconds: 1500,
          callTopic: "Globex discovery",
          createdAt: new Date("2026-03-19T12:00:00.000Z"),
        },
        {
          id: "call-3",
          repId: "rep-2",
          overallScore: 85,
          frameControlScore: 84,
          rapportScore: 82,
          discoveryScore: 80,
          painExpansionScore: 78,
          solutionScore: 76,
          objectionScore: 74,
          closingScore: 88,
          durationSeconds: 2100,
          callTopic: "Northstar follow-up",
          createdAt: new Date("2026-03-24T12:00:00.000Z"),
        },
        {
          id: "call-4",
          repId: "rep-2",
          overallScore: 92,
          frameControlScore: 90,
          rapportScore: 89,
          discoveryScore: 87,
          painExpansionScore: 86,
          solutionScore: 85,
          objectionScore: 84,
          closingScore: 93,
          durationSeconds: 2400,
          callTopic: "Wayfinder close",
          createdAt: new Date("2026-03-11T12:00:00.000Z"),
        },
      ]),
      findCallCountByOrgIdSince: vi.fn().mockResolvedValue(6),
    });

    const result = await getManagerDashboard(
      repository,
      "manager-1",
      new Date("2026-03-27T00:00:00.000Z"),
      accessRepository as never,
    );

    expect(result).toEqual({
      reps: [
        {
          id: "rep-1",
          firstName: "Jay",
          lastName: "Newman",
          profileImageUrl: null,
          compositeScore: 80,
          weekOverWeekDelta: -20,
          needsCoaching: true,
          callCount: 2,
        },
      ],
      teamAvgScore: 80,
      totalCallsThisMonth: 2,
      coachingFlagsCount: 1,
    });
  });
});

describe("getRepDashboard", () => {
  it("keeps leaderboard drilldown scoped to granted teams", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-outside-scope", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_analytics" },
      ]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
    });

    await expect(
      getRepDashboard(
        repository,
        "manager-1",
        "rep-outside-scope",
        new Date("2026-03-27T00:00:00.000Z"),
        accessRepository as never,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("getDashboardLeaderboard", () => {
  it("builds top quality, volume, and most improved leaderboards for the current org", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
      findOrgUsersByOrgId: vi.fn().mockResolvedValue([
        { id: "rep-1", email: "jay@argos.ai", role: "rep", firstName: "Jay", lastName: "Newman", profileImageUrl: null },
        { id: "rep-2", email: "taylor@argos.ai", role: "rep", firstName: "Taylor", lastName: "Stone", profileImageUrl: null },
        { id: "rep-3", email: "alex@argos.ai", role: "rep", firstName: "Alex", lastName: "Vale", profileImageUrl: null },
      ]),
      findCompletedCallsByOrgId: vi.fn().mockResolvedValue([
        {
          id: "march-1",
          repId: "rep-1",
          overallScore: 88,
          frameControlScore: 84,
          rapportScore: 82,
          discoveryScore: 80,
          painExpansionScore: 78,
          solutionScore: 76,
          objectionScore: 74,
          closingScore: 90,
          durationSeconds: 1800,
          callTopic: "ACME",
          createdAt: new Date("2026-03-25T12:00:00.000Z"),
        },
        {
          id: "march-2",
          repId: "rep-1",
          overallScore: 92,
          frameControlScore: 90,
          rapportScore: 88,
          discoveryScore: 86,
          painExpansionScore: 84,
          solutionScore: 82,
          objectionScore: 80,
          closingScore: 94,
          durationSeconds: 1700,
          callTopic: "Globex",
          createdAt: new Date("2026-03-15T12:00:00.000Z"),
        },
        {
          id: "march-3",
          repId: "rep-2",
          overallScore: 80,
          frameControlScore: 80,
          rapportScore: 80,
          discoveryScore: 80,
          painExpansionScore: 80,
          solutionScore: 80,
          objectionScore: 80,
          closingScore: 80,
          durationSeconds: 1600,
          callTopic: "Northstar",
          createdAt: new Date("2026-03-18T12:00:00.000Z"),
        },
        {
          id: "march-4",
          repId: "rep-2",
          overallScore: 81,
          frameControlScore: 80,
          rapportScore: 80,
          discoveryScore: 80,
          painExpansionScore: 80,
          solutionScore: 80,
          objectionScore: 80,
          closingScore: 83,
          durationSeconds: 1650,
          callTopic: "Wayfinder",
          createdAt: new Date("2026-03-19T12:00:00.000Z"),
        },
        {
          id: "march-5",
          repId: "rep-2",
          overallScore: 82,
          frameControlScore: 80,
          rapportScore: 80,
          discoveryScore: 80,
          painExpansionScore: 80,
          solutionScore: 80,
          objectionScore: 80,
          closingScore: 84,
          durationSeconds: 1680,
          callTopic: "Beacon",
          createdAt: new Date("2026-03-20T12:00:00.000Z"),
        },
        {
          id: "march-6",
          repId: "rep-3",
          overallScore: 75,
          frameControlScore: 74,
          rapportScore: 74,
          discoveryScore: 74,
          painExpansionScore: 74,
          solutionScore: 74,
          objectionScore: 74,
          closingScore: 76,
          durationSeconds: 1500,
          callTopic: "Pioneer",
          createdAt: new Date("2026-03-21T12:00:00.000Z"),
        },
        {
          id: "feb-1",
          repId: "rep-1",
          overallScore: 70,
          frameControlScore: 70,
          rapportScore: 70,
          discoveryScore: 70,
          painExpansionScore: 70,
          solutionScore: 70,
          objectionScore: 70,
          closingScore: 70,
          durationSeconds: 1500,
          callTopic: "Legacy",
          createdAt: new Date("2026-02-18T12:00:00.000Z"),
        },
        {
          id: "feb-2",
          repId: "rep-2",
          overallScore: 79,
          frameControlScore: 79,
          rapportScore: 79,
          discoveryScore: 79,
          painExpansionScore: 79,
          solutionScore: 79,
          objectionScore: 79,
          closingScore: 79,
          durationSeconds: 1550,
          callTopic: "Baseline",
          createdAt: new Date("2026-02-12T12:00:00.000Z"),
        },
      ]),
    });

    const result = await getDashboardLeaderboard(
      repository,
      "manager-1",
      new Date("2026-03-27T00:00:00.000Z"),
    );

    expect(result).toEqual({
      topQuality: [
        { rank: 1, userId: "rep-1", firstName: "Jay", lastName: "Newman", profileImageUrl: null, value: 90 },
        { rank: 2, userId: "rep-2", firstName: "Taylor", lastName: "Stone", profileImageUrl: null, value: 81 },
        { rank: 3, userId: "rep-3", firstName: "Alex", lastName: "Vale", profileImageUrl: null, value: 75 },
      ],
      topVolume: [
        { rank: 1, userId: "rep-2", firstName: "Taylor", lastName: "Stone", profileImageUrl: null, value: 3 },
        { rank: 2, userId: "rep-1", firstName: "Jay", lastName: "Newman", profileImageUrl: null, value: 2 },
        { rank: 3, userId: "rep-3", firstName: "Alex", lastName: "Vale", profileImageUrl: null, value: 1 },
      ],
      mostImproved: [
        { rank: 1, userId: "rep-1", firstName: "Jay", lastName: "Newman", profileImageUrl: null, value: 20 },
        { rank: 2, userId: "rep-2", firstName: "Taylor", lastName: "Stone", profileImageUrl: null, value: 2 },
      ],
    });
  });
});

describe("getExecutiveDashboard", () => {
  it("builds org skill averages, call volume, training stats, and rep skill matrix", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "exec-1",
        email: "exec@argos.ai",
        role: "executive",
        firstName: "Avery",
        lastName: "Cross",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
      findOrgUsersByOrgId: vi.fn().mockResolvedValue([
        { id: "rep-1", email: "jay@argos.ai", role: "rep", firstName: "Jay", lastName: "Newman", profileImageUrl: null },
        { id: "rep-2", email: "taylor@argos.ai", role: "rep", firstName: "Taylor", lastName: "Stone", profileImageUrl: null },
      ]),
      findCompletedCallsByOrgId: vi.fn().mockResolvedValue([
        {
          id: "call-1",
          repId: "rep-1",
          overallScore: 88,
          frameControlScore: 90,
          rapportScore: 70,
          discoveryScore: 80,
          painExpansionScore: 60,
          solutionScore: 78,
          objectionScore: 72,
          closingScore: 84,
          durationSeconds: 1800,
          callTopic: "ACME renewal",
          createdAt: new Date("2026-03-25T12:00:00.000Z"),
        },
        {
          id: "call-2",
          repId: "rep-2",
          overallScore: 78,
          frameControlScore: 82,
          rapportScore: 74,
          discoveryScore: 76,
          painExpansionScore: 68,
          solutionScore: 80,
          objectionScore: 70,
          closingScore: 79,
          durationSeconds: 1700,
          callTopic: "Globex discovery",
          createdAt: new Date("2026-03-19T12:00:00.000Z"),
        },
      ]),
      findTrainingProgressByOrgId: vi.fn().mockResolvedValue([
        { repId: "rep-1", status: "passed" },
        { repId: "rep-1", status: "assigned" },
        { repId: "rep-2", status: "passed" },
      ]),
    });

    const result = await getExecutiveDashboard(
      repository,
      "exec-1",
      new Date("2026-03-27T00:00:00.000Z"),
    );

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected executive dashboard");
    }

    expect(result).toEqual({
      skillAverages: [
        { category: "Frame Control", avgScore: 86 },
        { category: "Rapport", avgScore: 72 },
        { category: "Discovery", avgScore: 78 },
        { category: "Pain Expansion", avgScore: 64 },
        { category: "Solution", avgScore: 79 },
        { category: "Objection Handling", avgScore: 71 },
        { category: "Closing", avgScore: 82 },
      ],
      weeklyCallVolume: expect.arrayContaining([
        { week: "2026-01-02", callCount: 0 },
        { week: "2026-03-13", callCount: 1 },
        { week: "2026-03-20", callCount: 1 },
      ]),
      trainingStats: {
        totalAssigned: 3,
        totalPassed: 2,
        completionRate: 67,
      },
      repSkillBreakdown: [
        {
          repId: "rep-1",
          firstName: "Jay",
          lastName: "Newman",
          profileImageUrl: null,
          compositeScore: 88,
          callCount: 1,
          skills: {
            frameControl: 90,
            rapport: 70,
            discovery: 80,
            painExpansion: 60,
            solution: 78,
            objection: 72,
            closing: 84,
          },
        },
        {
          repId: "rep-2",
          firstName: "Taylor",
          lastName: "Stone",
          profileImageUrl: null,
          compositeScore: 78,
          callCount: 1,
          skills: {
            frameControl: 82,
            rapport: 74,
            discovery: 76,
            painExpansion: 68,
            solution: 80,
            objection: 70,
            closing: 79,
          },
        },
      ],
    });

    expect(result.weeklyCallVolume).toHaveLength(12);
  });

  it("returns null for managers without org-wide executive access", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
    });

    const result = await getExecutiveDashboard(
      repository,
      "manager-1",
      new Date("2026-03-27T00:00:00.000Z"),
    );

    expect(result).toBeNull();
  });
});

describe("getRepBadges", () => {
  it("marks badges as earned from completed calls, training, and roleplay activity", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "jay@argos.ai",
        role: "rep",
        firstName: "Jay",
        lastName: "Newman",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
      findCompletedCallsByRepId: vi.fn().mockResolvedValue([
        {
          id: "call-1",
          repId: "rep-1",
          overallScore: 88,
          frameControlScore: 80,
          rapportScore: 86,
          discoveryScore: 87,
          painExpansionScore: 78,
          solutionScore: 76,
          objectionScore: 74,
          closingScore: 91,
          durationSeconds: 1800,
          callTopic: "ACME renewal",
          createdAt: new Date("2026-03-10T12:00:00.000Z"),
        },
      ]),
      findPassedTrainingByRepId: vi.fn().mockResolvedValue([
        new Date("2026-03-20T12:00:00.000Z"),
      ]),
      findCompletedRoleplaysByRepId: vi.fn().mockResolvedValue([
        new Date("2026-03-01T12:00:00.000Z"),
        new Date("2026-03-02T12:00:00.000Z"),
        new Date("2026-03-03T12:00:00.000Z"),
        new Date("2026-03-04T12:00:00.000Z"),
        new Date("2026-03-05T12:00:00.000Z"),
      ]),
    });

    const result = await getRepBadges(repository, "rep-1", undefined, accessRepository as never);

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected badges");
    }

    expect(result.badges.find((badge) => badge.id === "first_call")).toMatchObject({
      earned: true,
      earnedAt: "2026-03-10T12:00:00.000Z",
    });
    expect(result.badges.find((badge) => badge.id === "sharp_closer")).toMatchObject({
      earned: true,
    });
    expect(result.badges.find((badge) => badge.id === "certified")).toMatchObject({
      earned: true,
      earnedAt: "2026-03-20T12:00:00.000Z",
    });
    expect(result.badges.find((badge) => badge.id === "roleplay_5x")).toMatchObject({
      earned: true,
      earnedAt: "2026-03-05T12:00:00.000Z",
    });
  });
});

describe("getSetupStatus", () => {
  it("returns org counts for admin onboarding widgets", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Jordan",
        lastName: "Lane",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
      findOrgUsersByOrgId: vi.fn().mockResolvedValue([
        { id: "rep-1", email: "jay@argos.ai", role: "rep", firstName: "Jay", lastName: "Newman", profileImageUrl: null },
        { id: "rep-2", email: "taylor@argos.ai", role: "rep", firstName: "Taylor", lastName: "Stone", profileImageUrl: null },
        { id: "mgr-1", email: "manager@argos.ai", role: "manager", firstName: "Morgan", lastName: "Lane", profileImageUrl: null },
      ]),
      findCallCountByOrgIdSince: vi.fn().mockResolvedValue(5),
      findCompletedRoleplayCountByOrgId: vi.fn().mockResolvedValue(2),
    });

    const result = await getSetupStatus(repository, "admin-1", new Date("2026-03-27T00:00:00.000Z"));

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected setup status");
    }

    expect(result).toEqual({
      orgSlug: "argos-demo-org",
      repsCount: 2,
      callsCount: 5,
      roleplayCount: 2,
    });
  });

  it("returns null for managers without org-wide setup access", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: {
          id: "org-1",
          name: "Argos Demo Org",
          slug: "argos-demo-org",
          plan: "trial",
        },
      }),
    });

    const result = await getSetupStatus(
      repository,
      "manager-1",
      new Date("2026-03-27T00:00:00.000Z"),
    );

    expect(result).toBeNull();
  });
});
