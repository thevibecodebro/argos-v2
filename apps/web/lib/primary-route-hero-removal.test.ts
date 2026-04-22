import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  getCachedAuthenticatedSupabaseUserMock,
  getCachedCurrentUserDetailsMock,
  getCachedCurrentUserProfileMock,
  createDashboardRepositoryMock,
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
  listOrganizationMembersMock,
  createCallsRepositoryMock,
  listCallsMock,
  listHighlightsMock,
  createInvitesRepositoryMock,
  listPendingInvitesMock,
  createTeamAccessRepositoryMock,
  getTeamAccessSnapshotMock,
  createIntegrationsRepositoryMock,
  getIntegrationStatusesMock,
  createComplianceRepositoryMock,
  getComplianceStatusMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  getCachedAuthenticatedSupabaseUserMock: vi.fn(),
  getCachedCurrentUserDetailsMock: vi.fn(),
  getCachedCurrentUserProfileMock: vi.fn(),
  createDashboardRepositoryMock: vi.fn(),
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
  listOrganizationMembersMock: vi.fn(),
  createCallsRepositoryMock: vi.fn(),
  listCallsMock: vi.fn(),
  listHighlightsMock: vi.fn(),
  createInvitesRepositoryMock: vi.fn(),
  listPendingInvitesMock: vi.fn(),
  createTeamAccessRepositoryMock: vi.fn(),
  getTeamAccessSnapshotMock: vi.fn(),
  createIntegrationsRepositoryMock: vi.fn(),
  getIntegrationStatusesMock: vi.fn(),
  createComplianceRepositoryMock: vi.fn(),
  getComplianceStatusMock: vi.fn(),
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

vi.mock("@/components/page-panel-loaders", () => ({
  TrainingPanel: () => "Training panel marker",
  UploadCallPanel: () => "Upload call panel marker",
  NotificationsPanel: () => "Notifications panel marker",
  AccountPanel: () => "Account panel marker",
  PeoplePanel: () => "People panel marker",
  TeamsPanel: () => "Teams panel marker",
  PermissionsPanel: () => "Permissions panel marker",
  IntegrationsPanel: () => "Integrations panel marker",
  CompliancePanel: () => "Compliance panel marker",
}));

vi.mock("@/components/settings/account-panel", () => ({
  AccountPanel: () => "Account panel marker",
}));

vi.mock("@/components/settings/people-panel", () => ({
  PeoplePanel: () => "People panel marker",
}));

vi.mock("@/components/settings/teams-panel", () => ({
  TeamsPanel: () => "Teams panel marker",
}));

vi.mock("@/components/settings/permissions-panel", () => ({
  PermissionsPanel: () => "Permissions panel marker",
}));

vi.mock("@/components/settings/integrations-panel", () => ({
  IntegrationsPanel: () => "Integrations panel marker",
}));

vi.mock("@/components/settings/compliance-panel", () => ({
  CompliancePanel: () => "Compliance panel marker",
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser: getCachedAuthenticatedSupabaseUserMock,
  getCachedCurrentUserDetails: getCachedCurrentUserDetailsMock,
  getCachedCurrentUserProfile: getCachedCurrentUserProfileMock,
}));

vi.mock("@/lib/dashboard/create-repository", () => ({
  createDashboardRepository: createDashboardRepositoryMock,
}));

vi.mock("@/lib/dashboard/service", () => ({
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
  listOrganizationMembers: listOrganizationMembersMock,
}));

vi.mock("@/lib/invites/create-repository", () => ({
  createInvitesRepository: createInvitesRepositoryMock,
}));

vi.mock("@/lib/invites/service", () => ({
  listPendingInvites: listPendingInvitesMock,
}));

vi.mock("@/lib/team-access/create-repository", () => ({
  createTeamAccessRepository: createTeamAccessRepositoryMock,
}));

vi.mock("@/lib/team-access/service", () => ({
  PRESET_GRANTS: {
    standard: ["calls:read", "training:read"],
  },
  getTeamAccessSnapshot: getTeamAccessSnapshotMock,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository: createIntegrationsRepositoryMock,
}));

vi.mock("@/lib/integrations/service", () => ({
  getIntegrationStatuses: getIntegrationStatusesMock,
}));

vi.mock("@/lib/compliance/create-repository", () => ({
  createComplianceRepository: createComplianceRepositoryMock,
}));

vi.mock("@/lib/compliance/service", () => ({
  getComplianceStatus: getComplianceStatusMock,
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
import SettingsPeoplePage from "../app/(authenticated)/settings/people/page";
import SettingsTeamsPage from "../app/(authenticated)/settings/teams/page";
import SettingsPermissionsPage from "../app/(authenticated)/settings/permissions/page";
import SettingsIntegrationsPage from "../app/(authenticated)/settings/integrations/page";
import SettingsCompliancePage from "../app/(authenticated)/settings/compliance/page";
import UploadPage from "../app/(authenticated)/upload/page";
import CallsPage from "../app/(authenticated)/calls/page";
import HighlightsPage from "../app/(authenticated)/highlights/page";

async function renderRoute(page: Promise<React.ReactElement> | React.ReactElement) {
  return renderToStaticMarkup(await page);
}

describe("primary route hero removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCachedAuthenticatedSupabaseUserMock.mockResolvedValue({ id: "auth-user-1" });

    createDashboardRepositoryMock.mockReturnValue({});
    getCachedCurrentUserProfileMock.mockResolvedValue({ role: "manager" });
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
    getCachedCurrentUserDetailsMock.mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        email: "user@example.com",
        fullName: "Argos User",
        orgName: "Argos",
        role: "admin",
      },
    });
    createInvitesRepositoryMock.mockReturnValue({});
    listPendingInvitesMock.mockResolvedValue({
      ok: true,
      data: [],
    });
    createTeamAccessRepositoryMock.mockReturnValue({});
    getTeamAccessSnapshotMock.mockResolvedValue({
      ok: true,
      data: {
        grants: [],
        managers: [],
        memberships: [],
        reps: [],
        teams: [],
      },
    });
    listOrganizationMembersMock.mockResolvedValue({
      ok: true,
      data: [],
    });
    createIntegrationsRepositoryMock.mockReturnValue({});
    getIntegrationStatusesMock.mockResolvedValue({
      ok: true,
      data: {
        zoom: {
          available: true,
          connectPath: "/api/integrations/zoom/connect",
          connected: false,
          connectedAt: null,
          disconnectPath: "/api/integrations/zoom/disconnect",
          zoomUserId: null,
        },
        ghl: {
          available: true,
          connectPath: "/api/integrations/ghl/connect",
          connected: false,
          connectedAt: null,
          disconnectPath: "/api/integrations/ghl/disconnect",
          locationId: null,
          locationName: null,
        },
      },
    });
    createComplianceRepositoryMock.mockReturnValue({});
    getComplianceStatusMock.mockResolvedValue({
      ok: true,
      data: {
        consentedAt: null,
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

  it("wraps the training route in the standard authenticated content canvas", async () => {
    const trainingHtml = await renderRoute(TrainingPage());

    expect(trainingHtml).toContain('class="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full"');
    expect(trainingHtml).toContain("Training panel marker");
  });

  it("wraps the team and leaderboard routes in the standard authenticated content canvas", async () => {
    const [teamHtml, leaderboardHtml] = await Promise.all([
      renderRoute(TeamPage()),
      renderRoute(LeaderboardPage()),
    ]);

    expect(teamHtml).toContain('class="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full"');
    expect(teamHtml).toContain("Team roster marker");
    expect(leaderboardHtml).toContain('class="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full"');
    expect(leaderboardHtml).toContain("Open team view");
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

  it("hides the shared hero copy on settings routes while keeping settings panels", async () => {
    const [
      accountHtml,
      peopleHtml,
      teamsHtml,
      permissionsHtml,
      integrationsHtml,
      complianceHtml,
    ] = await Promise.all([
      renderRoute(SettingsAccountPage()),
      renderRoute(SettingsPeoplePage()),
      renderRoute(SettingsTeamsPage()),
      renderRoute(SettingsPermissionsPage()),
      renderRoute(SettingsIntegrationsPage()),
      renderRoute(SettingsCompliancePage()),
    ]);

    expect(accountHtml).toContain("Account panel marker");
    expect(accountHtml).not.toContain(">Account<");
    expect(accountHtml).not.toContain(
      "Manage your display name and view your organization details.",
    );

    expect(peopleHtml).toContain("People panel marker");
    expect(peopleHtml).not.toContain(">People<");
    expect(peopleHtml).not.toContain(
      "Manage org member roles and send or revoke invitations.",
    );

    expect(teamsHtml).toContain("Teams panel marker");
    expect(teamsHtml).not.toContain(">Teams<");
    expect(teamsHtml).not.toContain(
      "Create teams, edit metadata, and manage manager and rep assignments.",
    );

    expect(permissionsHtml).toContain("Permissions panel marker");
    expect(permissionsHtml).not.toContain(">Permissions<");
    expect(permissionsHtml).not.toContain(
      "Configure permission presets and primary manager assignments per rep.",
    );

    expect(integrationsHtml).toContain("Integrations panel marker");
    expect(integrationsHtml).not.toContain(">Integrations<");
    expect(integrationsHtml).not.toContain(
      "Connect external tools to automate call imports and post-call workflows.",
    );

    expect(complianceHtml).toContain("Compliance panel marker");
    expect(complianceHtml).not.toContain(">Compliance<");
    expect(complianceHtml).not.toContain(
      "Configure call recording consent and review compliance acknowledgments.",
    );
  });

  it("removes dashboard hero titles for rep, manager, and executive views while keeping route content", async () => {
    getManagerDashboardMock.mockResolvedValue({
      reps: [],
      teamAvgScore: 84,
      totalCallsThisMonth: 17,
      coachingFlagsCount: 2,
    });

    getCachedCurrentUserProfileMock.mockResolvedValueOnce({ role: "rep" });
    const repHtml = await renderRoute(DashboardPage());

    getCachedCurrentUserProfileMock.mockResolvedValueOnce({ role: "manager" });
    const managerHtml = await renderRoute(DashboardPage());

    getCachedCurrentUserProfileMock.mockResolvedValueOnce({ role: "executive" });
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

  it("removes the calls hero and viewer identity card while keeping upload actions", async () => {
    const callsHtml = await renderRoute(
      CallsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(callsHtml).not.toContain("Viewing As");
    expect(callsHtml).not.toContain("Avery Manager");
    expect(callsHtml).not.toContain(">manager<");
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
