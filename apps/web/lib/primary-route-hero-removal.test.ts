import { readFileSync } from "node:fs";
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
  loadRubricHistoryMock,
  createNotificationsRepositoryMock,
  getNotificationsMock,
  listOrganizationMembersMock,
  createCallsRepositoryMock,
  listCallsMock,
  getCallDetailMock,
  listAnnotationsMock,
  listHighlightsMock,
  createRoleplayRepositoryMock,
  listRoleplaySessionsMock,
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
  loadRubricHistoryMock: vi.fn(),
  createNotificationsRepositoryMock: vi.fn(),
  getNotificationsMock: vi.fn(),
  listOrganizationMembersMock: vi.fn(),
  createCallsRepositoryMock: vi.fn(),
  listCallsMock: vi.fn(),
  getCallDetailMock: vi.fn(),
  listAnnotationsMock: vi.fn(),
  listHighlightsMock: vi.fn(),
  createRoleplayRepositoryMock: vi.fn(),
  listRoleplaySessionsMock: vi.fn(),
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
  TeamRepProfileView: () => "Rep profile marker",
}));

vi.mock("@/components/training-panel", () => ({
  TrainingCurriculumPanel: () =>
    "Training curriculum panel marker Create module Edit selected module Assign selected module",
  TrainingLearnerPanel: () => "Training learner panel marker",
}));

vi.mock("@/components/upload-call-panel", () => ({
  UploadCallPanel: () => "Upload call panel marker",
}));

vi.mock("@/components/notifications-panel", () => ({
  NotificationsPanel: () => "Notifications panel marker",
}));

vi.mock("@/components/roleplay-panel", () => ({
  RoleplayPanel: () => "Roleplay panel marker",
}));

vi.mock("@/components/panel-loaders/account-panel-loader", () => ({
  AccountPanel: () => "Account panel marker",
}));

vi.mock("@/components/panel-loaders/call-detail-panel-loader", () => ({
  CallDetailPanel: () => "Call detail panel marker",
}));

vi.mock("@/components/panel-loaders/compliance-panel-loader", () => ({
  CompliancePanel: () => "Compliance panel marker",
}));

vi.mock("@/components/panel-loaders/integrations-panel-loader", () => ({
  IntegrationsPanel: () => "Integrations panel marker",
}));

vi.mock("@/components/panel-loaders/notifications-panel-loader", () => ({
  NotificationsPanel: () => "Notifications panel marker",
}));

vi.mock("@/components/panel-loaders/people-panel-loader", () => ({
  PeoplePanel: () => "People panel marker",
}));

vi.mock("@/components/panel-loaders/permissions-panel-loader", () => ({
  PermissionsPanel: () => "Permissions panel marker",
}));

vi.mock("@/components/panel-loaders/roleplay-panel-loader", () => ({
  RoleplayPanel: () => "Roleplay panel marker",
}));

vi.mock("@/components/panel-loaders/rubrics-panel-loader", () => ({
  RubricsPanel: () => "Rubrics panel marker",
}));

vi.mock("@/components/panel-loaders/teams-panel-loader", () => ({
  TeamsPanel: () => "Teams panel marker",
}));

vi.mock("@/components/panel-loaders/training-curriculum-panel-loader", () => ({
  TrainingCurriculumPanel: () =>
    "Training curriculum panel marker Create module Edit selected module Assign selected module",
}));

vi.mock("@/components/panel-loaders/training-learner-panel-loader", () => ({
  TrainingLearnerPanel: () => "Training learner panel marker",
}));

vi.mock("@/components/panel-loaders/upload-call-panel-loader", () => ({
  UploadCallPanel: () => "Upload call panel marker",
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

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantAccessRepository: vi.fn(async (repository) => repository),
  createEffectiveTenantRepository: vi.fn(async (repository) => repository),
  createEffectiveTenantTeamAccessRepository: vi.fn(async (repository) => repository),
  createEffectiveTenantUsersRepository: vi.fn(async (repository) => repository),
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
  loadRubricHistory: loadRubricHistoryMock,
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
  getCallDetail: getCallDetailMock,
  listAnnotations: listAnnotationsMock,
  listCalls: listCallsMock,
  listHighlights: listHighlightsMock,
}));

vi.mock("@/lib/roleplay/create-repository", () => ({
  createRoleplayRepository: createRoleplayRepositoryMock,
}));

vi.mock("@/lib/roleplay/service", () => ({
  listRoleplaySessions: listRoleplaySessionsMock,
}));

vi.mock("../app/(authenticated)/calls/calls-filters", () => ({
  CallsFilters: () => "Calls filters marker",
}));

import DashboardPage from "../app/(authenticated)/dashboard/page";
import TeamPage from "../app/(authenticated)/team/page";
import LeaderboardPage from "../app/(authenticated)/leaderboard/page";
import TrainingPage from "../app/(authenticated)/training/page";
import TrainingBuilderPage from "../app/(authenticated)/training/builder/page";
import TrainingTeamPage from "../app/(authenticated)/training/team/page";
import NotificationsPage from "../app/(authenticated)/notifications/page";
import SettingsAccountPage from "../app/(authenticated)/settings/page";
import SettingsPeoplePage from "../app/(authenticated)/settings/people/page";
import SettingsTeamsPage from "../app/(authenticated)/settings/teams/page";
import SettingsTeamsManagePage from "../app/(authenticated)/settings/teams/manage/page";
import SettingsPermissionsPage from "../app/(authenticated)/settings/permissions/page";
import SettingsPermissionsManagePage from "../app/(authenticated)/settings/permissions/manage/page";
import SettingsIntegrationsPage from "../app/(authenticated)/settings/integrations/page";
import SettingsRubricPage from "../app/(authenticated)/settings/rubric/page";
import SettingsRubricBuilderPage from "../app/(authenticated)/settings/rubric/builder/page";
import SettingsCompliancePage from "../app/(authenticated)/settings/compliance/page";
import UploadPage from "../app/(authenticated)/upload/page";
import CallsPage from "../app/(authenticated)/calls/page";
import CallDetailPage from "../app/(authenticated)/calls/[id]/page";
import HighlightsPage from "../app/(authenticated)/highlights/page";
import RoleplayPage from "../app/(authenticated)/roleplay/page";
import RoleplayHistoryPage from "../app/(authenticated)/roleplay/history/page";
import RepProfilePage from "../app/(authenticated)/team/[repId]/page";

async function renderRoute(
  page: Promise<React.ReactElement> | React.ReactElement,
) {
  return renderToStaticMarkup(await page);
}

describe("primary route hero removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCachedAuthenticatedSupabaseUserMock.mockResolvedValue({
      id: "auth-user-1",
    });

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
        orgId: "org-1",
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
    loadRubricHistoryMock.mockResolvedValue([]);

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
    getCallDetailMock.mockResolvedValue({
      ok: true,
      data: {
        id: "call-1",
        callTopic: "Discovery call with ACME",
        durationSeconds: 1096,
        overallScore: 82,
        repFirstName: "Morgan",
        repLastName: "Lee",
        status: "complete",
      },
    });
    listAnnotationsMock.mockResolvedValue({
      ok: true,
      data: { annotations: [] },
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
    createRoleplayRepositoryMock.mockReturnValue({});
    listRoleplaySessionsMock.mockResolvedValue({
      ok: true,
      data: {
        personas: [],
        sessions: [],
      },
    });
  });

  it("keeps compact route headers on primary pages while removing old hero copy", async () => {
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
    expect(teamHtml).toContain(">Team<");
    expect(teamHtml).toContain(
      "Review team performance, coaching focus, and rep-level score movement.",
    );

    expect(leaderboardHtml).toContain("Open team view");
    expect(leaderboardHtml).not.toContain(
      "Compare top-quality, top-volume, and most-improved slices across your team.",
    );
    expect(leaderboardHtml).toContain(">Leaderboard<");
    expect(leaderboardHtml).toContain(
      "Compare rank, score quality, call volume, and improvement across your team.",
    );

    expect(trainingHtml).toContain("Open highlights");
    expect(trainingHtml).toContain("Training learner panel marker");
    expect(trainingHtml).toContain(
      "Review assigned modules and complete the next lesson.",
    );
    expect(trainingHtml).toContain(">Training<");
  });

  it("wraps the training route in the standard authenticated content canvas", async () => {
    const trainingHtml = await renderRoute(TrainingPage());

    expect(trainingHtml).toContain(
      'data-authenticated-page-container="standard"',
    );
    expect(trainingHtml).toContain("px-4 py-6 sm:px-6 lg:px-8");
    expect(trainingHtml).toContain("max-w-7xl");
    expect(trainingHtml).toContain("Training learner panel marker");
  });

  it("keeps the learner training route from loading manager progress", async () => {
    getTrainingModulesMock.mockResolvedValue({
      ok: true,
      data: { canManage: false, modules: [] },
    });
    getTrainingTeamProgressMock.mockClear();

    await renderRoute(TrainingPage());

    expect(getTrainingTeamProgressMock).not.toHaveBeenCalled();
  });

  it("wraps the team and leaderboard routes in the standard authenticated content canvas", async () => {
    const [teamHtml, leaderboardHtml] = await Promise.all([
      renderRoute(TeamPage()),
      renderRoute(LeaderboardPage()),
    ]);

    expect(teamHtml).toContain('data-authenticated-page-container="standard"');
    expect(teamHtml).toContain("px-4 py-6 sm:px-6 lg:px-8");
    expect(teamHtml).toContain("max-w-7xl");
    expect(teamHtml).toContain("Team roster marker");
    expect(leaderboardHtml).toContain(
      'data-authenticated-page-container="standard"',
    );
    expect(leaderboardHtml).toContain("px-4 py-6 sm:px-6 lg:px-8");
    expect(leaderboardHtml).toContain("max-w-7xl");
    expect(leaderboardHtml).toContain("Open team view");
  });

  it("keeps visible heading behavior on top-level routes outside the feature scope", async () => {
    const [uploadHtml, notificationsHtml] = await Promise.all([
      renderRoute(UploadPage()),
      renderRoute(NotificationsPage()),
    ]);

    expect(uploadHtml).toContain("Upload call panel marker");
    expect(uploadHtml).toContain(">Upload Call<");
    expect(uploadHtml).toContain("Upload a call recording, name it clearly, and send it into analysis.");

    expect(notificationsHtml).toContain("Notifications panel marker");
    expect(notificationsHtml).toContain(">Notifications<");
    expect(notificationsHtml).toContain(
      "Review account activity and open the related record.",
    );
  });

  it("shows the settings control room while keeping settings panels", async () => {
    const [
      accountHtml,
      peopleHtml,
      teamsHtml,
      teamsManageHtml,
      permissionsHtml,
      permissionsManageHtml,
      integrationsHtml,
      complianceHtml,
    ] = await Promise.all([
      renderRoute(SettingsAccountPage()),
      renderRoute(SettingsPeoplePage()),
      renderRoute(SettingsTeamsPage()),
      renderRoute(SettingsTeamsManagePage()),
      renderRoute(SettingsPermissionsPage()),
      renderRoute(SettingsPermissionsManagePage()),
      renderRoute(SettingsIntegrationsPage()),
      renderRoute(SettingsCompliancePage()),
    ]);

    expect(accountHtml).toContain("Account panel marker");
    expect(accountHtml).toContain(">Settings<");
    expect(accountHtml).not.toContain(">All settings<");
    expect(accountHtml).not.toContain("Grouped account and admin controls.");
    expect(accountHtml).toContain('href="/settings/people"');

    expect(peopleHtml).toContain("People panel marker");
    expect(peopleHtml).toContain(">People<");
    expect(peopleHtml).not.toContain(
      "Manage org member roles and send or revoke invitations.",
    );
    expect(peopleHtml).toContain(
      "Manage users, invitations, and account access.",
    );

    expect(teamsHtml).toContain('data-teams-route="overview"');
    expect(teamsHtml).toContain('href="/settings/teams/manage"');
    expect(teamsHtml).not.toContain("Teams panel marker");
    expect(teamsManageHtml).toContain("Teams panel marker");
    expect(teamsHtml).toContain(">Teams<");
    expect(teamsHtml).not.toContain(
      "Create teams, edit metadata, and manage manager and rep assignments.",
    );
    expect(teamsHtml).toContain("Configure teams and manager assignments.");

    expect(permissionsHtml).toContain('data-permissions-route="overview"');
    expect(permissionsHtml).toContain('href="/settings/permissions/manage"');
    expect(permissionsHtml).not.toContain("Permissions panel marker");
    expect(permissionsManageHtml).toContain("Permissions panel marker");
    expect(permissionsHtml).toContain(">Permissions<");
    expect(permissionsHtml).not.toContain(
      "Configure permission presets and primary manager assignments per rep.",
    );
    expect(permissionsHtml).toContain(
      "Review role scopes and permission boundaries.",
    );

    expect(integrationsHtml).toContain("Integrations panel marker");
    expect(integrationsHtml).toContain(">Integrations<");
    expect(integrationsHtml).not.toContain(
      "Connect external tools to automate call imports and post-call workflows.",
    );
    expect(integrationsHtml).toContain(
      "Connect and monitor supported providers.",
    );

    expect(complianceHtml).toContain("Compliance panel marker");
    expect(complianceHtml).toContain(">Compliance<");
    expect(complianceHtml).not.toContain(
      "Configure call recording consent and review compliance acknowledgments.",
    );
    expect(complianceHtml).toContain(
      "Manage consent, retention, and coaching safeguards.",
    );
  });

  it("removes dashboard hero titles for rep, manager, and executive views while keeping route content", async () => {
    getManagerDashboardMock.mockResolvedValue({
      reps: [
        {
          id: "rep-1",
          firstName: "Morgan",
          lastName: "Lee",
          profileImageUrl: null,
          compositeScore: 62,
          weekOverWeekDelta: -8,
          needsCoaching: true,
          callCount: 3,
        },
      ],
      teamAvgScore: 84,
      totalCallsThisMonth: 17,
      coachingFlagsCount: 2,
    });

    getCachedCurrentUserProfileMock.mockResolvedValueOnce({ role: "rep" });
    const repHtml = await renderRoute(DashboardPage());

    getCachedCurrentUserProfileMock.mockResolvedValueOnce({ role: "manager" });
    const managerHtml = await renderRoute(DashboardPage());

    getCachedCurrentUserProfileMock.mockResolvedValueOnce({
      role: "executive",
    });
    const executiveHtml = await renderRoute(DashboardPage());

    expect(repHtml).toContain('href="/calls"');
    expect(repHtml).toContain('href="/training"');
    expect(repHtml).toContain('href="/calls/call-1"');
    expect(repHtml).toContain('data-dashboard-route="dashboard"');
    expect(repHtml).toContain('data-dashboard-today-queue="true"');
    expect(repHtml).toContain(">Dashboard<");
    expect(repHtml).toContain('data-operational-toolbar="true"');
    expect(repHtml).not.toContain('data-operational-metric-strip="true"');
    expect(repHtml).not.toContain(">Today<");
    expect(repHtml).toContain("Needs attention");
    expect(repHtml).not.toContain("Review queue");
    expect(repHtml).not.toContain("product dashboards");
    expect(repHtml).not.toContain("keeps the dashboard focused");
    expect(repHtml).not.toContain("Badges &amp; Milestones");
    expect(repHtml).not.toContain(">My Dashboard<");

    expect(managerHtml).toContain('href="/team"');
    expect(managerHtml).toContain('href="/upload"');
    expect(managerHtml).toContain("Morgan Lee");
    expect(managerHtml).toContain('data-dashboard-route="dashboard"');
    expect(managerHtml).toContain('data-dashboard-today-queue="true"');
    expect(managerHtml).toContain(">Dashboard<");
    expect(managerHtml).toContain('data-operational-toolbar="true"');
    expect(managerHtml).not.toContain('data-operational-metric-strip="true"');
    expect(managerHtml).toContain("Needs coaching");
    expect(managerHtml).toContain("Needs attention");
    expect(managerHtml).not.toContain(">Today<");
    expect(managerHtml).not.toContain("Team Avg Score");
    expect(managerHtml).not.toContain("Rep Performance");
    expect(managerHtml).not.toContain(">Team Dashboard<");

    expect(executiveHtml).toContain('href="/team"');
    expect(executiveHtml).toContain('href="/upload"');
    expect(executiveHtml).toContain('href="/training"');
    expect(executiveHtml).toContain("Training completion");
    expect(executiveHtml).toContain('data-dashboard-route="dashboard"');
    expect(executiveHtml).toContain('data-dashboard-today-queue="true"');
    expect(executiveHtml).toContain('data-operational-toolbar="true"');
    expect(executiveHtml).not.toContain('data-operational-metric-strip="true"');
    expect(executiveHtml).toContain("Needs attention");
    expect(executiveHtml).toContain(">Dashboard<");
    expect(executiveHtml).not.toContain(">Today<");
    expect(executiveHtml).not.toContain("Org Skill Averages");
    expect(executiveHtml).not.toContain("Call Volume");
    expect(executiveHtml).not.toContain("Rep Skill Matrix");
    expect(executiveHtml).not.toContain(">Executive Dashboard<");
    expect(executiveHtml).not.toContain(">Team Dashboard<");
  });

  it("keeps Dashboard route source copy focused on the attention queue", () => {
    const source = readFileSync(
      new URL("../app/(authenticated)/dashboard/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-dashboard-route="dashboard"');
    expect(source).toContain("Needs attention");
    expect(source).not.toContain("product dashboards");
    expect(source).not.toContain("keeps the dashboard focused");
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
    expect(callsHtml).toContain('data-calls-layout="table-first"');
    expect(callsHtml).toContain('data-calls-table-controls="true"');
    expect(callsHtml).toContain('data-calls-saved-views="route-filters"');
    expect(callsHtml).toContain('data-calls-primary-table="true"');
    expect(callsHtml).not.toContain('data-calls-surface="forge-ledger"');
    expect(callsHtml).toContain('data-mobile-call-card="true"');
    expect(callsHtml).toContain('data-operational-toolbar="true"');
    expect(callsHtml).not.toContain('data-operational-metric-strip="true"');
    expect(callsHtml).toContain('data-operational-preview-drawer="true"');
    expect(callsHtml).toContain('data-forge-table="true"');
    expect(callsHtml).toContain('data-forge-chip="success"');
    expect(callsHtml).not.toContain("Saved call views");
    expect(callsHtml).toContain("Open detail");
    expect(callsHtml).toContain("min-w-[720px]");
    expect(callsHtml).toContain(">Uploaded</th>");
    expect(callsHtml.indexOf('data-calls-table-controls="true"')).toBeLessThan(
      callsHtml.indexOf('data-calls-primary-table="true"'),
    );
    expect(callsHtml.indexOf("Calls filters marker")).toBeGreaterThan(
      callsHtml.indexOf('data-calls-table-controls="true"'),
    );
    expect(callsHtml).not.toContain("#74b1ff");
    expect(callsHtml).not.toContain("#6dddff");
    expect(callsHtml).not.toContain("backdrop-blur-md");
    expect(callsHtml).not.toContain(">Call Library<");
    expect(callsHtml).not.toContain(">Intelligence archive<");
  });

  it("uses the forge empty state for the calls library without changing upload flow", async () => {
    listCallsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        calls: [],
        total: 0,
        viewer: {
          fullName: "Avery Manager",
          role: "manager",
        },
      },
    });

    const callsHtml = await renderRoute(
      CallsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(callsHtml).toContain('data-forge-empty-state="true"');
    expect(callsHtml).toContain("No calls yet");
    expect(callsHtml).toContain('href="/upload"');
    expect(callsHtml).not.toContain("#74b1ff");
    expect(callsHtml).not.toContain("backdrop-blur-md");
  });

  it("removes the highlights hero while keeping the back-to-library action", async () => {
    const highlightsHtml = await renderRoute(HighlightsPage());

    expect(highlightsHtml).toContain('href="/calls"');
    expect(highlightsHtml).toContain('href="/calls/call-1"');
    expect(highlightsHtml).toContain(">Highlights<");
    expect(highlightsHtml).not.toContain(">Coaching evidence<");
  });

  it("translates approved Stitch patterns onto the remaining top-level menu routes", async () => {
    const [
      highlightsHtml,
      trainingHtml,
      roleplayHtml,
      teamHtml,
      leaderboardHtml,
      notificationsHtml,
      settingsHtml,
    ] = await Promise.all([
      renderRoute(HighlightsPage()),
      renderRoute(TrainingPage()),
      renderRoute(RoleplayPage({ searchParams: Promise.resolve({}) })),
      renderRoute(TeamPage()),
      renderRoute(LeaderboardPage()),
      renderRoute(NotificationsPage()),
      renderRoute(SettingsAccountPage()),
    ]);

    for (const html of [
      highlightsHtml,
      trainingHtml,
      roleplayHtml,
      teamHtml,
      leaderboardHtml,
      notificationsHtml,
      settingsHtml,
    ]) {
      expect(html).toContain('data-operational-workspace="true"');
      expect(html).toContain('data-operational-toolbar="true"');
    }

    expect(highlightsHtml).toContain('data-highlights-layout="evidence-inbox"');
    expect(highlightsHtml).toContain(
      'data-highlight-selection-flow="explicit"',
    );
    expect(highlightsHtml).not.toContain('data-operational-metric-strip="true"');
    expect(highlightsHtml).toContain('data-operational-preview-drawer="true"');
    expect(highlightsHtml).toContain('data-forge-table="true"');
    expect(highlightsHtml).not.toContain("Weekly Coaching Insights");
    expect(highlightsHtml).not.toContain("Intelligence Health");

    expect(trainingHtml).toContain(
      'data-training-route="operational-workspace"',
    );
    expect(trainingHtml).not.toContain('data-operational-metric-strip="true"');
    expect(trainingHtml).toContain("My training");
    expect(trainingHtml).toContain("Training learner panel marker");
    expect(trainingHtml).not.toContain("Builder controls");
    expect(trainingHtml).not.toContain("Generate with AI");
    expect(trainingHtml).not.toContain("Module editor preview");
    expect(trainingHtml).not.toContain("Module library");
    expect(trainingHtml).not.toContain('href="/training#builder"');

    expect(roleplayHtml).toContain(
      'data-roleplay-route="operational-workspace"',
    );
    expect(roleplayHtml).toContain('href="/roleplay/history"');
    expect(roleplayHtml).not.toContain('href="/roleplay#roleplay-history"');
    expect(roleplayHtml).toContain("Roleplay panel marker");

    expect(teamHtml).toContain('data-team-route="roster-first"');
    expect(teamHtml).not.toContain('data-operational-metric-strip="true"');
    expect(teamHtml).not.toContain('data-operational-preview-drawer="true"');
    expect(teamHtml).not.toContain('data-selected-object-drawer="true"');

    expect(leaderboardHtml).toContain('data-leaderboard-route="rank-table"');
    expect(leaderboardHtml).not.toContain('data-operational-metric-strip="true"');
    expect(leaderboardHtml).not.toContain('data-operational-preview-drawer="true"');
    expect(leaderboardHtml).not.toContain('data-selected-object-drawer="true"');
    expect(leaderboardHtml).not.toContain('href="/leaderboard?view=quality"');
    expect(leaderboardHtml).not.toContain("Period: Last 30 days");
    expect(leaderboardHtml).not.toContain("Team: All teams");
    expect(leaderboardHtml).not.toContain("Role: All roles");
    expect(leaderboardHtml).not.toContain(">Top Quality<");
    expect(leaderboardHtml).not.toContain(">Top Volume<");
    expect(leaderboardHtml).not.toContain(">Most Improved<");

    expect(settingsHtml).toContain('data-settings-route="settings"');
    expect(settingsHtml).toContain('data-operational-preview-drawer="true"');
    expect(settingsHtml).toContain("Personal");
    expect(settingsHtml).toContain("Sections");

    expect(notificationsHtml).toContain(
      'data-notifications-route="account-inbox"',
    );
    expect(notificationsHtml).not.toContain('data-operational-metric-strip="true"');
    expect(notificationsHtml).not.toContain(
      'data-operational-preview-drawer="true"',
    );
    expect(notificationsHtml).not.toContain("Mark all read");
    expect(notificationsHtml).toContain("Notifications panel marker");
  });

  it("splits manager training work into real team and builder routes", async () => {
    getTrainingModulesMock.mockResolvedValue({
      ok: true,
      data: {
        canManage: true,
        modules: [
          {
            id: "module-1",
            title: "Discovery fundamentals",
            progress: { status: "assigned" },
          },
        ],
      },
    });
    getTrainingTeamProgressMock.mockResolvedValue({
      ok: true,
      data: {
        progress: { modules: [], repProgress: [] },
        rows: [
          {
            repId: "rep-1",
            firstName: "Morgan",
            lastName: "Lee",
            email: "morgan@example.com",
            assigned: 2,
            passed: 1,
            completionRate: 50,
          },
        ],
      },
    });

    const [trainingHtml, teamProgressHtml, builderHtml] = await Promise.all([
      renderRoute(TrainingPage()),
      renderRoute(TrainingTeamPage()),
      renderRoute(TrainingBuilderPage()),
    ]);

    expect(trainingHtml).toContain(
      'data-training-route="operational-workspace"',
    );
    expect(trainingHtml).toContain('href="/training/team"');
    expect(trainingHtml).toContain('href="/training/builder"');
    expect(trainingHtml).toContain("Training learner panel marker");
    expect(trainingHtml).not.toContain("Builder controls");
    expect(trainingHtml).not.toContain("Generate with AI");
    expect(trainingHtml).not.toContain("Module editor preview");
    expect(trainingHtml).not.toContain('href="/training#team-progress"');
    expect(trainingHtml).not.toContain('href="/training#builder"');

    expect(teamProgressHtml).toContain('data-training-route="team-progress"');
    expect(teamProgressHtml).toContain('data-forge-table="true"');
    expect(teamProgressHtml).toContain('data-selected-object-drawer="true"');
    expect(teamProgressHtml).toContain("Morgan Lee");
    expect(teamProgressHtml).toContain("50%");
    expect(teamProgressHtml).toContain(
      'data-operational-preview-drawer="true"',
    );

    expect(builderHtml).toContain('data-training-route="builder"');
    expect(builderHtml).toContain("Training curriculum panel marker");
    expect(builderHtml).toContain(">Curriculum<");
    expect(builderHtml).toContain("Create module");
    expect(builderHtml).toContain("Edit selected module");
    expect(builderHtml).toContain("Assign selected module");
    expect(builderHtml).not.toContain("Generate with AI");
    expect(builderHtml).toContain('href="/training/team"');
    expect(builderHtml).toContain('href="/training"');
    expect(builderHtml).not.toContain("Builder controls");
    expect(builderHtml).not.toContain('data-operational-metric-strip="true"');
  });

  it("splits roleplay history into a dedicated table route", async () => {
    listRoleplaySessionsMock.mockResolvedValue({
      ok: true,
      data: {
        personas: [],
        sessions: [
          {
            id: "session-1",
            repId: "rep-1",
            orgId: "org-1",
            rubricId: "rubric-1",
            persona: null,
            personaDetails: {
              id: "skeptical-cfo",
              name: "Dana Mercer",
              role: "CFO",
              company: "Apex Manufacturing",
              industry: "Manufacturing",
              difficulty: "advanced",
              objectionType: "ROI & Budget",
              description: "Numbers-first evaluator.",
              avatarInitials: "DM",
              voice: "marin",
            },
            industry: "Manufacturing",
            difficulty: "advanced",
            overallScore: 87,
            origin: "manual",
            sourceCallId: null,
            focusMode: "all",
            focusCategorySlug: null,
            scenarioSummary: null,
            scenarioBrief: null,
            transcript: [],
            scorecard: null,
            status: "complete",
            createdAt: "2026-04-03T00:00:00.000Z",
          },
        ],
      },
    });

    const [roleplayHtml, historyHtml] = await Promise.all([
      renderRoute(RoleplayPage({ searchParams: Promise.resolve({}) })),
      renderRoute(RoleplayHistoryPage()),
    ]);

    expect(roleplayHtml).toContain('href="/roleplay/history"');
    expect(historyHtml).toContain('data-roleplay-route="history"');
    expect(historyHtml).toContain('data-forge-table="true"');
    expect(historyHtml).toContain('data-operational-preview-drawer="true"');
    expect(historyHtml).toContain('data-selected-object-drawer="true"');
    expect(historyHtml).toContain("ROI &amp; Budget");
    expect(historyHtml).toContain("87");
    expect(historyHtml).toContain('href="/roleplay?sessionId=session-1"');
  });

  it("translates generated Stitch patterns onto deeper drill-down workflows", async () => {
    getManagerDashboardMock.mockResolvedValue({
      reps: [
        {
          id: "rep-1",
          firstName: "Jared",
          lastName: "Newman",
          profileImageUrl: null,
          compositeScore: 82,
          callCount: 12,
          weekOverWeekDelta: 4,
          needsCoaching: true,
        },
      ],
      teamAvgScore: 84,
      totalCallsThisMonth: 17,
      coachingFlagsCount: 1,
    });
    getRepDashboardMock.mockResolvedValue({
      monthlyAvgScore: 78,
      recentCalls: [],
      lowestCategories: [],
      weeklyTrend: [],
      categoryAnalyticsContextLabel: "Last 30 days",
    });

    const [uploadHtml, callDetailHtml, repProfileHtml] = await Promise.all([
      renderRoute(UploadPage()),
      renderRoute(
        CallDetailPage({ params: Promise.resolve({ id: "call-1" }) }),
      ),
      renderRoute(
        RepProfilePage({ params: Promise.resolve({ repId: "rep-1" }) }),
      ),
    ]);

    for (const html of [uploadHtml, callDetailHtml, repProfileHtml]) {
      expect(html).toContain('data-operational-workspace="true"');
      expect(html).toContain('data-operational-toolbar="true"');
    }

    expect(uploadHtml).toContain('data-upload-route="capture-workflow"');
    expect(uploadHtml).not.toContain('data-operational-metric-strip="true"');
    expect(uploadHtml).not.toContain('data-operational-preview-drawer="true"');
    expect(uploadHtml).not.toContain("Upload readiness");
    expect(uploadHtml).toContain("Upload call panel marker");
    expect(uploadHtml).not.toContain("Choose recording");
    expect(uploadHtml).not.toContain('data-page-frame="true"');

    expect(callDetailHtml).toContain('data-call-detail-route="review-bench"');
    expect(callDetailHtml).not.toContain('data-operational-metric-strip="true"');
    expect(callDetailHtml).not.toContain('data-operational-preview-drawer="true"');
    expect(callDetailHtml).toContain("Discovery call with ACME");
    expect(callDetailHtml).toContain("Call detail panel marker");
    expect(callDetailHtml).not.toContain(">Review bench<");

    expect(repProfileHtml).toContain(
      'data-rep-profile-route="coaching-detail"',
    );
    expect(repProfileHtml).not.toContain('data-operational-metric-strip="true"');
    expect(repProfileHtml).toContain('data-operational-preview-drawer="true"');
    expect(repProfileHtml).toContain('data-selected-object-drawer="true"');
    expect(repProfileHtml).toContain("Rep profile marker");
    expect(repProfileHtml).not.toContain(">Rep Profile<");
  });

  it("translates the settings detail pages into the generated Stitch settings workspace", async () => {
    const [
      peopleHtml,
      teamsHtml,
      teamsManageHtml,
      permissionsHtml,
      permissionsManageHtml,
      integrationsHtml,
      rubricHtml,
      rubricBuilderHtml,
      complianceHtml,
    ] = await Promise.all([
      renderRoute(SettingsPeoplePage()),
      renderRoute(SettingsTeamsPage()),
      renderRoute(SettingsTeamsManagePage()),
      renderRoute(SettingsPermissionsPage()),
      renderRoute(SettingsPermissionsManagePage()),
      renderRoute(SettingsIntegrationsPage()),
      renderRoute(SettingsRubricPage()),
      renderRoute(SettingsRubricBuilderPage()),
      renderRoute(SettingsCompliancePage()),
    ]);

    for (const html of [
      peopleHtml,
      teamsHtml,
      teamsManageHtml,
      permissionsHtml,
      permissionsManageHtml,
      integrationsHtml,
      rubricHtml,
      rubricBuilderHtml,
      complianceHtml,
    ]) {
      expect(html).toContain('data-operational-workspace="true"');
      expect(html).toContain('data-operational-toolbar="true"');
      expect(html).toContain('data-secondary-rail="settings"');
      expect(html).not.toContain('data-settings-internal-subnav="true"');
      expect(html).not.toContain('data-page-frame="true"');
    }

    const settingsBundle = `${peopleHtml}${teamsHtml}${teamsManageHtml}${permissionsHtml}${permissionsManageHtml}${integrationsHtml}${rubricHtml}${rubricBuilderHtml}${complianceHtml}`;
    expect(settingsBundle).not.toContain("Generate with AI");
    expect(settingsBundle).not.toContain("Edit selected module");
    expect(settingsBundle).not.toContain("Assign selected module");

    for (const html of [
      teamsHtml,
      permissionsHtml,
      integrationsHtml,
      rubricHtml,
      complianceHtml,
    ]) {
      expect(html).toContain('data-operational-preview-drawer="true"');
    }

    expect(peopleHtml).toContain('data-settings-detail-route="people"');
    expect(peopleHtml).toContain("People panel marker");
    expect(peopleHtml).toContain('data-settings-detail-panel="true"');
    expect(peopleHtml).not.toContain('data-operational-preview-drawer="true"');
    expect(teamsHtml).toContain('data-settings-detail-route="teams"');
    expect(teamsHtml).toContain('data-teams-route="overview"');
    expect(teamsHtml).toContain('data-forge-table="true"');
    expect(teamsHtml).toContain('href="/settings/teams/manage"');
    expect(teamsHtml).not.toContain("Teams panel marker");
    expect(teamsManageHtml).toContain('data-settings-detail-route="teams"');
    expect(teamsManageHtml).toContain('data-settings-editor-route="teams"');
    expect(teamsManageHtml).toContain('href="/settings/teams"');
    expect(teamsManageHtml).toContain("Teams panel marker");
    expect(teamsManageHtml).toContain('data-settings-editor-panel="true"');
    expect(teamsManageHtml).not.toContain(
      'data-operational-preview-drawer="true"',
    );
    expect(permissionsHtml).toContain(
      'data-settings-detail-route="permissions"',
    );
    expect(permissionsHtml).toContain('data-permissions-route="overview"');
    expect(permissionsHtml).toContain('data-forge-table="true"');
    expect(permissionsHtml).toContain('href="/settings/permissions/manage"');
    expect(permissionsHtml).not.toContain("Permissions panel marker");
    expect(permissionsManageHtml).toContain(
      'data-settings-detail-route="permissions"',
    );
    expect(permissionsManageHtml).toContain(
      'data-settings-editor-route="permissions"',
    );
    expect(permissionsManageHtml).toContain('href="/settings/permissions"');
    expect(permissionsManageHtml).toContain("Permissions panel marker");
    expect(permissionsManageHtml).toContain(
      'data-settings-editor-panel="true"',
    );
    expect(permissionsManageHtml).not.toContain(
      'data-operational-preview-drawer="true"',
    );
    expect(integrationsHtml).toContain(
      'data-settings-detail-route="integrations"',
    );
    expect(integrationsHtml).toContain("Integrations panel marker");
    expect(rubricHtml).toContain('data-settings-detail-route="rubrics"');
    expect(rubricHtml).toContain('data-rubric-route="overview"');
    expect(rubricHtml).toContain('data-forge-table="true"');
    expect(rubricHtml).toContain('href="/settings/rubric/builder"');
    expect(rubricHtml).not.toContain("Rubrics panel marker");
    expect(rubricBuilderHtml).toContain('data-settings-detail-route="rubrics"');
    expect(rubricBuilderHtml).toContain('data-settings-editor-route="rubrics"');
    expect(rubricBuilderHtml).toContain('href="/settings/rubric"');
    expect(rubricBuilderHtml).toContain("Rubrics panel marker");
    expect(rubricBuilderHtml).toContain('data-settings-editor-panel="true"');
    expect(rubricBuilderHtml).not.toContain(
      'data-operational-preview-drawer="true"',
    );
    expect(complianceHtml).toContain('data-settings-detail-route="compliance"');
    expect(complianceHtml).toContain("Compliance panel marker");
  });
});
