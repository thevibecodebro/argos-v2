import { and, eq, inArray } from "drizzle-orm";
import {
  callProcessingJobsTable,
  callsTable,
  findActiveCallProcessingSubscription,
  getDb,
  organizationIngestionTitleFiltersTable,
  organizationsTable,
  usersTable,
  zoomIntegrationsTable,
  type ArgosDb,
} from "@argos-v2/db";

import { DrizzleCallsRepository } from "@/lib/calls/repository";
import type { ZoomWebhookRepository } from "./zoom-webhook";
import {
  decryptIntegrationToken,
  decryptNullableIntegrationToken,
  encryptIntegrationToken,
} from "./token-encryption";

export class DrizzleZoomWebhookRepository implements ZoomWebhookRepository {
  private readonly callsRepository: DrizzleCallsRepository;

  constructor(private readonly db: ArgosDb = getDb()) {
    this.callsRepository = new DrizzleCallsRepository(db);
  }

  async createCall(input: {
    callTopic: string | null;
    consentConfirmed: boolean;
    durationSeconds: number | null;
    orgId: string;
    rubricId?: string | null;
    recordingUrl: string | null;
    repId: string;
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed";
    zoomMeetingId: string | null;
    zoomRecordingId: string;
  }) {
    const [call] = await this.db
      .insert(callsTable)
      .values(input)
      .returning({
        id: callsTable.id,
      });

    return call;
  }

  async createOrResetCallProcessingJob(
    input: Parameters<DrizzleCallsRepository["createOrResetCallProcessingJob"]>[0],
  ) {
    await this.callsRepository.createOrResetCallProcessingJob(input);
  }

  async replaceCallRecordingAndResetProcessingJob(
    input: Parameters<ZoomWebhookRepository["replaceCallRecordingAndResetProcessingJob"]>[0],
    removeSourceAssets: (storagePaths: string[]) => Promise<void>,
  ) {
    return this.db.transaction(async (tx) => {
      const [call] = await tx
        .select({ recordingStoragePath: callsTable.recordingStoragePath })
        .from(callsTable)
        .where(eq(callsTable.id, input.callId))
        .limit(1)
        .for("update");
      const [job] = await tx
        .select({
          sourceStoragePath: callProcessingJobsTable.sourceStoragePath,
          status: callProcessingJobsTable.status,
        })
        .from(callProcessingJobsTable)
        .where(eq(callProcessingJobsTable.callId, input.callId))
        .limit(1);

      if (job && ["pending", "running", "retrying", "complete"].includes(job.status)) {
        if (input.recording.storagePath !== call?.recordingStoragePath) {
          await removeSourceAssets([input.recording.storagePath]);
        }
        return false;
      }
      if (
        call?.recordingStoragePath &&
        call.recordingStoragePath !== input.recording.storagePath
      ) {
        await removeSourceAssets([call.recordingStoragePath]);
      }

      const callsRepository = new DrizzleCallsRepository(tx as ArgosDb);
      await callsRepository.updateCallRecordingStorage(input.callId, input.recording);
      await callsRepository.createOrResetCallProcessingJob({
        callId: input.callId,
        ...input.job,
      });
      return true;
    });
  }

  async findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }) {
    return findActiveCallProcessingSubscription(this.db, input);
  }

  async findCallByZoomRecordingId(input: {
    orgId: string;
    zoomRecordingId: string;
  }) {
    const [call] = await this.db
      .select({
        id: callsTable.id,
        status: callsTable.status,
        jobStatus: callProcessingJobsTable.status,
        recordingStoragePath: callsTable.recordingStoragePath,
      })
      .from(callsTable)
      .leftJoin(callProcessingJobsTable, eq(callProcessingJobsTable.callId, callsTable.id))
      .where(
        and(
          eq(callsTable.orgId, input.orgId),
          eq(callsTable.zoomRecordingId, input.zoomRecordingId),
        ),
      )
      .limit(1);

    return call ?? null;
  }

  async findIngestionTitleFilterConfig(orgId: string) {
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
    const excludePhrases = rows
      .filter((row) => row.kind === "exclude")
      .map((row) => row.phrase);

    return {
      configured: includePhrases.length > 0,
      excludePhrases,
      includePhrases,
    };
  }

  async findPreferredCallOwner(orgId: string) {
    const [managerLike] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.orgId, orgId), inArray(usersTable.role, ["admin", "manager"])))
      .limit(1);

    if (managerLike) {
      return managerLike;
    }

    const [fallback] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.orgId, orgId))
      .limit(1);

    return fallback ?? null;
  }

  async findZoomIntegrationByAccountId(accountId: string) {
    const [integration] = await this.db
      .select({
        id: zoomIntegrationsTable.id,
        orgId: zoomIntegrationsTable.orgId,
        webhookToken: zoomIntegrationsTable.webhookToken,
        accessToken: zoomIntegrationsTable.accessToken,
        refreshToken: zoomIntegrationsTable.refreshToken,
        tokenExpiresAt: zoomIntegrationsTable.tokenExpiresAt,
      })
      .from(zoomIntegrationsTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, zoomIntegrationsTable.orgId))
      .where(
        and(
          eq(zoomIntegrationsTable.zoomAccountId, accountId),
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
      webhookToken: decryptNullableIntegrationToken(integration.webhookToken),
    };
  }

  async updateCallRecording(callId: string, recordingUrl: string | null) {
    await this.callsRepository.updateCallRecording(callId, recordingUrl);
  }

  async updateCallRecordingStorage(
    callId: string,
    recording: Parameters<DrizzleCallsRepository["updateCallRecordingStorage"]>[1],
  ) {
    await this.callsRepository.updateCallRecordingStorage(callId, recording);
  }

  async updateCallStatus(
    callId: string,
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed",
  ) {
    await this.callsRepository.updateCallStatus(callId, status);
  }

  async updateZoomTokens(integrationId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
    await this.db
      .update(zoomIntegrationsTable)
      .set({
        accessToken: encryptIntegrationToken(tokens.accessToken),
        refreshToken: encryptIntegrationToken(tokens.refreshToken),
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(zoomIntegrationsTable.id, integrationId));
  }
}
