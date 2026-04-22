import { notFound, redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamRepProfileView } from "@/components/team/team-views";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  getCurrentUserProfile,
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
} from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function RepProfilePage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = await params;
  const authUser = await getAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser
    ? await getCurrentUserProfile(repository, authUser.id)
    : null;

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
