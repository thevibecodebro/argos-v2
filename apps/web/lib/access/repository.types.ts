import type {
  AccessActor,
  TeamMembershipRecord,
  TeamPermissionGrantRecord,
} from "./permissions";

export interface AccessRepository {
  findActorByAuthUserId(authUserId: string): Promise<AccessActor | null>;
  findMembershipsByOrgId(orgId: string): Promise<TeamMembershipRecord[]>;
  findGrantsByUserId(userId: string, orgId: string): Promise<TeamPermissionGrantRecord[]>;
}
