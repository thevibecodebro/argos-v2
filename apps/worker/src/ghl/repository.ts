import { and, eq, sql } from "drizzle-orm";
import {
  callProcessingJobsTable,
  callsTable,
  findActiveCallProcessingSubscription,
  getDb,
  ghlCallImportsTable,
  ghlIntegrationsTable,
  ghlUserMappingsTable,
  organizationsTable,
  rubricsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type { GhlCallImportRecord, GhlCallImportRepository, GhlSkippedReason } from "./process-ghl-call-import";
import { decryptIntegrationToken, encryptIntegrationToken } from "./token-encryption";

type ClaimedImportRow = typeof ghlCallImportsTable.$inferSelect;

function toDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function mapImport(row: ClaimedImportRow): GhlCallImportRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    locationId: row.locationId,
    messageId: row.messageId,
    conversationId: row.conversationId,
    contactId: row.contactId,
    ghlUserId: row.ghlUserId,
    callId: row.callId,
    status: row.status,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
  };
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    return ((result as { rows?: T[] }).rows ?? []) as T[];
  }

  return [];
}

export class GhlImportRepository implements GhlCallImportRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async claimNextGhlCallImport(now = new Date()) {
    const leaseExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const rows = extractRows<ClaimedImportRow>(
      await this.db.execute(sql`
        update ghl_call_imports
        set
          status = 'running',
          attempt_count = attempt_count + 1,
          locked_at = ${now},
          lock_expires_at = ${leaseExpiresAt},
          updated_at = ${now}
        where id = (
          select id
          from ghl_call_imports
          where attempt_count < max_attempts
            and (
              (
                status in ('pending', 'retrying')
                and next_run_at <= ${now}
                and (lock_expires_at is null or lock_expires_at <= ${now})
              )
              or (
                status = 'running'
                and lock_expires_at <= ${now}
              )
            )
          order by next_run_at asc, created_at asc
          limit 1
          for update skip locked
        )
        returning
          id,
          org_id as "orgId",
          location_id as "locationId",
          message_id as "messageId",
          conversation_id as "conversationId",
          contact_id as "contactId",
          ghl_user_id as "ghlUserId",
          call_id as "callId",
          status,
          skipped_reason as "skippedReason",
          message_created_at as "messageCreatedAt",
          attempt_count as "attemptCount",
          max_attempts as "maxAttempts",
          next_run_at as "nextRunAt",
          locked_at as "lockedAt",
          lock_expires_at as "lockExpiresAt",
          last_error as "lastError",
          created_at as "createdAt",
          updated_at as "updatedAt";
      `),
    );

    const row = rows[0];
    return row ? mapImport(row) : null;
  }

  async findGhlIntegrationForImport(input: { orgId: string; locationId: string }) {
    const [integration] = await this.db
      .select({
        orgId: ghlIntegrationsTable.orgId,
        locationId: ghlIntegrationsTable.locationId,
        accessToken: ghlIntegrationsTable.accessToken,
        refreshToken: ghlIntegrationsTable.refreshToken,
        tokenExpiresAt: ghlIntegrationsTable.tokenExpiresAt,
        syncEnabled: ghlIntegrationsTable.syncEnabled,
        consentConfirmedAt: ghlIntegrationsTable.consentConfirmedAt,
        defaultRepId: ghlIntegrationsTable.defaultRepId,
      })
      .from(ghlIntegrationsTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, ghlIntegrationsTable.orgId))
      .where(
        and(
          eq(ghlIntegrationsTable.orgId, input.orgId),
          eq(ghlIntegrationsTable.locationId, input.locationId),
          eq(organizationsTable.status, "active"),
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
      tokenExpiresAt: toDate(integration.tokenExpiresAt) ?? new Date(0),
      consentConfirmedAt: toDate(integration.consentConfirmedAt),
    };
  }

  async findArgosUserIdForGhlUser(input: {
    orgId: string;
    locationId: string;
    ghlUserId: string | null;
  }) {
    if (!input.ghlUserId) {
      return null;
    }

    const [mapping] = await this.db
      .select({ argosUserId: ghlUserMappingsTable.argosUserId })
      .from(ghlUserMappingsTable)
      .where(
        and(
          eq(ghlUserMappingsTable.orgId, input.orgId),
          eq(ghlUserMappingsTable.locationId, input.locationId),
          eq(ghlUserMappingsTable.ghlUserId, input.ghlUserId),
        ),
      )
      .limit(1);

    return mapping?.argosUserId ?? null;
  }

  async findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }) {
    return findActiveCallProcessingSubscription(this.db, input);
  }

  async createCallForGhlImport(input: {
    importId: string;
    orgId: string;
    repId: string;
    rubricId: string | null;
    callTopic: string | null;
    consentConfirmed: boolean;
    messageId: string;
    conversationId: string | null;
    contactId: string | null;
    ghlUserId: string | null;
    messageCreatedAt: Date | null;
  }) {
    return this.db.transaction(async (tx) => {
      const [existingImport] = await tx
        .select({ callId: ghlCallImportsTable.callId })
        .from(ghlCallImportsTable)
        .where(eq(ghlCallImportsTable.id, input.importId))
        .limit(1);

      if (existingImport?.callId) {
        return { id: existingImport.callId };
      }

      const [call] = await tx
        .insert(callsTable)
        .values({
          orgId: input.orgId,
          repId: input.repId,
          rubricId: input.rubricId,
          callTopic: input.callTopic,
          consentConfirmed: input.consentConfirmed,
          status: "uploaded",
        })
        .returning({ id: callsTable.id });

      await tx
        .update(ghlCallImportsTable)
        .set({
          callId: call.id,
          conversationId: input.conversationId,
          contactId: input.contactId,
          ghlUserId: input.ghlUserId,
          messageCreatedAt: input.messageCreatedAt,
          updatedAt: new Date(),
        })
        .where(eq(ghlCallImportsTable.id, input.importId));

      return call;
    });
  }

  async updateCallRecordingStorage(callId: string, recording: {
    storageBucket: string;
    storagePath: string;
    contentType: string | null;
    fileSizeBytes: number | null;
  }) {
    await this.db
      .update(callsTable)
      .set({
        recordingUrl: null,
        recordingStorageBucket: recording.storageBucket,
        recordingStoragePath: recording.storagePath,
        recordingContentType: recording.contentType,
        recordingFileSizeBytes: recording.fileSizeBytes,
      })
      .where(eq(callsTable.id, callId));
  }

  async createOrResetCallProcessingJob(input: {
    callId: string;
    rubricId?: string | null;
    sourceOrigin: "ghl_recording";
    sourceStoragePath: string;
    sourceFileName: string;
    sourceContentType: string | null;
    sourceSizeBytes: number | null;
  }) {
    await this.db
      .insert(callProcessingJobsTable)
      .values({
        callId: input.callId,
        rubricId: input.rubricId ?? null,
        sourceOrigin: input.sourceOrigin,
        sourceStoragePath: input.sourceStoragePath,
        sourceFileName: input.sourceFileName,
        sourceContentType: input.sourceContentType,
        sourceSizeBytes: input.sourceSizeBytes,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: callProcessingJobsTable.callId,
        set: {
          rubricId: input.rubricId ?? null,
          sourceOrigin: input.sourceOrigin,
          sourceStoragePath: input.sourceStoragePath,
          sourceFileName: input.sourceFileName,
          sourceContentType: input.sourceContentType,
          sourceSizeBytes: input.sourceSizeBytes,
          status: "pending",
          attemptCount: 0,
          nextRunAt: new Date(),
          lockedAt: null,
          lockExpiresAt: null,
          lastStage: null,
          lastError: null,
          updatedAt: new Date(),
        },
      });
  }

  async markGhlCallImportImported(importId: string, input: { callId: string }) {
    await this.db
      .update(ghlCallImportsTable)
      .set({
        callId: input.callId,
        status: "imported",
        lockedAt: null,
        lockExpiresAt: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(ghlCallImportsTable.id, importId));
  }

  async markGhlCallImportSkipped(importId: string, input: { reason: GhlSkippedReason }) {
    await this.db
      .update(ghlCallImportsTable)
      .set({
        status: "skipped",
        skippedReason: input.reason,
        lockedAt: null,
        lockExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(ghlCallImportsTable.id, importId));
  }

  async markGhlCallImportFailed(importId: string, input: { error: string }) {
    await this.db
      .update(ghlCallImportsTable)
      .set({
        status: "failed",
        lockedAt: null,
        lockExpiresAt: null,
        lastError: input.error,
        updatedAt: new Date(),
      })
      .where(eq(ghlCallImportsTable.id, importId));
  }

  async markGhlCallImportRetryable(importRecord: GhlCallImportRecord, error: string) {
    const now = new Date();
    const retryMinutes = importRecord.attemptCount === 1 ? 2 : importRecord.attemptCount === 2 ? 10 : 30;

    await this.db
      .update(ghlCallImportsTable)
      .set({
        status: "retrying",
        nextRunAt: new Date(now.getTime() + retryMinutes * 60 * 1000),
        lockedAt: null,
        lockExpiresAt: null,
        lastError: error,
        updatedAt: now,
      })
      .where(eq(ghlCallImportsTable.id, importRecord.id));
  }

  async updateGhlTokens(orgId: string, tokens: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }) {
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        accessToken: encryptIntegrationToken(tokens.accessToken),
        refreshToken: encryptIntegrationToken(tokens.refreshToken),
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
  }

  async findActiveRubricIdByOrgId(orgId: string) {
    const [rubric] = await this.db
      .select({ id: rubricsTable.id })
      .from(rubricsTable)
      .where(and(eq(rubricsTable.orgId, orgId), eq(rubricsTable.isActive, true)))
      .limit(1);

    return rubric?.id ?? null;
  }

  async listDueGhlSyncIntegrations(input: {
    now: Date;
    minIntervalMs: number;
    limit: number;
  }) {
    const rows = await this.db
      .select({
        orgId: ghlIntegrationsTable.orgId,
        locationId: ghlIntegrationsTable.locationId,
        accessToken: ghlIntegrationsTable.accessToken,
        refreshToken: ghlIntegrationsTable.refreshToken,
        tokenExpiresAt: ghlIntegrationsTable.tokenExpiresAt,
        lastSyncCompletedAt: ghlIntegrationsTable.lastSyncCompletedAt,
        lastSyncCursor: ghlIntegrationsTable.lastSyncCursor,
      })
      .from(ghlIntegrationsTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, ghlIntegrationsTable.orgId))
      .where(
        and(
          eq(ghlIntegrationsTable.syncEnabled, true),
          eq(organizationsTable.status, "active"),
          sql`${ghlIntegrationsTable.consentConfirmedAt} is not null`,
        ),
      )
      .limit(input.limit);

    return rows
      .filter((row) => {
        const completedAt = toDate(row.lastSyncCompletedAt);
        return !completedAt || input.now.getTime() - completedAt.getTime() >= input.minIntervalMs;
      })
      .map((row) => ({
        ...row,
        accessToken: decryptIntegrationToken(row.accessToken),
        refreshToken: decryptIntegrationToken(row.refreshToken),
        tokenExpiresAt: toDate(row.tokenExpiresAt) ?? new Date(0),
        lastSyncCompletedAt: toDate(row.lastSyncCompletedAt),
      }));
  }

  async markGhlSyncStarted(orgId: string, now = new Date()) {
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        lastSyncStartedAt: now,
        lastSyncError: null,
        updatedAt: now,
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
  }

  async markGhlSyncCompleted(orgId: string, input: { cursor: string | null; completedAt?: Date }) {
    const completedAt = input.completedAt ?? new Date();
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        lastSyncCompletedAt: completedAt,
        lastSyncCursor: input.cursor,
        lastSyncError: null,
        updatedAt: completedAt,
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
  }

  async markGhlSyncFailed(orgId: string, error: string) {
    await this.db
      .update(ghlIntegrationsTable)
      .set({
        lastSyncError: error,
        updatedAt: new Date(),
      })
      .where(eq(ghlIntegrationsTable.orgId, orgId));
  }

  async upsertGhlCallImport(input: {
    orgId: string;
    locationId: string;
    messageId: string;
    conversationId: string | null;
    contactId: string | null;
    ghlUserId: string | null;
    messageCreatedAt: Date | null;
  }) {
    await this.db
      .insert(ghlCallImportsTable)
      .values({
        orgId: input.orgId,
        locationId: input.locationId,
        messageId: input.messageId,
        conversationId: input.conversationId,
        contactId: input.contactId,
        ghlUserId: input.ghlUserId,
        messageCreatedAt: input.messageCreatedAt,
        status: "pending",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          ghlCallImportsTable.orgId,
          ghlCallImportsTable.locationId,
          ghlCallImportsTable.messageId,
        ],
        set: {
          conversationId: input.conversationId,
          contactId: input.contactId,
          ghlUserId: input.ghlUserId,
          messageCreatedAt: input.messageCreatedAt,
          updatedAt: new Date(),
        },
      });
  }
}
