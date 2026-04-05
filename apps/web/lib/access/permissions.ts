export const TEAM_PERMISSION_KEYS = [
  "view_team_calls",
  "coach_team_calls",
  "manage_call_highlights",
  "view_team_training",
  "manage_team_training",
  "manage_team_roster",
  "view_team_analytics",
] as const;

export type TeamPermissionKey = (typeof TEAM_PERMISSION_KEYS)[number];

export type TeamMembershipType = "rep" | "manager";

export type AccessActorRole = "admin" | "executive" | "manager" | "rep";

export const EXECUTIVE_READ_PERMISSION_KEYS = [
  "view_team_calls",
  "view_team_training",
  "view_team_analytics",
] as const;

export type ExecutiveReadPermissionKey = (typeof EXECUTIVE_READ_PERMISSION_KEYS)[number];

export type AccessActor = {
  id: string;
  orgId: string | null;
  role: AccessActorRole | null;
};

export type TeamMembershipRecord = {
  orgId: string;
  teamId: string;
  userId: string;
  membershipType: TeamMembershipType;
};

export type TeamPermissionGrantRecord = {
  orgId: string;
  teamId: string;
  userId: string;
  permissionKey: TeamPermissionKey;
};
