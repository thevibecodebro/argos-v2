import { createLeadConnectorClient } from "../../../../packages/ghl-client/src/index";
import { refreshGhlToken } from "./oauth";
import type { GhlImportRepository } from "./repository";

type PollGhlSyncInput = {
  repository: GhlImportRepository;
  minIntervalMs?: number;
  once?: boolean;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

type ProviderMessage = {
  id: string | null;
  conversationId: string | null;
  contactId: string | null;
  userId: string | null;
  type: string | null;
  dateAdded: string | null;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollGhlSync(input: PollGhlSyncInput) {
  const sleep = input.sleep ?? defaultSleep;

  do {
    const now = new Date();
    const integrations = await input.repository.listDueGhlSyncIntegrations({
      now,
      minIntervalMs: input.minIntervalMs ?? 15 * 60 * 1000,
      limit: 10,
    });

    for (const integration of integrations) {
      try {
        await input.repository.markGhlSyncStarted(integration.orgId, now);
        let accessToken = integration.accessToken;

        if (integration.tokenExpiresAt <= new Date()) {
          const refreshed = await refreshGhlToken(integration.refreshToken);
          await input.repository.updateGhlTokens(integration.orgId, refreshed);
          accessToken = refreshed.accessToken;
        }

        const client = createLeadConnectorClient({ accessToken });
        const searchPayload = await client.searchConversations({
          locationId: integration.locationId,
          limit: 50,
        });
        let newestCursor = integration.lastSyncCursor ?? null;

        for (const conversation of extractConversations(searchPayload)) {
          const messagesPayload = await client.listConversationMessages(conversation.id);

          for (const message of extractMessages(messagesPayload, conversation.id)) {
            if (!message.id || !isCallMessage(message)) {
              continue;
            }

            await input.repository.upsertGhlCallImport({
              orgId: integration.orgId,
              locationId: integration.locationId,
              messageId: message.id,
              conversationId: message.conversationId,
              contactId: message.contactId,
              ghlUserId: message.userId,
              messageCreatedAt: parseOptionalDate(message.dateAdded),
            });

            newestCursor = chooseNewestCursor(newestCursor, message.dateAdded);
          }
        }

        await input.repository.markGhlSyncCompleted(integration.orgId, {
          cursor: newestCursor,
        });
      } catch (error) {
        await input.repository.markGhlSyncFailed(
          integration.orgId,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (input.once) {
      return;
    }

    await sleep(input.pollIntervalMs ?? 60_000);
  } while (true);
}

function extractConversations(payload: Record<string, unknown>) {
  const candidates = [
    payload.conversations,
    payload.data,
    payload.results,
  ].find(Array.isArray) as Array<Record<string, unknown>> | undefined;

  return (candidates ?? [])
    .map((conversation) => ({
      id: readString(conversation.id) ?? readString(conversation.conversationId),
    }))
    .filter((conversation): conversation is { id: string } => Boolean(conversation.id));
}

function extractMessages(payload: Record<string, unknown>, fallbackConversationId: string): ProviderMessage[] {
  const candidates = [
    payload.messages,
    payload.data,
    payload.results,
  ].find(Array.isArray) as Array<Record<string, unknown>> | undefined;

  return (candidates ?? []).map((message) => ({
    id: readString(message.id) ?? readString(message.messageId),
    conversationId: readString(message.conversationId) ?? fallbackConversationId,
    contactId: readString(message.contactId),
    userId: readString(message.userId) ?? readString(message.user_id),
    type: readString(message.type) ?? readString(message.messageType),
    dateAdded: readString(message.dateAdded) ?? readString(message.date_added),
  }));
}

function isCallMessage(message: ProviderMessage) {
  return !message.type || /call/i.test(message.type);
}

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function chooseNewestCursor(current: string | null, next: string | null) {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
