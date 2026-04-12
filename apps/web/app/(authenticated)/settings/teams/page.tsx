import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamsPanel } from "@/components/settings/teams-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsTeamsPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const [snapshotResult, membersResult] = await Promise.all([
    getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id),
    listOrganizationMembers(createUsersRepository(), authUser.id),
  ]);

  const snapshot = snapshotResult.ok ? snapshotResult.data : null;
  const orgMembers = membersResult.ok ? membersResult.data : [];

  const teams = snapshot?.teams ?? [];
  const memberships = snapshot?.memberships ?? [];
  const reps = snapshot?.reps ?? [];

  // Build a lookup: userId → primaryManagerId (from the reps array)
  const repPrimaryManagerById = new Map<string, string | null>(
    reps.map((r) => [r.id, r.primaryManagerId]),
  );

  // Build primaryManagerMap: teamId → manager userId or null
  // Strategy: for each team, collect all rep memberships, gather their primaryManagerIds,
  // and pick the most frequent non-null one as the team's primary manager.
  const primaryManagerMap: Record<string, string | null> = {};
  for (const team of teams) {
    const repMembershipsOnTeam = memberships.filter(
      (m) => m.teamId === team.id && m.membershipType === "rep",
    );

    const managerCounts = new Map<string, number>();
    for (const membership of repMembershipsOnTeam) {
      const primaryManagerId = repPrimaryManagerById.get(membership.userId);
      if (primaryManagerId) {
        managerCounts.set(
          primaryManagerId,
          (managerCounts.get(primaryManagerId) ?? 0) + 1,
        );
      }
    }

    if (managerCounts.size === 0) {
      primaryManagerMap[team.id] = null;
    } else {
      // Pick the manager with the most reps assigned to them
      let topManagerId: string | null = null;
      let topCount = 0;
      for (const [managerId, count] of managerCounts.entries()) {
        if (count > topCount) {
          topCount = count;
          topManagerId = managerId;
        }
      }
      primaryManagerMap[team.id] = topManagerId;
    }
  }

  // Build membersByTeam: teamId → array of TeamMember (with name/email from orgMembers)
  const orgMemberById = new Map(orgMembers.map((m) => [m.id, m]));

  const membersByTeam: Record<
    string,
    Array<{
      userId: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    }>
  > = {};

  for (const team of teams) {
    const teamMemberships = memberships.filter((m) => m.teamId === team.id);
    membersByTeam[team.id] = teamMemberships.flatMap((m) => {
      const member = orgMemberById.get(m.userId);
      if (!member) return [];
      return [
        {
          userId: m.userId,
          role: m.membershipType,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
        },
      ];
    });
  }

  const panelOrgMembers = orgMembers.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role ?? "",
  }));

  return (
    <PageFrame
      description="View team structure, primary managers, and rep assignments."
      eyebrow="Settings"
      title="Teams"
    >
      <TeamsPanel
        membersByTeam={membersByTeam}
        orgMembers={panelOrgMembers}
        primaryManagerMap={primaryManagerMap}
        teams={teams}
      />
    </PageFrame>
  );
}
