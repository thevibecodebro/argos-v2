import { and, count, eq, or } from "drizzle-orm";
import {
  auditEventsTable,
  callsTable,
  ghlUserMappingsTable,
  getDb,
  invitesTable,
  organizationsTable,
  repManagerAssignmentsTable,
  teamMembershipsTable,
  teamPermissionGrantsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import {
  coerceStoredWorkspaceTheme,
  type WorkspaceTheme,
} from "@/lib/organizations/workspace-theme";
import { parseAppUserRole, type AppUserRole } from "./roles";
import type { UsersRepository } from "./service";

export class DrizzleUsersRepository implements UsersRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findCurrentUserByAuthId(authUserId: string) {
    const [record] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        role: usersTable.role,
        orgId: usersTable.orgId,
        displayNameSet: usersTable.displayNameSet,
        org: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
          plan: organizationsTable.plan,
          logoUrl: organizationsTable.logoUrl,
          workspaceTheme: organizationsTable.workspaceTheme,
          createdAt: organizationsTable.createdAt,
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
      firstName: record.firstName,
      lastName: record.lastName,
      profileImageUrl: record.profileImageUrl,
      role: parseAppUserRole(record.role),
      orgId: record.orgId,
      displayNameSet: record.displayNameSet,
      org: record.org?.id
        ? {
            id: record.org.id,
            name: record.org.name,
            slug: record.org.slug,
            plan: record.org.plan,
            logoUrl: record.org.logoUrl,
            workspaceTheme: coerceStoredWorkspaceTheme(record.org.workspaceTheme),
            createdAt: record.org.createdAt,
          }
        : null,
    };
  }

  async findOrganizationMember(userId: string, orgId: string) {
    const [member] = await this.db
      .select({
        id: usersTable.id,
        orgId: usersTable.orgId,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, orgId)))
      .limit(1);

    if (!member) {
      return null;
    }

    return {
      id: member.id,
      orgId: member.orgId,
      role: parseAppUserRole(member.role),
    };
  }

  async findOrganizationMembers(orgId: string) {
    const [members, callCounts] = await Promise.all([
      this.db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          profileImageUrl: usersTable.profileImageUrl,
          role: usersTable.role,
          joinedAt: usersTable.createdAt,
          primaryManagerId: repManagerAssignmentsTable.managerId,
        })
        .from(usersTable)
        .leftJoin(
          repManagerAssignmentsTable,
          and(
            eq(repManagerAssignmentsTable.repId, usersTable.id),
            eq(repManagerAssignmentsTable.orgId, usersTable.orgId),
          ),
        )
        .where(eq(usersTable.orgId, orgId)),
      this.db
        .select({
          repId: callsTable.repId,
          callCount: count(callsTable.id),
        })
        .from(callsTable)
        .where(eq(callsTable.orgId, orgId))
        .groupBy(callsTable.repId),
    ]);

    const callCountMap = new Map(
      callCounts.map((entry) => [entry.repId, Number(entry.callCount)]),
    );

    return members.map((member) => ({
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      profileImageUrl: member.profileImageUrl,
      role: parseAppUserRole(member.role),
      callCount: callCountMap.get(member.id) ?? 0,
      joinedAt: member.joinedAt,
      primaryManagerId: member.primaryManagerId,
    }));
  }

  async removeOrganizationMember(userId: string, orgId: string) {
    const removed = await this.db
      .update(usersTable)
      .set({
        orgId: null,
        role: null,
        updatedAt: new Date(),
      })
      .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, orgId)))
      .returning({ id: usersTable.id });

    return removed.length > 0;
  }

  async deprovisionOrganizationMember(input: {
    actorId: string;
    orgId: string;
    reason: string;
    targetUserId: string;
    ticketId: string | null;
  }) {
    return this.db.transaction(async (tx) => {
      const [member] = await tx
        .select({
          id: usersTable.id,
          email: usersTable.email,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.targetUserId),
            eq(usersTable.orgId, input.orgId),
          ),
        )
        .limit(1);

      if (!member) {
        return false;
      }

      await tx
        .delete(teamPermissionGrantsTable)
        .where(
          and(
            eq(teamPermissionGrantsTable.orgId, input.orgId),
            or(
              eq(teamPermissionGrantsTable.userId, input.targetUserId),
              eq(teamPermissionGrantsTable.grantedBy, input.targetUserId),
            ),
          ),
        );

      await tx
        .delete(repManagerAssignmentsTable)
        .where(
          and(
            eq(repManagerAssignmentsTable.orgId, input.orgId),
            or(
              eq(repManagerAssignmentsTable.repId, input.targetUserId),
              eq(repManagerAssignmentsTable.managerId, input.targetUserId),
            ),
          ),
        );

      await tx
        .delete(teamMembershipsTable)
        .where(
          and(
            eq(teamMembershipsTable.orgId, input.orgId),
            eq(teamMembershipsTable.userId, input.targetUserId),
          ),
        );

      await tx
        .delete(ghlUserMappingsTable)
        .where(
          and(
            eq(ghlUserMappingsTable.orgId, input.orgId),
            eq(ghlUserMappingsTable.argosUserId, input.targetUserId),
          ),
        );

      await tx
        .delete(invitesTable)
        .where(
          and(eq(invitesTable.orgId, input.orgId), eq(invitesTable.email, member.email)),
        );

      const detachedUsers = await tx
        .update(usersTable)
        .set({
          orgId: null,
          role: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(usersTable.id, input.targetUserId),
            eq(usersTable.orgId, input.orgId),
          ),
        )
        .returning({ id: usersTable.id });

      if (detachedUsers.length === 0) {
        return false;
      }

      await tx.insert(auditEventsTable).values({
        orgId: input.orgId,
        actorId: input.actorId,
        eventType: "member_removed",
        resourceType: "user",
        resourceId: input.targetUserId,
        metadata: {
          reason: input.reason,
          ticketId: input.ticketId,
          removedUserEmail: member.email,
          removedUserRole: member.role,
        },
      });

      return true;
    });
  }

  async updateCurrentUserProfile(
    userId: string,
    patch: {
      displayNameSet: boolean;
      firstName: string | null;
      lastName: string | null;
    },
  ) {
    const [updated] = await this.db
      .update(usersTable)
      .set({
        firstName: patch.firstName,
        lastName: patch.lastName,
        displayNameSet: patch.displayNameSet,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id });

    if (!updated) {
      return null;
    }

    return this.findCurrentUserByAuthId(updated.id);
  }

  async updateOrganizationLogo(orgId: string, logoUrl: string | null) {
    const [updated] = await this.db
      .update(organizationsTable)
      .set({
        logoUrl,
      })
      .where(eq(organizationsTable.id, orgId))
      .returning({
        id: organizationsTable.id,
        name: organizationsTable.name,
        slug: organizationsTable.slug,
        plan: organizationsTable.plan,
        logoUrl: organizationsTable.logoUrl,
        workspaceTheme: organizationsTable.workspaceTheme,
        createdAt: organizationsTable.createdAt,
      });

    return updated
      ? {
          ...updated,
          workspaceTheme: coerceStoredWorkspaceTheme(updated.workspaceTheme),
        }
      : null;
  }

  async updateOrganizationWorkspaceTheme(
    orgId: string,
    workspaceTheme: WorkspaceTheme | null,
  ) {
    const [updated] = await this.db
      .update(organizationsTable)
      .set({
        workspaceTheme,
      })
      .where(eq(organizationsTable.id, orgId))
      .returning({
        id: organizationsTable.id,
        name: organizationsTable.name,
        slug: organizationsTable.slug,
        plan: organizationsTable.plan,
        logoUrl: organizationsTable.logoUrl,
        workspaceTheme: organizationsTable.workspaceTheme,
        createdAt: organizationsTable.createdAt,
      });

    return updated
      ? {
          ...updated,
          workspaceTheme: coerceStoredWorkspaceTheme(updated.workspaceTheme),
        }
      : null;
  }

  async updateOrganizationMemberRole(
    userId: string,
    orgId: string,
    role: AppUserRole,
  ) {
    const [updated] = await this.db
      .update(usersTable)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, orgId)))
      .returning({
        id: usersTable.id,
        role: usersTable.role,
      });

    if (!updated) {
      return null;
    }

    return {
      id: updated.id,
      role: parseAppUserRole(updated.role) ?? role,
    };
  }
}
