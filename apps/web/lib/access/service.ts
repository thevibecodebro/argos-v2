import type {
  AccessActor,
  TeamMembershipRecord,
  TeamPermissionGrantRecord,
  TeamPermissionKey,
} from "./permissions";

export type AccessContext = {
  actor: AccessActor;
  repIdsByTeamId: Map<string, Set<string>>;
  grantedTeamIdsByPermission: Map<TeamPermissionKey, Set<string>>;
  canSeeLeaderboard: boolean;
};

export function buildAccessContext(input: {
  actor: AccessActor;
  memberships: TeamMembershipRecord[];
  grants: TeamPermissionGrantRecord[];
}): AccessContext {
  const repIdsByTeamId = new Map<string, Set<string>>();
  for (const membership of input.memberships) {
    if (membership.membershipType !== "rep") continue;
    const current = repIdsByTeamId.get(membership.teamId) ?? new Set<string>();
    current.add(membership.userId);
    repIdsByTeamId.set(membership.teamId, current);
  }

  const grantedTeamIdsByPermission = new Map<TeamPermissionKey, Set<string>>();
  for (const grant of input.grants) {
    if (grant.userId !== input.actor.id) continue;
    const current = grantedTeamIdsByPermission.get(grant.permissionKey) ?? new Set<string>();
    current.add(grant.teamId);
    grantedTeamIdsByPermission.set(grant.permissionKey, current);
  }

  return {
    actor: input.actor,
    repIdsByTeamId,
    grantedTeamIdsByPermission,
    canSeeLeaderboard: Boolean(input.actor.orgId),
  };
}

export function canActorViewRep(access: AccessContext, repId: string) {
  if (access.actor.role === "admin" || access.actor.role === "executive") return true;
  if (access.actor.role === "rep") return access.actor.id === repId;

  const teamIds = access.grantedTeamIdsByPermission.get("view_team_calls") ?? new Set<string>();
  for (const teamId of teamIds) {
    if (access.repIdsByTeamId.get(teamId)?.has(repId)) return true;
  }
  return false;
}

export function canActorUsePermissionForRep(
  access: AccessContext,
  permissionKey: TeamPermissionKey,
  repId: string,
) {
  if (access.actor.role === "admin" || access.actor.role === "executive") return true;
  if (access.actor.role !== "manager") return false;

  const teamIds = access.grantedTeamIdsByPermission.get(permissionKey) ?? new Set<string>();
  for (const teamId of teamIds) {
    if (access.repIdsByTeamId.get(teamId)?.has(repId)) return true;
  }
  return false;
}

export function canActorDrillIntoLeaderboardRep(access: AccessContext, repId: string) {
  if (access.actor.role === "admin" || access.actor.role === "executive") return true;
  if (access.actor.role === "rep") return access.actor.id === repId;
  return canActorUsePermissionForRep(access, "view_team_analytics", repId);
}
