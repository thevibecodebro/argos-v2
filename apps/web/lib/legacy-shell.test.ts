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

    expect(html).toContain("Turn every sales call into the next practice plan.");
    expect(html).toContain("Sales call review, coaching, and roleplay");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Coaching Forge");
  });

  it("renders the login page with the Forge auth shell", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );

    expect(html).toContain("Welcome back");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Work Email");
    expect(html).toContain('data-auth-shell="forge"');
    expect(html).toContain("Call review");
    expect(html).toContain("Scorecards");
    expect(html).toContain("Roleplay");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).not.toContain("global logistics operations");
    expect(html).not.toContain("Security Protocol");
    expect(html).not.toContain("Terms of Access");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
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
      skillColumns: ["Discovery", "Closing"],
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
          skillBreakdown: [
            { category: "Discovery", avgScore: 76 },
            { category: "Closing", avgScore: 85 },
          ],
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
    expect(html).toContain('data-rep-skill-matrix-table="true"');
    expect(html).toContain('data-rep-skill-matrix-mobile="true"');
    expect(html).toContain('href="/team/rep-1"');
    expect(html).toContain("Overall");
    expect(html).toContain("Discovery");
    expect(html).toContain("Closing");
  });
});
