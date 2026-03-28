import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { callsTable, getDb, organizationsTable, usersTable, type ArgosDb } from "@argos-v2/db";
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

    return record ?? null;
  }

  async findRecentCallsByRepId(repId: string, limit: number) {
    return this.db
      .select({
        id: callsTable.id,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        status: callsTable.status,
      })
      .from(callsTable)
      .where(eq(callsTable.repId, repId))
      .orderBy(desc(callsTable.createdAt))
      .limit(limit);
  }

  async findScoredCallsByRepIdSince(repId: string, since: Date) {
    return this.db
      .select({
        id: callsTable.id,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        status: callsTable.status,
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
}
