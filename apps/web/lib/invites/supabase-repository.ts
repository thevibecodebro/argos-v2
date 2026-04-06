import { and, eq, gt, isNull, inArray } from "drizzle-orm";
import {
  getDb,
  invitesTable,
  teamsTable,
  teamMembershipsTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { InvitesRepository, InviteRecord, TeamRecord } from "./repository";

function mapInvite(row: typeof invitesTable.$inferSelect): InviteRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    email: row.email,
    role: parseAppUserRole(row.role)!,
    token: row.token,
    teamIds: row.teamIds ?? null,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt ?? null,
    createdAt: row.createdAt,
  };
}

export class DrizzleInvitesRepository implements InvitesRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async createInvite(input: {
    orgId: string;
    email: string;
    role: string;
    token: string;
    teamIds: string[] | null;
    expiresAt: Date;
  }): Promise<InviteRecord> {
    const [row] = await this.db
      .insert(invitesTable)
      .values({
        orgId: input.orgId,
        email: input.email,
        role: input.role as "rep" | "manager" | "executive" | "admin",
        token: input.token,
        teamIds: input.teamIds ?? undefined,
        expiresAt: input.expiresAt,
      })
      .returning();
    return mapInvite(row);
  }

  async findInviteByToken(token: string): Promise<InviteRecord | null> {
    const [row] = await this.db
      .select()
      .from(invitesTable)
      .where(eq(invitesTable.token, token))
      .limit(1);
    return row ? mapInvite(row) : null;
  }

  async findPendingInviteByOrgAndEmail(
    orgId: string,
    email: string,
  ): Promise<InviteRecord | null> {
    const now = new Date();
    const [row] = await this.db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.orgId, orgId),
          eq(invitesTable.email, email),
          isNull(invitesTable.acceptedAt),
          gt(invitesTable.expiresAt, now),
        ),
      )
      .limit(1);
    return row ? mapInvite(row) : null;
  }

  async findPendingInvitesByOrg(orgId: string): Promise<InviteRecord[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.orgId, orgId),
          isNull(invitesTable.acceptedAt),
          gt(invitesTable.expiresAt, now),
        ),
      );
    return rows.map(mapInvite);
  }

  async markInviteAccepted(id: string): Promise<void> {
    await this.db
      .update(invitesTable)
      .set({ acceptedAt: new Date() })
      .where(eq(invitesTable.id, id));
  }

  async findTeamsByIds(teamIds: string[], orgId: string): Promise<TeamRecord[]> {
    if (teamIds.length === 0) return [];
    const rows = await this.db
      .select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(
        and(
          inArray(teamsTable.id, teamIds),
          eq(teamsTable.orgId, orgId),
          eq(teamsTable.status, "active"),
        ),
      );
    return rows;
  }

  async listActiveTeamsByOrg(orgId: string): Promise<TeamRecord[]> {
    return this.db
      .select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(
        and(eq(teamsTable.orgId, orgId), eq(teamsTable.status, "active")),
      );
  }

  async createTeamMemberships(input: {
    orgId: string;
    userId: string;
    teamIds: string[];
    membershipType: "rep" | "manager";
  }): Promise<void> {
    if (input.teamIds.length === 0) return;
    await this.db.insert(teamMembershipsTable).values(
      input.teamIds.map((teamId) => ({
        orgId: input.orgId,
        teamId,
        userId: input.userId,
        membershipType: input.membershipType,
      })),
    );
  }
}
