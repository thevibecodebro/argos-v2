import { LeaderboardPageView } from "@/components/leaderboard-page-view";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";
import { getCachedAuthenticatedSupabaseUser, getCachedCurrentUserProfile } from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardLeaderboard } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function LeaderboardPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const leaderboardAccess = authUser ? await requireManagedCapabilityForPage(authUser.id, "leaderboard") : null;
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;
  const repository = authUser
    ? await createEffectiveTenantRepository(createDashboardRepository(), authUser.id)
    : null;
  const leaderboard = authUser
    ? await getDashboardLeaderboard(repository ?? createDashboardRepository(), authUser.id)
    : null;

  return <LeaderboardPageView leaderboard={leaderboard} canViewProfiles={Boolean(profile && profile.role !== "rep" && leaderboardAccess && hasManagedCapability(leaderboardAccess.access, "call_analytics"))} />;
}
