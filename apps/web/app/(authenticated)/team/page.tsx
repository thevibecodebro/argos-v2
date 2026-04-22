import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamRosterView } from "@/components/team/team-views";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getManagerDashboard } from "@/lib/dashboard/service";

export default async function TeamPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const dashboard = authUser ? await getManagerDashboard(repository, authUser.id) : null;

  return (
    <section className="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full">
      <PageFrame
        headerMode="hidden"
        actions={[{ href: "/leaderboard", label: "Open leaderboard" }]}
        description="Review team performance with week-over-week trend, call volume, and coaching flags."
        eyebrow="Team"
        title="Team"
      >
        <TeamRosterView dashboard={dashboard} />
      </PageFrame>
    </section>
  );
}
