import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  getAuthenticatedSupabaseUserMock,
  createDashboardRepositoryMock,
  getCurrentUserProfileMock,
  getManagerDashboardMock,
  getDashboardLeaderboardMock,
  getRepDashboardMock,
  getRepBadgesMock,
  getExecutiveDashboardMock,
  getSetupStatusMock,
  createUsersRepositoryMock,
  findCurrentUserByAuthIdMock,
  createTrainingRepositoryMock,
  getTrainingModulesMock,
  getTrainingTeamProgressMock,
  getTrainingAiStatusMock,
  createRubricsRepositoryMock,
  getActiveRubricMock,
  createNotificationsRepositoryMock,
  getNotificationsMock,
  getCurrentUserDetailsMock,
  createCallsRepositoryMock,
  listCallsMock,
  listHighlightsMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  getAuthenticatedSupabaseUserMock: vi.fn(),
  createDashboardRepositoryMock: vi.fn(),
  getCurrentUserProfileMock: vi.fn(),
  getManagerDashboardMock: vi.fn(),
  getDashboardLeaderboardMock: vi.fn(),
  getRepDashboardMock: vi.fn(),
  getRepBadgesMock: vi.fn(),
  getExecutiveDashboardMock: vi.fn(),
  getSetupStatusMock: vi.fn(),
  createUsersRepositoryMock: vi.fn(),
  findCurrentUserByAuthIdMock: vi.fn(),
  createTrainingRepositoryMock: vi.fn(),
  getTrainingModulesMock: vi.fn(),
  getTrainingTeamProgressMock: vi.fn(),
  getTrainingAiStatusMock: vi.fn(),
  createRubricsRepositoryMock: vi.fn(),
  getActiveRubricMock: vi.fn(),
  createNotificationsRepositoryMock: vi.fn(),
  getNotificationsMock: vi.fn(),
  getCurrentUserDetailsMock: vi.fn(),
  createCallsRepositoryMock: vi.fn(),
  listCallsMock: vi.fn(),
  listHighlightsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/team/team-views", () => ({
  TeamRosterView: () => "Team roster marker",
}));

vi.mock("@/components/training-panel", () => ({
  TrainingPanel: () => "Training panel marker",
}));

vi.mock("@/components/upload-call-panel", () => ({
  UploadCallPanel: () => "Upload call panel marker",
}));

vi.mock("@/components/notifications-panel", () => ({
  NotificationsPanel: () => "Notifications panel marker",
}));

vi.mock("@/components/settings/account-panel", () => ({
  AccountPanel: () => "Account panel marker",
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser: getAuthenticatedSupabaseUserMock,
}));

vi.mock("@/lib/dashboard/create-repository", () => ({
  createDashboardRepository: createDashboardRepositoryMock,
}));

vi.mock("@/lib/dashboard/service", () => ({
  getCurrentUserProfile: getCurrentUserProfileMock,
  getManagerDashboard: getManagerDashboardMock,
  getDashboardLeaderboard: getDashboardLeaderboardMock,
  getRepDashboard: getRepDashboardMock,
  getRepBadges: getRepBadgesMock,
  getExecutiveDashboard: getExecutiveDashboardMock,
  getSetupStatus: getSetupStatusMock,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository: createUsersRepositoryMock,
}));

vi.mock("@/lib/training/create-repository", () => ({
  createTrainingRepository: createTrainingRepositoryMock,
}));

vi.mock("@/lib/training/service", () => ({
  getTrainingModules: getTrainingModulesMock,
  getTrainingTeamProgress: getTrainingTeamProgressMock,
  getTrainingAiStatus: getTrainingAiStatusMock,
}));

vi.mock("@/lib/rubrics/create-repository", () => ({
  createRubricsRepository: createRubricsRepositoryMock,
}));

vi.mock("@/lib/rubrics/service", () => ({
  getActiveRubric: getActiveRubricMock,
}));

vi.mock("@/lib/notifications/create-repository", () => ({
  createNotificationsRepository: createNotificationsRepositoryMock,
}));

vi.mock("@/lib/notifications/service", () => ({
  getNotifications: getNotificationsMock,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails: getCurrentUserDetailsMock,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository: createCallsRepositoryMock,
}));

vi.mock("@/lib/calls/service", () => ({
  listCalls: listCallsMock,
  listHighlights: listHighlightsMock,
}));

vi.mock("../app/(authenticated)/calls/calls-filters", () => ({
  CallsFilters: () => "Calls filters marker",
}));

import DashboardPage from "../app/(authenticated)/dashboard/page";
import TeamPage from "../app/(authenticated)/team/page";
import LeaderboardPage from "../app/(authenticated)/leaderboard/page";
import TrainingPage from "../app/(authenticated)/training/page";
import NotificationsPage from "../app/(authenticated)/notifications/page";
import SettingsAccountPage from "../app/(authenticated)/settings/page";
import UploadPage from "../app/(authenticated)/upload/page";
import CallsPage from "../app/(authenticated)/calls/page";
import HighlightsPage from "../app/(authenticated)/highlights/page";

async function renderRoute(page: Promise<React.ReactElement> | React.ReactElement) {
  return renderToStaticMarkup(await page);
}

describe("primary route hero removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAuthenticatedSupabaseUserMock.mockResolvedValue({ id: "auth-user-1" });

    createDashboardRepositoryMock.mockReturnValue({});
    getCurrentUserProfileMock.mockResolvedValue({ role: "manager" });
    getRepDashboardMock.mockResolvedValue({
      monthlyAvgScore: 91,
      recentCalls: [
        {
          id: "call-1",
          callTopic: "Discovery follow-up",
          createdAt: "2026-04-01T15:00:00.000Z",
          overallScore: 88,
          status: "complete",
        },
      ],
      lowestCategories: [{ category: "Discovery", avgScore: 62 }],
      categoryAnalyticsContextLabel: "Last 30 days",
    });
    getRepBadgesMock.mockResolvedValue({
      badges: [
        {
          id: "badge-1",
          emoji: "🏁",
          name: "Fast starter",
          description: "Completed the first scored call.",
          earned: true,
          earnedAt: "2026-04-02T12:00:00.000Z",
        },
      ],
    });
    getManagerDashboardMock.mockResolvedValue(null);
    getExecutiveDashboardMock.mockResolvedValue({
      trainingStats: { completionRate: 76 },
      skillAverages: [{ category: "Discovery", avgScore: 84 }],
      weeklyCallVolume: [{ week: "2026-04-01T00:00:00.000Z", callCount: 12 }],
      repSkillBreakdown: [],
      categoryAnalyticsContextLabel: "Last 30 days",
      skillColumns: [],
    });
    getDashboardLeaderboardMock.mockResolvedValue({
      topQuality: [],
      topVolume: [],
      mostImproved: [],
    });
    getSetupStatusMock.mockResolvedValue({
      orgSlug: "argos",
      repsCount: 6,
      callsCount: 24,
      roleplayCount: 3,
    });

    createUsersRepositoryMock.mockReturnValue({
      findCurrentUserByAuthId: findCurrentUserByAuthIdMock,
    });
    findCurrentUserByAuthIdMock.mockResolvedValue(null);
    getCurrentUserDetailsMock.mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        email: "user@example.com",
        fullName: "Argos User",
        orgName: "Argos",
      },
    });
    createTrainingRepositoryMock.mockReturnValue({});
    getTrainingModulesMock.mockResolvedValue({
      ok: true,
      data: { canManage: false, modules: [] },
    });
    getTrainingTeamProgressMock.mockResolvedValue({
      ok: true,
      data: { progress: { modules: [], repProgress: [] }, rows: [] },
    });
    getTrainingAiStatusMock.mockReturnValue({ available: false, reason: null });
    createRubricsRepositoryMock.mockReturnValue({});
    getActiveRubricMock.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Active rubric not found",
    });

    createNotificationsRepositoryMock.mockReturnValue({});
    getNotificationsMock.mockResolvedValue({
      ok: true,
      data: { notifications: [], unreadCount: 0 },
    });

    createCallsRepositoryMock.mockReturnValue({});
    listCallsMock.mockResolvedValue({
      ok: true,
      data: {
        calls: [
          {
            id: "call-1",
            callTopic: "Pricing review",
            createdAt: "2026-04-01T15:00:00.000Z",
            durationSeconds: 245,
            overallScore: 89,
            status: "complete",
            repFirstName: "Morgan",
            repLastName: "Lee",
          },
        ],
        total: 1,
        viewer: {
          fullName: "Avery Manager",
          role: "manager",
        },
      },
    });
    listHighlightsMock.mockResolvedValue({
      ok: true,
      data: {
        highlights: [
          {
            id: "highlight-1",
            category: "Objection Handling",
            severity: "High",
            observation: "Handled pricing pushback with a clear ROI recap.",
            recommendation: "Repeat the same framing in upcoming renewals.",
            highlightNote: "Saved for Friday coaching.",
            callId: "call-1",
          },
        ],
      },
    });
  });

  it("hides the shared hero copy on the three primary routes while keeping top actions", async () => {
    const [teamHtml, leaderboardHtml, trainingHtml] = await Promise.all([
      renderRoute(TeamPage()),
      renderRoute(LeaderboardPage()),
      renderRoute(TrainingPage()),
    ]);

    expect(teamHtml).toContain("Open leaderboard");
    expect(teamHtml).toContain("Team roster marker");
    expect(teamHtml).not.toContain(
      "Review team performance with week-over-week trend, call volume, and coaching flags.",
    );
    expect(teamHtml).not.toContain(">Team<");

    expect(leaderboardHtml).toContain("Open team view");
    expect(leaderboardHtml).not.toContain(
      "Compare top-quality, top-volume, and most-improved slices across your team.",
    );
    expect(leaderboardHtml).not.toContain(">Leaderboard<");

    expect(trainingHtml).toContain("Open highlights");
    expect(trainingHtml).toContain("Training panel marker");
    expect(trainingHtml).not.toContain(
      "Review assigned modules, complete lessons, and guide practice from one training surface.",
    );
    expect(trainingHtml).not.toContain(">Training<");
  });

  it("keeps visible heading behavior on top-level routes outside the feature scope", async () => {
    const [uploadHtml, notificationsHtml, settingsHtml] = await Promise.all([
      renderRoute(UploadPage()),
      renderRoute(NotificationsPage()),
      renderRoute(SettingsAccountPage()),
    ]);

    expect(uploadHtml).toContain("Upload call panel marker");
    expect(uploadHtml).toContain(">Upload Call<");
    expect(uploadHtml).toContain(
      "Upload a call recording, run the scoring flow, and jump directly into the generated detail page.",
    );

    expect(notificationsHtml).toContain("Notifications panel marker");
    expect(notificationsHtml).toContain(">Notifications<");
    expect(notificationsHtml).toContain(
      "Notifications load and update real notification rows generated by product activity.",
    );

    expect(settingsHtml).toContain("Account panel marker");
    expect(settingsHtml).toContain(">Account<");
    expect(settingsHtml).toContain(
      "Manage your display name and view your organization details.",
    );
  });

  it("removes dashboard hero titles for rep, manager, and executive views while keeping route content", async () => {
    getManagerDashboardMock.mockResolvedValue({
      reps: [],
      teamAvgScore: 84,
      totalCallsThisMonth: 17,
      coachingFlagsCount: 2,
    });

    getCurrentUserProfileMock.mockResolvedValueOnce({ role: "rep" });
    const repHtml = await renderRoute(DashboardPage());

    getCurrentUserProfileMock.mockResolvedValueOnce({ role: "manager" });
    const managerHtml = await renderRoute(DashboardPage());

    getCurrentUserProfileMock.mockResolvedValueOnce({ role: "executive" });
    const executiveHtml = await renderRoute(DashboardPage());

    expect(repHtml).toContain('href="/calls"');
    expect(repHtml).toContain('href="/training"');
    expect(repHtml).toContain('href="/calls/call-1"');
    expect(repHtml).not.toContain(">My Dashboard<");

    expect(managerHtml).toContain('href="/team"');
    expect(managerHtml).toContain('href="/leaderboard"');
    expect(managerHtml).toContain('href="/upload"');
    expect(managerHtml).toContain("Team Avg Score");
    expect(managerHtml).not.toContain(">Team Dashboard<");

    expect(executiveHtml).toContain('href="/team"');
    expect(executiveHtml).toContain('href="/leaderboard"');
    expect(executiveHtml).toContain('href="/upload"');
    expect(executiveHtml).toContain('href="/training"');
    expect(executiveHtml).toContain("Training Completion");
    expect(executiveHtml).not.toContain(">Executive Dashboard<");
    expect(executiveHtml).not.toContain(">Team Dashboard<");
  });

  it("removes the calls hero while keeping viewer context and upload actions", async () => {
    const callsHtml = await renderRoute(
      CallsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(callsHtml).toContain("Viewing As");
    expect(callsHtml).toContain("Avery Manager");
    expect(callsHtml).toContain('href="/upload"');
    expect(callsHtml).toContain("Calls filters marker");
    expect(callsHtml).toContain('href="/calls/call-1"');
    expect(callsHtml).not.toContain(">Call Library<");
    expect(callsHtml).not.toContain(">Intelligence archive<");
  });

  it("removes the highlights hero while keeping the back-to-library action", async () => {
    const highlightsHtml = await renderRoute(HighlightsPage());

    expect(highlightsHtml).toContain('href="/calls"');
    expect(highlightsHtml).toContain('href="/calls/call-1"');
    expect(highlightsHtml).not.toContain(">Highlights<");
  });
});
