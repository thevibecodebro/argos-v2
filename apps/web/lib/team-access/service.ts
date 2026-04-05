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

export type TeamAccessSnapshot = {
  teams: TeamAccessTeam[];
  managers: TeamAccessManager[];
  reps: TeamAccessRep[];
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export type TeamAccessRepository = {
  findCurrentUserByAuthId(authUserId: string): Promise<TeamAccessViewer | null>;
  createTeam(input: { orgId: string; name: string; description: string | null }): Promise<unknown>;
  upsertPrimaryManagerAssignment(
    orgId: string,
    repId: string,
    managerId: string,
  ): Promise<unknown>;
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

function isPreset(value: unknown): value is ManagerPermissionPreset {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PRESET_GRANTS, value);
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

  const assignment = await repository.upsertPrimaryManagerAssignment(adminCheck.orgId, repId, managerId);
  return { ok: true, data: assignment };
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
