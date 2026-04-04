import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import {
  callsTable,
  getDb,
  organizationsTable,
  roleplaySessionsTable,
  trainingProgressTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { DashboardRepository } from "./service";

export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findCurrentUserByAuthId(authUserId: string) {
    const [record] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
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
      ...record,
      role: parseAppUserRole(record.role),
    };
  }

  async findRecentCallsByRepId(repId: string, limit: number) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        status: callsTable.status,
        durationSeconds: callsTable.durationSeconds,
        repFirstName: usersTable.firstName,
        repLastName: usersTable.lastName,
      })
      .from(callsTable)
      .leftJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(eq(callsTable.repId, repId))
      .orderBy(desc(callsTable.createdAt))
      .limit(limit);
  }

  async findScoredCallsByRepIdSince(repId: string, since: Date) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        durationSeconds: callsTable.durationSeconds,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
      })
      .from(callsTable)
      .where(
        and(
          eq(callsTable.repId, repId),
          eq(callsTable.status, "complete"),
          gte(callsTable.createdAt, since),
          isNotNull(callsTable.overallScore),
        ),
      )
      .orderBy(desc(callsTable.createdAt));
  }

  async findCompletedCallsByRepId(repId: string) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        durationSeconds: callsTable.durationSeconds,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
      })
      .from(callsTable)
      .where(and(eq(callsTable.repId, repId), eq(callsTable.status, "complete")))
      .orderBy(callsTable.createdAt);
  }

  async findCompletedCallsByOrgId(orgId: string) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        durationSeconds: callsTable.durationSeconds,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
      })
      .from(callsTable)
      .where(and(eq(callsTable.orgId, orgId), eq(callsTable.status, "complete")))
      .orderBy(callsTable.createdAt);
  }

  async findOrgUsersByOrgId(orgId: string) {
    return this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.orgId, orgId))
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          role: parseAppUserRole(row.role),
        })),
      );
  }

  async findTrainingProgressByOrgId(orgId: string) {
    return this.db
      .select({
        repId: trainingProgressTable.repId,
        status: trainingProgressTable.status,
      })
      .from(trainingProgressTable)
      .innerJoin(usersTable, eq(trainingProgressTable.repId, usersTable.id))
      .where(eq(usersTable.orgId, orgId));
  }

  async findPassedTrainingByRepId(repId: string) {
    return this.db
      .select({
        completedAt: trainingProgressTable.completedAt,
      })
      .from(trainingProgressTable)
      .where(and(eq(trainingProgressTable.repId, repId), eq(trainingProgressTable.status, "passed")))
      .orderBy(trainingProgressTable.completedAt)
      .then((rows) =>
        rows
          .map((row) => row.completedAt)
          .filter((value): value is Date => value instanceof Date),
      );
  }

  async findCompletedRoleplaysByRepId(repId: string) {
    return this.db
      .select({
        createdAt: roleplaySessionsTable.createdAt,
      })
      .from(roleplaySessionsTable)
      .where(and(eq(roleplaySessionsTable.repId, repId), eq(roleplaySessionsTable.status, "complete")))
      .orderBy(roleplaySessionsTable.createdAt)
      .then((rows) =>
        rows
          .map((row) => row.createdAt)
          .filter((value): value is Date => value instanceof Date),
      );
  }

  async findCallCountByOrgIdSince(orgId: string, since: Date) {
    const [row] = await this.db
      .select({ count: count() })
      .from(callsTable)
      .where(and(eq(callsTable.orgId, orgId), gte(callsTable.createdAt, since)));

    return row?.count ?? 0;
  }

  async findCompletedRoleplayCountByOrgId(orgId: string) {
    const [row] = await this.db
      .select({ count: count() })
      .from(roleplaySessionsTable)
      .where(and(eq(roleplaySessionsTable.orgId, orgId), eq(roleplaySessionsTable.status, "complete")));

    return row?.count ?? 0;
  }
}
