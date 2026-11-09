import { hasManagedCapability } from "@/lib/access/managed-capabilities";
import { redirect } from "next/navigation";
import { TeamPageView } from "@/components/team/team-pages";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getManagerDashboard } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function TeamPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const analyticsAccess = authUser ? await requireManagedCapabilityForPage(authUser.id, "call_analytics") : null;
  const repository = authUser
    ? await createEffectiveTenantRepository(createDashboardRepository(), authUser.id)
    : createDashboardRepository();

  const dashboard = authUser ? await getManagerDashboard(repository, authUser.id) : null;
  return <TeamPageView dashboard={dashboard} canViewLeaderboard={Boolean(analyticsAccess && hasManagedCapability(analyticsAccess.access, "leaderboard"))} />;
}
