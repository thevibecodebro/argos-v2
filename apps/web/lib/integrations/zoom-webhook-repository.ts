import { and, eq, inArray } from "drizzle-orm";
import {
  callProcessingJobsTable,
  callsTable,
  findActiveCallProcessingSubscription,
  getDb,
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

  async findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }) {
    return findActiveCallProcessingSubscription(this.db, input);
  }

  async findCallByZoomRecordingId(zoomRecordingId: string) {
    const [call] = await this.db
      .select({
        id: callsTable.id,
        status: callsTable.status,
        jobStatus: callProcessingJobsTable.status,
      })
      .from(callsTable)
      .leftJoin(callProcessingJobsTable, eq(callProcessingJobsTable.callId, callsTable.id))
      .where(eq(callsTable.zoomRecordingId, zoomRecordingId))
      .limit(1);

    return call ?? null;
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
      .where(eq(zoomIntegrationsTable.zoomAccountId, accountId))
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
