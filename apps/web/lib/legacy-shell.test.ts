import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCachedAuthenticatedSupabaseUserMock,
  createDashboardRepositoryMock,
  getCachedCurrentUserProfileMock,
  getDashboardLeaderboardMock,
  getExecutiveDashboardMock,
  getManagerDashboardMock,
  getRepBadgesMock,
  getRepDashboardMock,
  getSetupStatusMock,
} = vi.hoisted(() => ({
  getCachedAuthenticatedSupabaseUserMock: vi.fn(),
  createDashboardRepositoryMock: vi.fn(),
  getCachedCurrentUserProfileMock: vi.fn(),
  getDashboardLeaderboardMock: vi.fn(),
  getExecutiveDashboardMock: vi.fn(),
  getManagerDashboardMock: vi.fn(),
  getRepBadgesMock: vi.fn(),
  getRepDashboardMock: vi.fn(),
  getSetupStatusMock: vi.fn(),
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser: getCachedAuthenticatedSupabaseUserMock,
  getCachedCurrentUserProfile: getCachedCurrentUserProfileMock,
}));

vi.mock("@/lib/dashboard/create-repository", () => ({
  createDashboardRepository: createDashboardRepositoryMock,
}));

vi.mock("@/lib/dashboard/service", () => ({
  getDashboardLeaderboard: getDashboardLeaderboardMock,
  getExecutiveDashboard: getExecutiveDashboardMock,
  getManagerDashboard: getManagerDashboardMock,
  getRepBadges: getRepBadgesMock,
  getRepDashboard: getRepDashboardMock,
  getSetupStatus: getSetupStatusMock,
}));

vi.mock("next/font/google", () => ({
  Manrope: () => ({
    variable: "--font-manrope",
  }),
}));

import HomePage from "../app/page";
import LoginPage from "../app/login/page";
import DashboardPage from "../app/(authenticated)/dashboard/page";

describe("legacy UI shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createDashboardRepositoryMock.mockReturnValue({});
  });

  it("renders the landing page ahead of the login flow", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Build a sales team that");
    expect(html).toContain("after every call.");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Intelligent Readiness");
  });

  it("renders the login page with the restored dark auth shell", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );

    expect(html).toContain("Welcome back");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Work Email");
  });

  it("renders the executive dashboard shell with legacy navigation labels", async () => {
    getCachedAuthenticatedSupabaseUserMock.mockResolvedValue({ id: "auth-user-1" });
    getCachedCurrentUserProfileMock.mockResolvedValue({
      id: "user-1",
      email: "jay@argos.ai",
      fullName: "Jay Newman",
      role: "executive",
      org: {
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "pro",
      },
    });
    getRepDashboardMock.mockResolvedValue(null);
    getRepBadgesMock.mockResolvedValue({ badges: [] });
    getManagerDashboardMock.mockResolvedValue({
      reps: [],
      teamAvgScore: 80,
      totalCallsThisMonth: 12,
      coachingFlagsCount: 2,
    });
    getExecutiveDashboardMock.mockResolvedValue({
      skillAverages: [
        { category: "Closing", avgScore: 80 },
        { category: "Objection Handling", avgScore: 76 },
      ],
      weeklyCallVolume: [{ week: "2026-03-24T00:00:00.000Z", callCount: 12 }],
      trainingStats: {
        totalAssigned: 4,
        totalPassed: 3,
        completionRate: 75,
      },
      repSkillBreakdown: [
        {
          repId: "rep-1",
          firstName: "Jay",
          lastName: "Newman",
          profileImageUrl: null,
          compositeScore: 82,
          callCount: 6,
          skills: {
            frameControl: 80,
            rapport: 78,
            discovery: 76,
            painExpansion: 74,
            solution: 82,
            objection: 79,
            closing: 85,
          },
        },
      ],
    });
    getDashboardLeaderboardMock.mockResolvedValue({
      topQuality: [],
      topVolume: [],
      mostImproved: [],
    });
    getSetupStatusMock.mockResolvedValue({
      orgSlug: "argos",
      repsCount: 1,
      callsCount: 12,
      roleplayCount: 3,
    });

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Open team");
    expect(html).toContain("Open call library");
    expect(html).toContain("Upload call");
    expect(html).toContain("Rep Skill Matrix");
  });
});
