import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  getAuthenticatedSupabaseUserMock,
  createDashboardRepositoryMock,
  getCurrentUserProfileMock,
  getManagerDashboardMock,
  getDashboardLeaderboardMock,
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
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  getAuthenticatedSupabaseUserMock: vi.fn(),
  createDashboardRepositoryMock: vi.fn(),
  getCurrentUserProfileMock: vi.fn(),
  getManagerDashboardMock: vi.fn(),
  getDashboardLeaderboardMock: vi.fn(),
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

import TeamPage from "../app/(authenticated)/team/page";
import LeaderboardPage from "../app/(authenticated)/leaderboard/page";
import TrainingPage from "../app/(authenticated)/training/page";
import NotificationsPage from "../app/(authenticated)/notifications/page";
import UploadPage from "../app/(authenticated)/upload/page";

async function renderRoute(page: Promise<React.ReactElement> | React.ReactElement) {
  return renderToStaticMarkup(await page);
}

describe("primary route hero removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAuthenticatedSupabaseUserMock.mockResolvedValue({ id: "auth-user-1" });

    createDashboardRepositoryMock.mockReturnValue({});
    getCurrentUserProfileMock.mockResolvedValue({ role: "manager" });
    getManagerDashboardMock.mockResolvedValue(null);
    getDashboardLeaderboardMock.mockResolvedValue({
      topQuality: [],
      topVolume: [],
      mostImproved: [],
    });

    createUsersRepositoryMock.mockReturnValue({
      findCurrentUserByAuthId: findCurrentUserByAuthIdMock,
    });
    findCurrentUserByAuthIdMock.mockResolvedValue(null);
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
    const [uploadHtml, notificationsHtml] = await Promise.all([
      renderRoute(UploadPage()),
      renderRoute(NotificationsPage()),
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
  });
});
