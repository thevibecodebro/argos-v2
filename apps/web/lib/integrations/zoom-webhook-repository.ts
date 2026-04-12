import { and, eq, inArray } from "drizzle-orm";
import {
  callsTable,
  getDb,
  usersTable,
  zoomIntegrationsTable,
  type ArgosDb,
} from "@argos-v2/db";

import { DrizzleCallsRepository } from "@/lib/calls/repository";
import type { ZoomWebhookRepository } from "./zoom-webhook";

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

  async findCallByZoomRecordingId(zoomRecordingId: string) {
    const [call] = await this.db
      .select({ id: callsTable.id })
      .from(callsTable)
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
        orgId: zoomIntegrationsTable.orgId,
        webhookToken: zoomIntegrationsTable.webhookToken,
        accessToken: zoomIntegrationsTable.accessToken,
        refreshToken: zoomIntegrationsTable.refreshToken,
        tokenExpiresAt: zoomIntegrationsTable.tokenExpiresAt,
      })
      .from(zoomIntegrationsTable)
      .where(eq(zoomIntegrationsTable.zoomAccountId, accountId))
      .limit(1);

    return integration ?? null;
  }

  async updateZoomTokens(orgId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }) {
    await this.db
      .update(zoomIntegrationsTable)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(zoomIntegrationsTable.orgId, orgId));
  }

  async setCallEvaluation(callId: string, evaluation: Parameters<DrizzleCallsRepository["setCallEvaluation"]>[1]) {
    await this.callsRepository.setCallEvaluation(callId, evaluation);
  }
}
