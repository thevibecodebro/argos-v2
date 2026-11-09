import { notFound, redirect } from "next/navigation";
import { TeamRepPageView } from "@/components/team/team-pages";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
} from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";

export default async function RepProfilePage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = await params;
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const analyticsAccess = authUser
    ? await requireManagedCapabilityForPage(authUser.id, "call_analytics")
    : null;
  const repository = authUser
    ? await createEffectiveTenantRepository(createDashboardRepository(), authUser.id)
    : createDashboardRepository();

  const [managerDashboard, repDashboard, badges] = authUser
    ? await Promise.all([
        getManagerDashboard(repository, authUser.id),
        getRepDashboard(repository, authUser.id, repId),
        getRepBadges(repository, authUser.id, repId, undefined, {
          includePracticeReporting: analyticsAccess
            ? hasManagedCapability(analyticsAccess.access, "practice_reporting")
            : false,
        }),
      ])
    : [null, null, null];

  const rep = managerDashboard?.reps.find((member) => member.id === repId);

  if (!rep || !repDashboard) {
    notFound();
  }

  return <TeamRepPageView badges={badges} rep={rep} repDashboard={repDashboard} canViewTraining={Boolean(analyticsAccess && hasManagedCapability(analyticsAccess.access, "training"))} />;
}
