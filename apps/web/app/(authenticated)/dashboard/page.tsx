import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { ForgeEmptyState as EmptyState } from "@/components/forge";
import { createAccessRepository } from "@/lib/access/create-repository";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  createEffectiveAccessRepository,
  createEffectiveDashboardRepository,
} from "@/lib/dashboard/effective-platform";
import {
  getExecutiveDashboard,
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
  getSetupStatus,
} from "@/lib/dashboard/service";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";

export default async function DashboardPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (!authUser || !profile) {
    return (
      <AuthenticatedPageContainer>
        <div className="space-y-6" data-dashboard-route="dashboard">
          <WorkspacePageHeader
            description="This account is authenticated but is not provisioned inside the Argos app database yet."
            title="Dashboard unavailable"
          />
          <EmptyState
            description="Complete app provisioning first, then reload the dashboard to unlock the attention queue."
            title="User record missing"
          />
        </div>
      </AuthenticatedPageContainer>
    );
  }

  const analyticsAccess = await requireManagedCapabilityForPage(authUser.id, "call_analytics");
  const practiceReportingEnabled = hasManagedCapability(
    analyticsAccess.access,
    "practice_reporting",
  );

  const isExecutive = profile.role === "executive";
  const isManager = isExecutive || profile.role === "manager" || profile.role === "admin";
  const isPlatformSessionProfile = profile.email?.startsWith("platform:") ?? false;
  const dashboardRepository = authUser && isPlatformSessionProfile
    ? createEffectiveDashboardRepository(repository, profile, authUser.id)
    : repository;
  const accessRepository = authUser && isPlatformSessionProfile
    ? createEffectiveAccessRepository(createAccessRepository(), profile, authUser.id)
    : undefined;

  const [repDashboard, badges, managerDashboard, executiveDashboard, setupStatus] =
    await Promise.all([
      getRepDashboard(dashboardRepository, authUser.id, undefined, undefined, accessRepository),
      getRepBadges(dashboardRepository, authUser.id, undefined, accessRepository, {
        includePracticeReporting: practiceReportingEnabled,
      }),
      isManager
        ? getManagerDashboard(dashboardRepository, authUser.id, undefined, accessRepository)
        : Promise.resolve(null),
      isExecutive
        ? getExecutiveDashboard(dashboardRepository, authUser.id, undefined, undefined, {
            includePracticeReporting: practiceReportingEnabled,
          })
        : Promise.resolve(null),
      isManager && practiceReportingEnabled
        ? getSetupStatus(dashboardRepository, authUser.id)
        : Promise.resolve(null),
    ]);
  return <AuthenticatedPageContainer><DashboardWorkspace badges={badges?.badges ?? []} executiveDashboard={executiveDashboard} isExecutive={isExecutive} isManager={isManager} managerDashboard={managerDashboard} repDashboard={repDashboard} setupStatus={setupStatus} canUpload={hasManagedCapability(analyticsAccess.access, "call_upload")} canTrain={hasManagedCapability(analyticsAccess.access, "training")} canPractice={hasManagedCapability(analyticsAccess.access, "roleplay")} canManageWorkspace={profile.role === "admin"} canBrand={hasManagedCapability(analyticsAccess.access, "workspace_branding")} /></AuthenticatedPageContainer>;
}
