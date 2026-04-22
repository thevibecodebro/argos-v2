import { notFound, redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamRepProfileView } from "@/components/team/team-views";
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

export default async function RepProfilePage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = await params;
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const [managerDashboard, repDashboard, badges] = authUser
    ? await Promise.all([
        getManagerDashboard(repository, authUser.id),
        getRepDashboard(repository, authUser.id, repId),
        getRepBadges(repository, authUser.id, repId),
      ])
    : [null, null, null];

  const rep = managerDashboard?.reps.find((member) => member.id === repId);

  if (!rep || !repDashboard) {
    notFound();
  }

  return (
    <PageFrame
      actions={[
        { href: "/team", label: "Back to team" },
        { href: "/calls", label: "Open calls" },
      ]}
      description="Review score trends, focus categories, badges, and recent calls for the selected team member."
      eyebrow="Coaching"
      title="Rep Profile"
    >
      <TeamRepProfileView badges={badges} rep={rep} repDashboard={repDashboard} />
    </PageFrame>
  );
}
