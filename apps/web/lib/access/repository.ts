import { and, eq } from "drizzle-orm";
import {
  getDb,
  teamPermissionGrantsTable,
  teamMembershipsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { AccessRepository } from "./repository.types";

export class DrizzleAccessRepository implements AccessRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findActorByAuthUserId(authUserId: string) {
    const [record] = await this.db
      .select({
        id: usersTable.id,
        orgId: usersTable.orgId,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      orgId: record.orgId,
      role: parseAppUserRole(record.role),
    };
  }

  async findMembershipsByOrgId(orgId: string) {
    return this.db
      .select({
        orgId: teamMembershipsTable.orgId,
        teamId: teamMembershipsTable.teamId,
        userId: teamMembershipsTable.userId,
        membershipType: teamMembershipsTable.membershipType,
      })
      .from(teamMembershipsTable)
      .where(eq(teamMembershipsTable.orgId, orgId));
  }

  async findGrantsByUserId(userId: string, orgId: string) {
    return this.db
      .select({
        orgId: teamPermissionGrantsTable.orgId,
        teamId: teamPermissionGrantsTable.teamId,
        userId: teamPermissionGrantsTable.userId,
        permissionKey: teamPermissionGrantsTable.permissionKey,
      })
      .from(teamPermissionGrantsTable)
      .where(and(eq(teamPermissionGrantsTable.userId, userId), eq(teamPermissionGrantsTable.orgId, orgId)));
  }
}
