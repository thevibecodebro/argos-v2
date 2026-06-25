import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  ghlCallImportsTable,
  ghlIntegrationsTable,
  organizationsTable,
  type ArgosDb,
} from "@argos-v2/db";
import type { GhlWebhookRepository } from "./ghl-webhook";

export class DrizzleGhlWebhookRepository implements GhlWebhookRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async deleteGhlIntegrationByLocationId(locationId: string) {
    const deleted = await this.db
      .delete(ghlIntegrationsTable)
      .where(eq(ghlIntegrationsTable.locationId, locationId))
      .returning({ id: ghlIntegrationsTable.id });

    return deleted.length > 0;
  }

  async findGhlIntegrationByLocationId(locationId: string) {
    const [integration] = await this.db
      .select({
        orgId: ghlIntegrationsTable.orgId,
        locationId: ghlIntegrationsTable.locationId,
      })
      .from(ghlIntegrationsTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, ghlIntegrationsTable.orgId))
      .where(
        and(
          eq(ghlIntegrationsTable.locationId, locationId),
          eq(organizationsTable.status, "active"),
        ),
      )
      .limit(1);

    return integration ?? null;
  }

  async upsertGhlCallImport(input: {
    orgId: string;
    locationId: string;
    messageId: string;
    conversationId: string | null;
    contactId: string | null;
    ghlUserId: string | null;
    messageCreatedAt: Date | null;
    status: "pending";
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
        status: input.status,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          ghlCallImportsTable.orgId,
          ghlCallImportsTable.locationId,
          ghlCallImportsTable.messageId,
        ],
        setWhere: inArray(ghlCallImportsTable.status, ["pending", "running", "retrying"]),
        set: {
          conversationId: input.conversationId,
          contactId: input.contactId,
          ghlUserId: input.ghlUserId,
          messageCreatedAt: input.messageCreatedAt,
          status: "pending",
          skippedReason: null,
          lastError: null,
          nextRunAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }
}
