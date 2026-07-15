import { and, eq, sql } from "drizzle-orm";
import {
  callProcessingJobsTable,
  callsTable,
  findActiveCallProcessingSubscription,
  getDb,
  googleMeetImportsTable,
  googleMeetIntegrationsTable,
  organizationIngestionTitleFiltersTable,
  organizationsTable,
  rubricsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type {
  GoogleMeetImportRecord,
  GoogleMeetImportRepository as GoogleMeetImportRepositoryContract,
  GoogleMeetImportSkippedReason,
} from "./process-google-meet-import";
import type {
  GoogleMeetDiscoveredImport,
  GoogleMeetSyncRepository,
} from "./sync-google-meet";
import { decryptIntegrationToken, encryptIntegrationToken } from "../ghl/token-encryption";

type ClaimedImportRow = typeof googleMeetImportsTable.$inferSelect;

function toDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
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

function mapImport(row: ClaimedImportRow): GoogleMeetImportRecord {
  return {
    attemptCount: row.attemptCount,
    callId: row.callId,
    driveFileId: row.driveFileId,
    id: row.id,
    integrationId: row.integrationId,
    maxAttempts: row.maxAttempts,
    meetingTitle: row.meetingTitle,
    orgId: row.orgId,
    recordingName: row.recordingName,
  };
}

export class GoogleMeetImportRepository
  implements GoogleMeetSyncRepository, GoogleMeetImportRepositoryContract
{
  constructor(private readonly db: ArgosDb = getDb()) {}

  async claimNextGoogleMeetImport(now = new Date()) {
    const leaseExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const rows = extractRows<ClaimedImportRow>(
      await this.db.execute(sql`
        update google_meet_imports
        set
          status = 'running',
          attempt_count = attempt_count + 1,
          locked_at = ${now},
          lock_expires_at = ${leaseExpiresAt},
          updated_at = ${now}
        where id = (
          select id
          from google_meet_imports
          where attempt_count < max_attempts
            and (
              (
                status in ('pending', 'retrying')
                and next_run_at <= ${now}
                and (lock_expires_at is null or lock_expires_at <= ${now})
              )
              or (status = 'running' and lock_expires_at <= ${now})
            )
          order by next_run_at asc, created_at asc
          limit 1
          for update skip locked
        )
        returning *;
      `),
    );

    return rows[0] ? mapImport(rows[0]) : null;
  }

  async listDueGoogleMeetSyncIntegrations(input: {
    limit: number;
    minIntervalMs: number;
    now: Date;
  }) {
    const rows = await this.db
      .select({
        accessToken: googleMeetIntegrationsTable.accessToken,
        id: googleMeetIntegrationsTable.id,
        lastSyncCompletedAt: googleMeetIntegrationsTable.lastSyncCompletedAt,
        lastSyncCursor: googleMeetIntegrationsTable.lastSyncCursor,
        orgId: googleMeetIntegrationsTable.orgId,
        refreshToken: googleMeetIntegrationsTable.refreshToken,
        tokenExpiresAt: googleMeetIntegrationsTable.tokenExpiresAt,
      })
      .from(googleMeetIntegrationsTable)
      .innerJoin(
        organizationsTable,
        eq(organizationsTable.id, googleMeetIntegrationsTable.orgId),
      )
      .where(
        and(
          eq(googleMeetIntegrationsTable.syncEnabled, true),
          eq(organizationsTable.status, "active"),
          sql`${googleMeetIntegrationsTable.consentConfirmedAt} is not null`,
          sql`${googleMeetIntegrationsTable.defaultRepId} is not null`,
        ),
      )
      .limit(input.limit);

    return rows
      .filter((row) => {
        const completedAt = toDate(row.lastSyncCompletedAt);
        return (
          !completedAt ||
          input.now.getTime() - completedAt.getTime() >= input.minIntervalMs
        );
      })
      .map((row) => ({
        ...row,
        accessToken: decryptIntegrationToken(row.accessToken),
        lastSyncCursor: toDate(row.lastSyncCursor),
        refreshToken: decryptIntegrationToken(row.refreshToken),
        tokenExpiresAt: toDate(row.tokenExpiresAt) ?? new Date(0),
      }));
  }

  async findGoogleMeetIntegrationForImport(input: {
    integrationId: string;
    orgId: string;
  }) {
    const [integration] = await this.db
      .select({
        accessToken: googleMeetIntegrationsTable.accessToken,
        consentConfirmedAt: googleMeetIntegrationsTable.consentConfirmedAt,
        defaultRepId: googleMeetIntegrationsTable.defaultRepId,
        id: googleMeetIntegrationsTable.id,
        orgId: googleMeetIntegrationsTable.orgId,
        refreshToken: googleMeetIntegrationsTable.refreshToken,
        syncEnabled: googleMeetIntegrationsTable.syncEnabled,
        tokenExpiresAt: googleMeetIntegrationsTable.tokenExpiresAt,
      })
      .from(googleMeetIntegrationsTable)
      .innerJoin(
        organizationsTable,
        eq(organizationsTable.id, googleMeetIntegrationsTable.orgId),
      )
      .where(
        and(
          eq(googleMeetIntegrationsTable.id, input.integrationId),
          eq(googleMeetIntegrationsTable.orgId, input.orgId),
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
      consentConfirmedAt: toDate(integration.consentConfirmedAt),
      refreshToken: decryptIntegrationToken(integration.refreshToken),
      tokenExpiresAt: toDate(integration.tokenExpiresAt) ?? new Date(0),
    };
  }

  async getIngestionTitleFilterConfig(orgId: string) {
    const rows = await this.db
      .select({
        kind: organizationIngestionTitleFiltersTable.kind,
        phrase: organizationIngestionTitleFiltersTable.phrase,
      })
      .from(organizationIngestionTitleFiltersTable)
      .where(eq(organizationIngestionTitleFiltersTable.orgId, orgId));
    const includePhrases = rows
      .filter((row) => row.kind === "include")
      .map((row) => row.phrase);

    return {
      configured: includePhrases.length > 0,
      excludePhrases: rows
        .filter((row) => row.kind === "exclude")
        .map((row) => row.phrase),
      includePhrases,
    };
  }

  async upsertGoogleMeetImport(input: GoogleMeetDiscoveredImport) {
    const now = new Date();
    await this.db
      .insert(googleMeetImportsTable)
      .values({
        ...input,
        nextRunAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          googleMeetImportsTable.orgId,
          googleMeetImportsTable.recordingName,
        ],
        set: {
          conferenceEndedAt: input.conferenceEndedAt,
          conferenceRecordName: input.conferenceRecordName,
          conferenceStartedAt: input.conferenceStartedAt,
          driveFileId: input.driveFileId,
          integrationId: input.integrationId,
          meetingCode: input.meetingCode,
          meetingTitle: input.meetingTitle,
          nextRunAt: now,
          skippedReason: sql`case when ${googleMeetImportsTable.status} in ('imported', 'running') then ${googleMeetImportsTable.skippedReason} else ${input.skippedReason} end`,
          status: sql`case when ${googleMeetImportsTable.status} in ('imported', 'running') then ${googleMeetImportsTable.status} else ${input.status} end`,
          titleSource: input.titleSource,
          updatedAt: now,
        },
      });
  }

  async findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }) {
    return findActiveCallProcessingSubscription(this.db, input);
  }

  async findActiveRubricIdByOrgId(orgId: string) {
    const [rubric] = await this.db
      .select({ id: rubricsTable.id })
      .from(rubricsTable)
      .where(and(eq(rubricsTable.orgId, orgId), eq(rubricsTable.isActive, true)))
      .limit(1);
    return rubric?.id ?? null;
  }

  async createCallForGoogleMeetImport(input: {
    consentConfirmed: boolean;
    importId: string;
    meetingTitle: string;
    orgId: string;
    repId: string;
    rubricId: string | null;
  }) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ callId: googleMeetImportsTable.callId })
        .from(googleMeetImportsTable)
        .where(eq(googleMeetImportsTable.id, input.importId))
        .limit(1)
        .for("update");
      if (existing?.callId) {
        return { id: existing.callId };
      }

      const [call] = await tx
        .insert(callsTable)
        .values({
          callTopic: input.meetingTitle,
          consentConfirmed: input.consentConfirmed,
          orgId: input.orgId,
          repId: input.repId,
          rubricId: input.rubricId,
          status: "uploaded",
        })
        .returning({ id: callsTable.id });
      await tx
        .update(googleMeetImportsTable)
        .set({ callId: call.id, updatedAt: new Date() })
        .where(eq(googleMeetImportsTable.id, input.importId));
      return call;
    });
  }

  async updateCallRecordingStorage(
    callId: string,
    recording: {
      contentType: string | null;
      fileSizeBytes: number;
      storageBucket: string;
      storagePath: string;
    },
  ) {
    await this.db
      .update(callsTable)
      .set({
        recordingContentType: recording.contentType,
        recordingFileSizeBytes: recording.fileSizeBytes,
        recordingStorageBucket: recording.storageBucket,
        recordingStoragePath: recording.storagePath,
        recordingUrl: null,
      })
      .where(eq(callsTable.id, callId));
  }

  async createOrResetCallProcessingJob(input: {
    callId: string;
    rubricId: string | null;
    sourceContentType: string | null;
    sourceFileName: string;
    sourceOrigin: "google_meet_recording";
    sourceSizeBytes: number;
    sourceStoragePath: string;
  }) {
    await this.db
      .insert(callProcessingJobsTable)
      .values({ ...input, status: "pending" })
      .onConflictDoNothing({ target: callProcessingJobsTable.callId });
  }

  async updateGoogleMeetTokens(
    orgId: string,
    tokens: {
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: Date;
    },
  ) {
    await this.db
      .update(googleMeetIntegrationsTable)
      .set({
        accessToken: encryptIntegrationToken(tokens.accessToken),
        refreshToken: encryptIntegrationToken(tokens.refreshToken),
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(googleMeetIntegrationsTable.orgId, orgId));
  }

  async markGoogleMeetSyncStarted(orgId: string, now = new Date()) {
    await this.db
      .update(googleMeetIntegrationsTable)
      .set({ lastSyncError: null, lastSyncStartedAt: now, updatedAt: now })
      .where(eq(googleMeetIntegrationsTable.orgId, orgId));
  }

  async markGoogleMeetSyncCompleted(
    orgId: string,
    input: { completedAt?: Date; cursor: Date },
  ) {
    const completedAt = input.completedAt ?? new Date();
    await this.db
      .update(googleMeetIntegrationsTable)
      .set({
        lastSyncCompletedAt: completedAt,
        lastSyncCursor: input.cursor,
        lastSyncError: null,
        updatedAt: completedAt,
      })
      .where(eq(googleMeetIntegrationsTable.orgId, orgId));
  }

  async markGoogleMeetSyncFailed(orgId: string, error: string) {
    await this.db
      .update(googleMeetIntegrationsTable)
      .set({ lastSyncError: error, updatedAt: new Date() })
      .where(eq(googleMeetIntegrationsTable.orgId, orgId));
  }

  async markGoogleMeetImportImported(
    importId: string,
    input: { callId: string },
  ) {
    await this.db
      .update(googleMeetImportsTable)
      .set({
        callId: input.callId,
        lastError: null,
        lockedAt: null,
        lockExpiresAt: null,
        skippedReason: null,
        status: "imported",
        updatedAt: new Date(),
      })
      .where(eq(googleMeetImportsTable.id, importId));
  }

  async markGoogleMeetImportSkipped(
    importId: string,
    input: { reason: GoogleMeetImportSkippedReason },
  ) {
    await this.db
      .update(googleMeetImportsTable)
      .set({
        lockedAt: null,
        lockExpiresAt: null,
        skippedReason: input.reason,
        status: "skipped",
        updatedAt: new Date(),
      })
      .where(eq(googleMeetImportsTable.id, importId));
  }

  async markGoogleMeetImportRetryable(
    record: GoogleMeetImportRecord,
    error: string,
  ) {
    const now = new Date();
    const retryMinutes = record.attemptCount === 1 ? 2 : record.attemptCount === 2 ? 10 : 30;
    await this.db
      .update(googleMeetImportsTable)
      .set({
        lastError: error,
        lockedAt: null,
        lockExpiresAt: null,
        nextRunAt: new Date(now.getTime() + retryMinutes * 60 * 1000),
        status: "retrying",
        updatedAt: now,
      })
      .where(eq(googleMeetImportsTable.id, record.id));
  }

  async markGoogleMeetImportFailed(importId: string, error: string) {
    await this.db
      .update(googleMeetImportsTable)
      .set({
        lastError: error,
        lockedAt: null,
        lockExpiresAt: null,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(googleMeetImportsTable.id, importId));
  }
}
