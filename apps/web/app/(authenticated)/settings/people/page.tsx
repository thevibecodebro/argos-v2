import { redirect } from "next/navigation";
import { PeoplePanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { listPendingInvites } from "@/lib/invites/service";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { listOrganizationMembers } from "@/lib/users/service";
import { SettingsOperationalLayout } from "../settings-operational-layout";

export default async function SettingsPeoplePage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const [membersResult, teamAccessResult, pendingInvitesResult] = await Promise.all([
    listOrganizationMembers(createUsersRepository(), authUser.id),
    getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id),
    listPendingInvites(createInvitesRepository(), createUsersRepository(), authUser.id),
  ]);

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/people", icon: "person_add", label: "Invite user", variant: "primary" }]}
      description="Manage users, invitations, and account access."
      previewDescription="Member access and pending invitation status."
      previewRows={[
        { label: "Members", value: membersResult?.ok ? membersResult.data.length : 0 },
        { label: "Pending invites", value: pendingInvitesResult?.ok ? pendingInvitesResult.data.length : 0 },
        { label: "Teams", value: teamAccessResult?.ok ? teamAccessResult.data.teams.length : 0 },
        { label: "Scope", tone: "gold", value: "Admin" },
      ]}
      previewTitle="People status"
      route="people"
      title="People"
    >
      <PeoplePanel
        currentUserId={authUser.id}
        initialMembers={membersResult?.ok ? membersResult.data : []}
        initialPendingInvites={pendingInvitesResult?.ok ? pendingInvitesResult.data : []}
        initialTeams={teamAccessResult?.ok ? teamAccessResult.data.teams : []}
      />
    </SettingsOperationalLayout>
  );
}
