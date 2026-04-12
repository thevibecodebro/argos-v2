import type { AppUserRole } from "@/lib/users/roles";

export type InviteRecord = {
  id: string;
  orgId: string;
  email: string;
  role: AppUserRole;
  token: string;
  teamIds: string[] | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

export type TeamRecord = {
  id: string;
  name: string;
};

export interface InvitesRepository {
  createInvite(input: {
    orgId: string;
    email: string;
    role: AppUserRole;
    token: string;
    teamIds: string[] | null;
    expiresAt: Date;
  }): Promise<InviteRecord>;

  findInviteByToken(token: string): Promise<InviteRecord | null>;

  findPendingInviteByOrgAndEmail(
    orgId: string,
    email: string,
  ): Promise<InviteRecord | null>;

  findPendingInvitesByOrg(orgId: string): Promise<InviteRecord[]>;

  markInviteAccepted(id: string): Promise<void>;

  deleteInviteByToken(token: string, orgId: string): Promise<void>;

  findTeamsByIds(teamIds: string[], orgId: string): Promise<TeamRecord[]>;

  listActiveTeamsByOrg(orgId: string): Promise<TeamRecord[]>;

  createTeamMemberships(input: {
    orgId: string;
    userId: string;
    teamIds: string[];
    membershipType: "rep" | "manager";
  }): Promise<void>;
}
