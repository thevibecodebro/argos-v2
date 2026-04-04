import { eq } from "drizzle-orm";
import {
  getDb,
  ghlIntegrationsTable,
  organizationsTable,
  usersTable,
  zoomIntegrationsTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { IntegrationsRepository } from "./service";

export class DrizzleIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async deleteGhlIntegration(orgId: string) {
    const deleted = await this.db
      .delete(ghlIntegrationsTable)
      .where(eq(ghlIntegrationsTable.orgId, orgId))
      .returning({ id: ghlIntegrationsTable.id });

    return deleted.length > 0;
  }

  async deleteZoomIntegration(orgId: string) {
    const deleted = await this.db
      .delete(zoomIntegrationsTable)
      .where(eq(zoomIntegrationsTable.orgId, orgId))
      .returning({ id: zoomIntegrationsTable.id });

    return deleted.length > 0;
  }

  async upsertGhlIntegration(input: {
    accessToken: string;
    locationId: string;
    locationName: string | null;
    orgId: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }) {
    await this.db
      .insert(ghlIntegrationsTable)
      .values({
        ...input,
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ghlIntegrationsTable.orgId,
        set: {
          accessToken: input.accessToken,
          locationId: input.locationId,
          locationName: input.locationName,
          refreshToken: input.refreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          updatedAt: new Date(),
        },
      });
  }

  async upsertZoomIntegration(input: {
    accessToken: string;
    orgId: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    webhookToken?: string | null;
    zoomAccountId: string | null;
    zoomUserId: string | null;
  }) {
    await this.db
      .insert(zoomIntegrationsTable)
      .values({
        ...input,
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: zoomIntegrationsTable.orgId,
        set: {
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          webhookToken: input.webhookToken ?? null,
          zoomAccountId: input.zoomAccountId,
          zoomUserId: input.zoomUserId,
          updatedAt: new Date(),
        },
      });
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
    };
  }

  async findGhlStatus(orgId: string) {
    const [integration] = await this.db
      .select({
        connectedAt: ghlIntegrationsTable.connectedAt,
        locationId: ghlIntegrationsTable.locationId,
        locationName: ghlIntegrationsTable.locationName,
      })
      .from(ghlIntegrationsTable)
      .where(eq(ghlIntegrationsTable.orgId, orgId))
      .limit(1);

    return {
      connected: !!integration,
      connectedAt: integration?.connectedAt ?? null,
      locationId: integration?.locationId ?? null,
      locationName: integration?.locationName ?? null,
    };
  }

  async findZoomStatus(orgId: string) {
    const [integration] = await this.db
      .select({
        connectedAt: zoomIntegrationsTable.connectedAt,
        zoomUserId: zoomIntegrationsTable.zoomUserId,
      })
      .from(zoomIntegrationsTable)
      .where(eq(zoomIntegrationsTable.orgId, orgId))
      .limit(1);

    return {
      connected: !!integration,
      connectedAt: integration?.connectedAt ?? null,
      zoomUserId: integration?.zoomUserId ?? null,
    };
  }
}
