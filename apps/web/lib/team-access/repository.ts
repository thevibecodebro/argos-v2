import { and, asc, eq, notInArray } from "drizzle-orm";
import {
  getDb,
  organizationsTable,
  repManagerAssignmentsTable,
  teamMembershipsTable,
  teamPermissionGrantsTable,
  teamsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { TeamPermissionKey } from "@/lib/access/permissions";
import type {
  TeamAccessGrant,
  TeamAccessManager,
  TeamAccessMembership,
  TeamAccessRep,
  TeamAccessRepository,
  TeamAccessSnapshot,
  TeamAccessTeam,
  TeamAccessViewer,
} from "./service";

function buildFullName(firstName: string | null, lastName: string | null, email: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || email;
}

function mapTeam(row: {
  id: string;
  name: string;
  description: string | null;
  status: string;
}): TeamAccessTeam {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
  };
}

function mapManager(row: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): TeamAccessManager {
  return {
    id: row.id,
    name: buildFullName(row.firstName, row.lastName, row.email),
  };
}

function mapRep(row: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  primaryManagerId: string | null;
}): TeamAccessRep {
  return {
    id: row.id,
    name: buildFullName(row.firstName, row.lastName, row.email),
    primaryManagerId: row.primaryManagerId,
  };
}

function mapMembership(row: {
  teamId: string;
  userId: string;
  membershipType: "rep" | "manager";
}): TeamAccessMembership {
  return {
    teamId: row.teamId,
    userId: row.userId,
    membershipType: row.membershipType,
  };
}

function mapGrant(row: {
  teamId: string;
  userId: string;
  permissionKey: TeamPermissionKey;
}): TeamAccessGrant {
  return {
    teamId: row.teamId,
    userId: row.userId,
    permissionKey: row.permissionKey,
  };
}

export class DrizzleTeamAccessRepository implements TeamAccessRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findCurrentUserByAuthId(authUserId: string) {
    const [record] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        org: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
          plan: organizationsTable.plan,
        },
      })
      .from(usersTable)
      .leftJoin(organizationsTable, eq(usersTable.orgId, organizationsTable.id))
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      email: record.email,
      role: parseAppUserRole(record.role),
      firstName: record.firstName,
      lastName: record.lastName,
      org: record.org,
    } satisfies TeamAccessViewer & {
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }

  async findOrganizationUserRole(orgId: string, userId: string) {
    const [record] = await this.db
      .select({
        role: usersTable.role,
      })
      .from(usersTable)
      .where(and(eq(usersTable.orgId, orgId), eq(usersTable.id, userId)))
      .limit(1);

    return parseAppUserRole(record?.role ?? null);
  }

  async createTeam(input: { orgId: string; name: string; description: string | null }) {
    const [team] = await this.db
      .insert(teamsTable)
      .values({
        orgId: input.orgId,
        name: input.name,
        description: input.description,
      })
      .returning({
        id: teamsTable.id,
        orgId: teamsTable.orgId,
        name: teamsTable.name,
        description: teamsTable.description,
        status: teamsTable.status,
        createdAt: teamsTable.createdAt,
        updatedAt: teamsTable.updatedAt,
      });

    if (!team) {
      throw new Error("Failed to create team");
    }

    return team;
  }

  async updateTeam(
    orgId: string,
    teamId: string,
    patch: { name?: string; description?: string | null; status?: "active" | "archived" },
  ) {
    const [team] = await this.db
      .update(teamsTable)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(and(eq(teamsTable.orgId, orgId), eq(teamsTable.id, teamId)))
      .returning({
        id: teamsTable.id,
        name: teamsTable.name,
        description: teamsTable.description,
        status: teamsTable.status,
      });

    if (!team) {
      throw new Error("Failed to update team");
    }

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      status: team.status,
    };
  }

  async upsertPrimaryManagerAssignment(orgId: string, repId: string, managerId: string) {
    const [assignment] = await this.db
      .insert(repManagerAssignmentsTable)
      .values({
        orgId,
        repId,
        managerId,
      })
      .onConflictDoUpdate({
        target: repManagerAssignmentsTable.repId,
        set: {
          orgId,
          managerId,
        },
      })
      .returning({
        repId: repManagerAssignmentsTable.repId,
        managerId: repManagerAssignmentsTable.managerId,
      });

    if (!assignment) {
      throw new Error("Failed to upsert primary manager assignment");
    }

    return assignment;
  }

  async addTeamMembership(
    orgId: string,
    teamId: string,
    userId: string,
    membershipType: "rep" | "manager",
  ) {
    const [membership] = await this.db
      .insert(teamMembershipsTable)
      .values({
        orgId,
        teamId,
        userId,
        membershipType,
      })
      .onConflictDoUpdate({
        target: [
          teamMembershipsTable.teamId,
          teamMembershipsTable.userId,
          teamMembershipsTable.membershipType,
        ],
        set: {
          orgId,
        },
      })
      .returning({
        id: teamMembershipsTable.id,
      });

    if (!membership) {
      throw new Error("Failed to add team membership");
    }

    return true;
  }

  async removeTeamMembership(
    orgId: string,
    teamId: string,
    userId: string,
    membershipType: "rep" | "manager",
  ) {
    const removed = await this.db
      .delete(teamMembershipsTable)
      .where(
        and(
          eq(teamMembershipsTable.orgId, orgId),
          eq(teamMembershipsTable.teamId, teamId),
          eq(teamMembershipsTable.userId, userId),
          eq(teamMembershipsTable.membershipType, membershipType),
        ),
      )
      .returning({ id: teamMembershipsTable.id });

    return removed.length > 0;
  }

  async replaceManagerTeamPermissionGrants(input: {
    orgId: string;
    teamId: string;
    managerId: string;
    permissionKeys: TeamPermissionKey[];
    grantedBy: string;
  }) {
    const permissionKeys = Array.from(new Set(input.permissionKeys));
    return this.db.transaction(async (tx) => {
      if (!permissionKeys.length) {
        await tx
          .delete(teamPermissionGrantsTable)
          .where(
            and(
              eq(teamPermissionGrantsTable.orgId, input.orgId),
              eq(teamPermissionGrantsTable.teamId, input.teamId),
              eq(teamPermissionGrantsTable.userId, input.managerId),
            ),
          );

        return [];
      }

      await tx
        .insert(teamPermissionGrantsTable)
        .values(
          permissionKeys.map((permissionKey) => ({
            orgId: input.orgId,
            teamId: input.teamId,
            userId: input.managerId,
            permissionKey,
            grantedBy: input.grantedBy,
          })),
        )
        .onConflictDoUpdate({
          target: [
            teamPermissionGrantsTable.teamId,
            teamPermissionGrantsTable.userId,
            teamPermissionGrantsTable.permissionKey,
          ],
          set: {
            grantedBy: input.grantedBy,
          },
        });

      await tx
        .delete(teamPermissionGrantsTable)
        .where(
          and(
            eq(teamPermissionGrantsTable.orgId, input.orgId),
            eq(teamPermissionGrantsTable.teamId, input.teamId),
            eq(teamPermissionGrantsTable.userId, input.managerId),
            notInArray(teamPermissionGrantsTable.permissionKey, permissionKeys),
          ),
        );

      return permissionKeys;
    });
  }

  async findTeamAccessSnapshot(orgId: string): Promise<TeamAccessSnapshot> {
    const [teams, managers, reps, memberships, assignments, grants] = await Promise.all([
      this.db
        .select({
          id: teamsTable.id,
          name: teamsTable.name,
          description: teamsTable.description,
          status: teamsTable.status,
        })
        .from(teamsTable)
        .where(eq(teamsTable.orgId, orgId))
        .orderBy(asc(teamsTable.name)),
      this.db
        .select({
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          email: usersTable.email,
        })
        .from(usersTable)
        .where(and(eq(usersTable.orgId, orgId), eq(usersTable.role, "manager")))
        .orderBy(asc(usersTable.firstName), asc(usersTable.lastName), asc(usersTable.email)),
      this.db
        .select({
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          email: usersTable.email,
        })
        .from(usersTable)
        .where(and(eq(usersTable.orgId, orgId), eq(usersTable.role, "rep")))
        .orderBy(asc(usersTable.firstName), asc(usersTable.lastName), asc(usersTable.email)),
      this.db
        .select({
          teamId: teamMembershipsTable.teamId,
          userId: teamMembershipsTable.userId,
          membershipType: teamMembershipsTable.membershipType,
        })
        .from(teamMembershipsTable)
        .where(eq(teamMembershipsTable.orgId, orgId)),
      this.db
        .select({
          repId: repManagerAssignmentsTable.repId,
          managerId: repManagerAssignmentsTable.managerId,
        })
        .from(repManagerAssignmentsTable)
        .where(eq(repManagerAssignmentsTable.orgId, orgId)),
      this.db
        .select({
          teamId: teamPermissionGrantsTable.teamId,
          userId: teamPermissionGrantsTable.userId,
          permissionKey: teamPermissionGrantsTable.permissionKey,
        })
        .from(teamPermissionGrantsTable)
        .where(eq(teamPermissionGrantsTable.orgId, orgId)),
    ]);

    const primaryManagerByRepId = new Map(assignments.map((row) => [row.repId, row.managerId]));

    return {
      teams: teams.map(mapTeam),
      managers: managers.map(mapManager),
      reps: reps.map((row) =>
        mapRep({
          ...row,
          primaryManagerId: primaryManagerByRepId.get(row.id) ?? null,
        }),
      ),
      memberships: memberships.map(mapMembership),
      grants: grants.map(mapGrant),
    };
  }
}
