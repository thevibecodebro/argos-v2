import type { TeamPermissionKey } from "@/lib/access/permissions";

export const PRESET_GRANTS = {
  Coach: [
    "view_team_calls",
    "coach_team_calls",
    "manage_call_highlights",
    "view_team_analytics",
  ],
  "Training Manager": [
    "view_team_training",
    "manage_team_training",
    "view_team_analytics",
  ],
  "Team Lead": [
    "view_team_calls",
    "coach_team_calls",
    "manage_call_highlights",
    "view_team_training",
    "manage_team_training",
    "manage_team_roster",
    "view_team_analytics",
  ],
} as const satisfies Record<string, readonly TeamPermissionKey[]>;

export type ManagerPermissionPreset = keyof typeof PRESET_GRANTS;
export type TeamMembershipType = "rep" | "manager";

export type TeamAccessViewer = {
  id: string;
  role: string | null;
  org: { id: string; name: string; slug: string; plan: string } | null;
};

export type TeamAccessTeam = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export type TeamAccessManager = {
  id: string;
  name: string;
};

export type TeamAccessRep = {
  id: string;
  name: string;
  primaryManagerId: string | null;
};

export type TeamAccessMembership = {
  teamId: string;
  userId: string;
  membershipType: TeamMembershipType;
};

export type TeamAccessGrant = {
  teamId: string;
  userId: string;
  permissionKey: TeamPermissionKey;
};

export type TeamAccessSnapshot = {
  teams: TeamAccessTeam[];
  managers: TeamAccessManager[];
  reps: TeamAccessRep[];
  memberships: TeamAccessMembership[];
  grants: TeamAccessGrant[];
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export type TeamAccessRepository = {
  findCurrentUserByAuthId(authUserId: string): Promise<TeamAccessViewer | null>;
  findOrganizationUserRole(orgId: string, userId: string): Promise<string | null>;
  createTeam(input: { orgId: string; name: string; description: string | null }): Promise<unknown>;
  updateTeam(
    orgId: string,
    teamId: string,
    patch: { name?: string; description?: string | null; status?: "active" | "archived" },
  ): Promise<unknown>;
  upsertPrimaryManagerAssignment(
    orgId: string,
    repId: string,
    managerId: string,
  ): Promise<unknown>;
  addTeamMembership(
    orgId: string,
    teamId: string,
    userId: string,
    membershipType: TeamMembershipType,
  ): Promise<unknown>;
  removeTeamMembership(
    orgId: string,
    teamId: string,
    userId: string,
    membershipType: TeamMembershipType,
  ): Promise<boolean>;
  replaceManagerTeamPermissionGrants(input: {
    orgId: string;
    teamId: string;
    managerId: string;
    permissionKeys: TeamPermissionKey[];
    grantedBy: string;
  }): Promise<TeamPermissionKey[]>;
  findTeamAccessSnapshot(orgId: string): Promise<TeamAccessSnapshot>;
};

function assertAdmin(viewer: TeamAccessViewer) {
  if (viewer.role !== "admin" || !viewer.org) {
    return { ok: false as const, status: 403 as const, error: "Admin only" };
  }

  return { ok: true as const, orgId: viewer.org.id };
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeTeamStatus(value: unknown) {
  if (value === "active" || value === "archived") {
    return value;
  }

  return null;
}

function isPreset(value: unknown): value is ManagerPermissionPreset {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PRESET_GRANTS, value);
}

function isMembershipType(value: unknown): value is TeamMembershipType {
  return value === "rep" || value === "manager";
}

async function findValidatedRole(
  repository: TeamAccessRepository,
  orgId: string,
  userId: string,
) {
  return repository.findOrganizationUserRole(orgId, userId);
}

export async function createTeam(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { name?: unknown; description?: unknown },
): Promise<ServiceResult<unknown>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const name = normalizeString(input.name);
  if (!name) {
    return { ok: false, status: 400, error: "name is required" };
  }

  const description = normalizeString(input.description);
  const team = await repository.createTeam({
    orgId: adminCheck.orgId,
    name,
    description,
  });

  return { ok: true, data: team };
}

export async function updateTeamMetadata(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { teamId?: unknown; name?: unknown; description?: unknown; status?: unknown },
): Promise<ServiceResult<TeamAccessTeam>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const teamId = normalizeString(input.teamId);
  if (!teamId) {
    return { ok: false, status: 400, error: "teamId is required" };
  }

  const patch: { name?: string; description?: string | null; status?: "active" | "archived" } = {};

  if (input.name !== undefined) {
    const name = normalizeString(input.name);
    if (!name) {
      return { ok: false, status: 400, error: "name is required" };
    }
    patch.name = name;
  }

  if (input.description !== undefined) {
    patch.description = normalizeString(input.description);
  }

  if (input.status !== undefined) {
    const status = normalizeTeamStatus(input.status);
    if (!status) {
      return { ok: false, status: 400, error: "status must be active or archived" };
    }
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, status: 400, error: "At least one team field must be provided" };
  }

  const team = await repository.updateTeam(adminCheck.orgId, teamId, patch);

  return { ok: true, data: team as TeamAccessTeam };
}

export async function assignPrimaryManager(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { repId?: unknown; managerId?: unknown },
): Promise<ServiceResult<unknown>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const repId = normalizeString(input.repId);
  const managerId = normalizeString(input.managerId);
  if (!repId || !managerId) {
    return { ok: false, status: 400, error: "repId and managerId are required" };
  }

  const [repRole, managerRole] = await Promise.all([
    findValidatedRole(repository, adminCheck.orgId, repId),
    findValidatedRole(repository, adminCheck.orgId, managerId),
  ]);
  if (repRole !== "rep") {
    return { ok: false, status: 400, error: "repId must belong to a rep" };
  }
  if (managerRole !== "manager") {
    return { ok: false, status: 400, error: "managerId must belong to a manager" };
  }

  const assignment = await repository.upsertPrimaryManagerAssignment(adminCheck.orgId, repId, managerId);
  return { ok: true, data: assignment };
}

async function addTeamMembershipWithRole(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { teamId?: unknown; userId?: unknown },
  membershipType: TeamMembershipType,
): Promise<ServiceResult<TeamAccessSnapshot>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const teamId = normalizeString(input.teamId);
  const userId = normalizeString(input.userId);
  if (!teamId || !userId) {
    return { ok: false, status: 400, error: "teamId and userId are required" };
  }

  const userRole = await findValidatedRole(repository, adminCheck.orgId, userId);
  if (userRole !== membershipType) {
    return {
      ok: false,
      status: 400,
      error: membershipType === "manager" ? "userId must belong to a manager" : "userId must belong to a rep",
    };
  }

  await repository.addTeamMembership(adminCheck.orgId, teamId, userId, membershipType);

  return {
    ok: true,
    data: await repository.findTeamAccessSnapshot(adminCheck.orgId),
  };
}

export async function addTeamManagerMembership(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { teamId?: unknown; userId?: unknown },
): Promise<ServiceResult<TeamAccessSnapshot>> {
  return addTeamMembershipWithRole(repository, authUserId, input, "manager");
}

export async function addTeamRepMembership(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { teamId?: unknown; userId?: unknown },
): Promise<ServiceResult<TeamAccessSnapshot>> {
  return addTeamMembershipWithRole(repository, authUserId, input, "rep");
}

export async function removeTeamMembership(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { teamId?: unknown; userId?: unknown; membershipType?: unknown },
): Promise<ServiceResult<TeamAccessSnapshot>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const teamId = normalizeString(input.teamId);
  const userId = normalizeString(input.userId);
  const membershipType = isMembershipType(input.membershipType) ? input.membershipType : null;

  if (!teamId || !userId || !membershipType) {
    return { ok: false, status: 400, error: "teamId, userId, and membershipType are required" };
  }

  await repository.removeTeamMembership(adminCheck.orgId, teamId, userId, membershipType);

  return {
    ok: true,
    data: await repository.findTeamAccessSnapshot(adminCheck.orgId),
  };
}

export async function setManagerPermissionPreset(
  repository: TeamAccessRepository,
  authUserId: string,
  input: { teamId?: unknown; managerId?: unknown; preset?: unknown },
): Promise<ServiceResult<{ grants: TeamPermissionKey[] }>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const teamId = normalizeString(input.teamId);
  const managerId = normalizeString(input.managerId);
  if (!teamId || !managerId || !isPreset(input.preset)) {
    return { ok: false, status: 400, error: "teamId, managerId, and preset are required" };
  }

  const managerRole = await findValidatedRole(repository, adminCheck.orgId, managerId);
  if (managerRole !== "manager") {
    return { ok: false, status: 400, error: "managerId must belong to a manager" };
  }

  const grants = await repository.replaceManagerTeamPermissionGrants({
    orgId: adminCheck.orgId,
    teamId,
    managerId,
    permissionKeys: [...PRESET_GRANTS[input.preset]],
    grantedBy: authUserId,
  });

  return { ok: true, data: { grants } };
}

export async function getTeamAccessSnapshot(
  repository: TeamAccessRepository,
  authUserId: string,
): Promise<ServiceResult<TeamAccessSnapshot>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);
  if (!viewer) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const adminCheck = assertAdmin(viewer);
  if (!adminCheck.ok) {
    return adminCheck;
  }

  const snapshot = await repository.findTeamAccessSnapshot(adminCheck.orgId);
  return { ok: true, data: snapshot };
}
