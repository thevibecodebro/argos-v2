import { and, count, eq, inArray, sql } from "drizzle-orm";
import {
  getDb,
  ghlUserMappingsTable,
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

  async deleteZoomIntegration(orgId: string, connectedUserId: string) {
    const deleted = await this.db
      .delete(zoomIntegrationsTable)
      .where(
        and(
          eq(zoomIntegrationsTable.orgId, orgId),
          eq(zoomIntegrationsTable.connectedUserId, connectedUserId),
        ),
      )
      .returning({ id: zoomIntegrationsTable.id });

    return deleted.length > 0;
  }

  async acknowledgeGhlRecordingConsent(orgId: string, userId: string) {
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        consentConfirmedAt: new Date(),
        consentConfirmedBy: userId,
        syncEnabled: true,
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
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
    connectedUserId: string;
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
        target: [zoomIntegrationsTable.orgId, zoomIntegrationsTable.connectedUserId],
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

  async findZoomIntegrationForDisconnect(orgId: string, connectedUserId: string) {
    const [integration] = await this.db
      .select({
        accessToken: zoomIntegrationsTable.accessToken,
        refreshToken: zoomIntegrationsTable.refreshToken,
        tokenExpiresAt: zoomIntegrationsTable.tokenExpiresAt,
        webhookId: zoomIntegrationsTable.webhookId,
      })
      .from(zoomIntegrationsTable)
      .where(
        and(
          eq(zoomIntegrationsTable.orgId, orgId),
          eq(zoomIntegrationsTable.connectedUserId, connectedUserId),
        ),
      )
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

  async updateZoomTokens(orgId: string, connectedUserId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
    await this.db
      .update(zoomIntegrationsTable)
      .set({
        accessToken: encryptIntegrationToken(tokens.accessToken),
        refreshToken: encryptIntegrationToken(tokens.refreshToken),
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(zoomIntegrationsTable.orgId, orgId),
          eq(zoomIntegrationsTable.connectedUserId, connectedUserId),
        ),
      );
  }

  async listGhlUserMappings(orgId: string) {
    return this.db
      .select({
        id: ghlUserMappingsTable.id,
        argosUserId: ghlUserMappingsTable.argosUserId,
        ghlUserEmail: ghlUserMappingsTable.ghlUserEmail,
        ghlUserId: ghlUserMappingsTable.ghlUserId,
        ghlUserName: ghlUserMappingsTable.ghlUserName,
        locationId: ghlUserMappingsTable.locationId,
      })
      .from(ghlUserMappingsTable)
      .where(eq(ghlUserMappingsTable.orgId, orgId));
  }

  async requestGhlSync(orgId: string) {
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        lastSyncError: null,
        lastSyncStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
  }

  async setGhlDefaultRep(orgId: string, repId: string | null) {
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        defaultRepId: repId,
        updatedAt: new Date(),
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
  }

  async upsertGhlUserMappings(input: {
    orgId: string;
    locationId: string;
    mappings: Array<{
      argosUserId: string;
      ghlUserEmail?: string | null;
      ghlUserId: string;
      ghlUserName?: string | null;
    }>;
  }) {
    if (!input.mappings.length) {
      return;
    }

    await this.db
      .insert(ghlUserMappingsTable)
      .values(
        input.mappings.map((mapping) => ({
          orgId: input.orgId,
          locationId: input.locationId,
          argosUserId: mapping.argosUserId,
          ghlUserEmail: mapping.ghlUserEmail ?? null,
          ghlUserId: mapping.ghlUserId,
          ghlUserName: mapping.ghlUserName ?? null,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: [
          ghlUserMappingsTable.orgId,
          ghlUserMappingsTable.locationId,
          ghlUserMappingsTable.ghlUserId,
        ],
        set: {
          argosUserId: sql`excluded.argos_user_id`,
          ghlUserEmail: sql`excluded.ghl_user_email`,
          ghlUserName: sql`excluded.ghl_user_name`,
          updatedAt: new Date(),
        },
      });
  }

  async findGhlStatus(orgId: string) {
    const [integration] = await this.db
      .select({
        connectedAt: ghlIntegrationsTable.connectedAt,
        consentConfirmedAt: ghlIntegrationsTable.consentConfirmedAt,
        defaultRepId: ghlIntegrationsTable.defaultRepId,
        lastSyncCompletedAt: ghlIntegrationsTable.lastSyncCompletedAt,
        lastSyncError: ghlIntegrationsTable.lastSyncError,
        lastSyncStartedAt: ghlIntegrationsTable.lastSyncStartedAt,
        locationId: ghlIntegrationsTable.locationId,
        locationName: ghlIntegrationsTable.locationName,
        syncEnabled: ghlIntegrationsTable.syncEnabled,
      })
      .from(ghlIntegrationsTable)
      .where(eq(ghlIntegrationsTable.orgId, orgId))
      .limit(1);

    const [mappingCount] = integration
      ? await this.db
          .select({ count: count() })
          .from(ghlUserMappingsTable)
          .where(eq(ghlUserMappingsTable.orgId, orgId))
      : [{ count: 0 }];

    return {
      connected: !!integration,
      connectedAt: integration?.connectedAt ?? null,
      consentConfirmedAt: integration?.consentConfirmedAt ?? null,
      defaultRepId: integration?.defaultRepId ?? null,
      lastSyncCompletedAt: integration?.lastSyncCompletedAt ?? null,
      lastSyncError: integration?.lastSyncError ?? null,
      lastSyncStartedAt: integration?.lastSyncStartedAt ?? null,
      locationId: integration?.locationId ?? null,
      locationName: integration?.locationName ?? null,
      mappedUsersCount: Number(mappingCount?.count ?? 0),
      syncEnabled: integration?.syncEnabled ?? false,
    };
  }

  async findZoomStatus(orgId: string, connectedUserId: string) {
    const [integration] = await this.db
      .select({
        connectedAt: zoomIntegrationsTable.connectedAt,
        zoomUserId: zoomIntegrationsTable.zoomUserId,
      })
      .from(zoomIntegrationsTable)
      .where(
        and(
          eq(zoomIntegrationsTable.orgId, orgId),
          eq(zoomIntegrationsTable.connectedUserId, connectedUserId),
        ),
      )
      .limit(1);

    return {
      connected: !!integration,
      connectedAt: integration?.connectedAt ?? null,
      zoomUserId: integration?.zoomUserId ?? null,
    };
  }

  async findOrgUserIds(orgId: string, userIds: string[]) {
    if (!userIds.length) {
      return [];
    }

    const rows = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.orgId, orgId), inArray(usersTable.id, userIds)));

    return rows.map((row) => row.id);
  }
}
