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

    expect(html).not.toContain("Sales standard installation + Argos platform");
    expect(html).toContain("Build a sales team that actually follows the playbook.");
    expect(html).toContain("We Install The Sales Standard In Your Organization");
    expect(html).toContain("Argos makes it visible in the work: calls reviewed, reps scored");
    expect(html).not.toContain("Call review -&gt; Rubrics scored -&gt; Training assigned -&gt; Roleplay tracked -&gt; Manager dashboard");
    expect(html).toContain('aria-label="Argos product coaching walkthrough"');
    expect(html).not.toContain("Every call should become the next coaching move.");
    expect(html).toContain('aria-label="Argos product showcase"');
    expect(Array.from(html.matchAll(/data-showcase-slide=/g))).toHaveLength(8);
    expect(html).toContain("/homepage-product/argos-dashboard.png");
    expect(html).toContain("/homepage-product/argos-calls.png");
    expect(html).toContain("/homepage-product/argos-scorecard.png");
    expect(html).toContain("/homepage-product/argos-highlights.png");
    expect(html).toContain("/homepage-product/argos-training.png");
    expect(html).toContain("/homepage-product/argos-roleplay.png");
    expect(html).toContain("/homepage-product/argos-team.png");
    expect(html).toContain("/homepage-product/argos-leaderboard.png");
    expect(html).not.toContain("/homepage-product/argos-dashboard-workspace.png");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Calls");
    expect(html).toContain("Call review");
    expect(html).toContain("Scorecards");
    expect(html).toContain("Highlights");
    expect(html).toContain("Training");
    expect(html).toContain("Roleplay");
    expect(html).toContain("Team");
    expect(html).toContain("Leaderboard");
    expect(html).toContain("Know where to coach");
    expect(html).toContain("Start with the conversations");
    expect(html).toContain("your team actually had.");
    expect(html).not.toContain("Authenticated product screenshot");
    expect(html).not.toContain("Dashboard workspace");
    expect(html).not.toContain("Work queue");
    expect(html).not.toContain("Selected item");
    expect(html).not.toContain("Manager action");
    expect(html).toContain("Previous product view");
    expect(html).toContain("Next product view");
    expect(html).not.toContain("Operating feed");
    expect(html).not.toContain("Animated operating feed cards");
    expect(html).not.toContain("Animated operating feed carousel");
    expect(html).not.toContain("One call becomes five visible handoffs.");
    expect(html).not.toContain("Product in motion");
    expect(html).not.toContain("Live operating loop");
    expect(html).toContain("How The Standard Gets Installed");
    expect(html).toContain("Teach the playbook. Track the behavior.");
    expect(html).toContain("For Managers");
    expect(html).toContain("Book Demo");
    expect(html).not.toContain("Book the coaching walkthrough");
    expect(html).not.toContain("Book The Coaching Walkthrough");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Revenue Command");
    expect(html).not.toContain("Sales standard system");
    expect(html).not.toContain("CALL REVIEW // SCORECARDS AND RUBRICS");
    expect(html).not.toContain("argos-metric-row");
    expect(html).not.toContain("Founder-led sales coaching + Argos platform");
    expect(html).not.toContain("The founder teaches the standard");
    expect(html).not.toContain("Founder teaches the standard");
    expect(html.toLowerCase()).not.toContain("fathom");
    expect(html).not.toContain("Founder reviews calls");
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
    expect(html).toContain('data-argos-logo="auth-header"');
    const navOrder = [
      'href="/#product-in-motion"',
      'href="/#coaching-system"',
      'href="/#standard-installation"',
      'href="/#coaching-loop"',
      'href="/#role-outcomes"',
      'href="/#access"',
    ];
    let lastNavIndex = -1;
    for (const navHref of navOrder) {
      const navIndex = html.indexOf(navHref);
      expect(navIndex).toBeGreaterThan(lastNavIndex);
      lastNavIndex = navIndex;
    }
    expect(html).toContain(">Product</a>");
    expect(html).toContain(">Coaching</a>");
    expect(html).toContain(">Standard</a>");
    expect(html).toContain(">System</a>");
    expect(html).toContain(">Roles</a>");
    expect(html).toContain(">Demo</a>");
    expect(html).toContain(">Log in</a>");
    expect(html).toContain(">Book Demo</a>");
    expect(html).not.toContain("View plans");
    expect(html).not.toContain(">Home</a>");
    expect(html).not.toContain('href="/#features"');
    expect(html).not.toContain('href="/#detail"');
    expect(html).not.toContain('href="/#trust"');
    expect(html).toContain("Continue to call review, scorecards, training, and roleplay.");
    expect(html).not.toContain('data-argos-logo="auth-panel"');
    expect(html).not.toContain("Call review");
    expect(html).not.toContain("Turn every sales call into the next practice plan.");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).not.toContain("global logistics operations");
    expect(html).not.toContain("Security Protocol");
    expect(html).not.toContain("Terms of Access");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
  });

  it("renders the executive dashboard shell with operational navigation labels", async () => {
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

    expect(html).toContain('data-dashboard-route="dashboard"');
    expect(html).toContain('data-operational-toolbar="true"');
    expect(html).toContain('data-dashboard-today-queue="true"');
    expect(html).toContain(">Dashboard<");
    expect(html).toContain("Open team");
    expect(html).toContain("Upload call");
    expect(html).toContain("Needs attention");
    expect(html).not.toContain("Review queue");
    expect(html).not.toContain("Rep Skill Matrix");
    expect(html).not.toContain('data-rep-skill-matrix-table="true"');
    expect(html).not.toContain('href="/team/rep-1"');
  });
});
