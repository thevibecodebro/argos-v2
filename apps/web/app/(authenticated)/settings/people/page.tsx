import { redirect } from "next/navigation";
import { PeoplePanel } from "@/components/panel-loaders/people-panel-loader";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { listPendingInvites } from "@/lib/invites/service";
import {
  createEffectiveTenantTeamAccessRepository,
  createEffectiveTenantUsersRepository,
} from "@/lib/platform/effective-request";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { listOrganizationMembers } from "@/lib/users/service";
import { SettingsOperationalLayout } from "../settings-operational-layout";

type SettingsPeoplePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InviteRole = "rep" | "manager" | "executive" | "admin";

const INVITE_ROLES: InviteRole[] = ["rep", "manager", "executive", "admin"];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInitialInviteRole(
  searchParams: Record<string, string | string[] | undefined>,
): InviteRole | undefined {
  const role = firstValue(searchParams.invite);
  return INVITE_ROLES.includes(role as InviteRole) ? (role as InviteRole) : undefined;
}

export default async function SettingsPeoplePage({
  searchParams,
}: SettingsPeoplePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialInviteRole = parseInitialInviteRole(resolvedSearchParams);
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const [usersRepository, teamAccessRepository] = await Promise.all([
    createEffectiveTenantUsersRepository(createUsersRepository(), authUser.id),
    createEffectiveTenantTeamAccessRepository(createTeamAccessRepository(), authUser.id),
  ]);
  const [membersResult, teamAccessResult, pendingInvitesResult] = await Promise.all([
    listOrganizationMembers(usersRepository, authUser.id),
    getTeamAccessSnapshot(teamAccessRepository, authUser.id),
    listPendingInvites(createInvitesRepository(), usersRepository, authUser.id),
  ]);

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/people?invite=rep#people-invite", icon: "person_add", label: "Invite user", variant: "primary" }]}
      description="Manage users, invitations, and account access."
      route="people"
      title="People"
    >
      <PeoplePanel
        currentUserId={authUser.id}
        initialInviteRole={initialInviteRole}
        initialMembers={membersResult?.ok ? membersResult.data : []}
        initialPendingInvites={pendingInvitesResult?.ok ? pendingInvitesResult.data : []}
        initialTeams={teamAccessResult?.ok ? teamAccessResult.data.teams : []}
      />
    </SettingsOperationalLayout>
  );
}
