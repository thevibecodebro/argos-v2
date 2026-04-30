import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
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
    <AuthenticatedPageContainer>
      <PageFrame
        actions={[{ href: "/leaderboard", label: "Open leaderboard" }]}
        description="Review team performance, coaching focus, and rep-level score movement."
        eyebrow="Team"
        title="Team"
      >
        <TeamRosterView dashboard={dashboard} />
      </PageFrame>
    </AuthenticatedPageContainer>
  );
}
