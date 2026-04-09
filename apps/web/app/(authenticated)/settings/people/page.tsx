import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { PeoplePanel } from "@/components/settings/people-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { listPendingInvites } from "@/lib/invites/service";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsPeoplePage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const [membersResult, teamAccessResult, pendingInvitesResult] = await Promise.all([
    listOrganizationMembers(createUsersRepository(), authUser.id),
    getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id),
    listPendingInvites(createInvitesRepository(), createUsersRepository(), authUser.id),
  ]);

  return (
    <PageFrame
      description="Manage org member roles and send or revoke invitations."
      eyebrow="Settings"
      title="People"
    >
      <PeoplePanel
        currentUserId={authUser.id}
        initialMembers={membersResult?.ok ? membersResult.data : []}
        initialPendingInvites={pendingInvitesResult?.ok ? pendingInvitesResult.data : []}
        initialTeams={teamAccessResult?.ok ? teamAccessResult.data.teams : []}
      />
    </PageFrame>
  );
}
