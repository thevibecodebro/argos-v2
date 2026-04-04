import { desc, eq } from "drizzle-orm";
import {
  getDb,
  orgComplianceTable,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { ComplianceRepository } from "./service";

export class DrizzleComplianceRepository implements ComplianceRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async createConsentRecord(input: {
    acknowledgedBy: string;
    eventType: string;
    ipAddress: string;
    metadata?: Record<string, unknown> | null;
    orgId: string;
    tosVersion: string;
    userAgent: string;
  }) {
    const [record] = await this.db
      .insert(orgComplianceTable)
      .values(input)
      .returning({
        acknowledgedAt: orgComplianceTable.acknowledgedAt,
      });

    return record;
  }

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
      org: record.org?.id
        ? {
            id: record.org.id,
            name: record.org.name,
            slug: record.org.slug,
            plan: record.org.plan,
          }
        : null,
    };
  }

  async findLatestConsentByOrgId(orgId: string) {
    const [record] = await this.db
      .select({
        acknowledgedAt: orgComplianceTable.acknowledgedAt,
      })
      .from(orgComplianceTable)
      .where(eq(orgComplianceTable.orgId, orgId))
      .orderBy(desc(orgComplianceTable.acknowledgedAt))
      .limit(1);

    return record ?? null;
  }
}
