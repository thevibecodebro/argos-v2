import { desc, eq } from "drizzle-orm";
import {
  callsTable,
  getDb,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { ProductRepository } from "./service";

export class DrizzleProductRepository implements ProductRepository {
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

  async findCallsByOrgId(orgId: string, limit: number) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        repName: usersTable.email,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        status: callsTable.status,
      })
      .from(callsTable)
      .innerJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(eq(callsTable.orgId, orgId))
      .orderBy(desc(callsTable.createdAt))
      .limit(limit)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          repName: row.repName,
        })),
      );
  }

  async findCallsByRepId(repId: string, limit: number) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        repName: usersTable.email,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        status: callsTable.status,
      })
      .from(callsTable)
      .innerJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(eq(callsTable.repId, repId))
      .orderBy(desc(callsTable.createdAt))
      .limit(limit)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          repName: row.repName,
        })),
      );
  }

  async findUsersByOrgId(orgId: string) {
    return this.db
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
      .innerJoin(organizationsTable, eq(usersTable.orgId, organizationsTable.id))
      .where(eq(usersTable.orgId, orgId))
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          role: parseAppUserRole(row.role),
        })),
      );
  }
}
