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
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
  encryptNullableIntegrationToken,
} from "./token-encryption";

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
    const encryptedAccessToken = encryptIntegrationToken(input.accessToken);
    const encryptedRefreshToken = encryptIntegrationToken(input.refreshToken);

    await this.db
      .insert(ghlIntegrationsTable)
      .values({
        ...input,
        accessToken: encryptedAccessToken,
        connectedAt: new Date(),
        refreshToken: encryptedRefreshToken,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ghlIntegrationsTable.orgId,
        set: {
          accessToken: encryptedAccessToken,
          locationId: input.locationId,
          locationName: input.locationName,
          refreshToken: encryptedRefreshToken,
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
    webhookId?: string | null;
    webhookToken?: string | null;
    zoomAccountId: string | null;
    zoomUserId: string | null;
  }) {
    const encryptedAccessToken = encryptIntegrationToken(input.accessToken);
    const encryptedRefreshToken = encryptIntegrationToken(input.refreshToken);
    const encryptedWebhookToken = encryptNullableIntegrationToken(input.webhookToken);

    await this.db
      .insert(zoomIntegrationsTable)
      .values({
        ...input,
        accessToken: encryptedAccessToken,
        connectedAt: new Date(),
        refreshToken: encryptedRefreshToken,
        updatedAt: new Date(),
        webhookToken: encryptedWebhookToken,
      })
      .onConflictDoUpdate({
        target: zoomIntegrationsTable.orgId,
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          webhookId: input.webhookId ?? null,
          webhookToken: encryptedWebhookToken,
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

  async findZoomIntegrationForDisconnect(orgId: string) {
    const [integration] = await this.db
      .select({
        accessToken: zoomIntegrationsTable.accessToken,
        refreshToken: zoomIntegrationsTable.refreshToken,
        tokenExpiresAt: zoomIntegrationsTable.tokenExpiresAt,
        webhookId: zoomIntegrationsTable.webhookId,
      })
      .from(zoomIntegrationsTable)
      .where(eq(zoomIntegrationsTable.orgId, orgId))
      .limit(1);

    if (!integration) {
      return null;
    }

    return {
      ...integration,
      accessToken: decryptIntegrationToken(integration.accessToken),
      refreshToken: decryptIntegrationToken(integration.refreshToken),
    };
  }

  async updateZoomTokens(orgId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
    await this.db
      .update(zoomIntegrationsTable)
      .set({
        accessToken: encryptIntegrationToken(tokens.accessToken),
        refreshToken: encryptIntegrationToken(tokens.refreshToken),
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(zoomIntegrationsTable.orgId, orgId));
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
