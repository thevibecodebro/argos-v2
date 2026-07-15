import { asc, eq } from "drizzle-orm";
import {
  auditEventsTable,
  getDb,
  organizationIngestionTitleFiltersTable,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { IngestionTitleFiltersRepository } from "./service";

export class DrizzleIngestionTitleFiltersRepository
  implements IngestionTitleFiltersRepository
{
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findCurrentUserByAuthId(authUserId: string) {
    const [record] = await this.db
      .select({
        email: usersTable.email,
        firstName: usersTable.firstName,
        id: usersTable.id,
        lastName: usersTable.lastName,
        org: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          plan: organizationsTable.plan,
          slug: organizationsTable.slug,
        },
        role: usersTable.role,
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
      org: record.org?.id ? record.org : null,
      role: parseAppUserRole(record.role),
    };
  }

  async listTitleFilters(orgId: string) {
    return this.db
      .select({
        kind: organizationIngestionTitleFiltersTable.kind,
        phrase: organizationIngestionTitleFiltersTable.phrase,
      })
      .from(organizationIngestionTitleFiltersTable)
      .where(eq(organizationIngestionTitleFiltersTable.orgId, orgId))
      .orderBy(
        asc(organizationIngestionTitleFiltersTable.kind),
        asc(organizationIngestionTitleFiltersTable.phrase),
      );
  }

  async replaceTitleFilters(
    input: Parameters<IngestionTitleFiltersRepository["replaceTitleFilters"]>[0],
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .select({ id: organizationsTable.id })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, input.orgId))
        .for("update");

      await tx
        .delete(organizationIngestionTitleFiltersTable)
        .where(eq(organizationIngestionTitleFiltersTable.orgId, input.orgId));

      if (input.filters.length > 0) {
        await tx.insert(organizationIngestionTitleFiltersTable).values(
          input.filters.map((filter) => ({
            ...filter,
            createdBy: input.createdBy,
            orgId: input.orgId,
          })),
        );
      }

      const includePhraseCount = input.filters.filter(
        (filter) => filter.kind === "include",
      ).length;
      const excludePhraseCount = input.filters.length - includePhraseCount;

      await tx.insert(auditEventsTable).values({
        actorId: input.createdBy,
        eventType: "ingestion_title_filters_updated",
        metadata: {
          configured: includePhraseCount > 0,
          includePhraseCount,
          excludePhraseCount,
        },
        orgId: input.orgId,
        resourceId: input.orgId,
        resourceType: "organization",
      });
    });
  }
}
