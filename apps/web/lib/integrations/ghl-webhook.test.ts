import { describe, expect, it, vi } from "vitest";
import { processGhlWebhookRequest, type GhlWebhookRepository } from "./ghl-webhook";

function createRepository(
  overrides: Partial<GhlWebhookRepository> = {},
): GhlWebhookRepository {
  return {
    deleteGhlIntegrationByLocationId: vi.fn(),
    findGhlIntegrationByLocationId: vi.fn(),
    upsertGhlCallImport: vi.fn(),
    ...overrides,
  };
}

describe("processGhlWebhookRequest", () => {
  it("rejects requests without the shared GHL webhook token", async () => {
    const repository = createRepository();

    const result = await processGhlWebhookRequest(repository, {
      headers: { token: null },
      rawBody: JSON.stringify({ type: "InboundMessage", locationId: "loc-1" }),
      env: { GHL_WEBHOOK_TOKEN: "secret-token" },
    });

    expect(result.status).toBe(401);
    expect(repository.upsertGhlCallImport).not.toHaveBeenCalled();
  });

  it("enqueues inbound and outbound message events for the connected location", async () => {
    const repository = createRepository({
      findGhlIntegrationByLocationId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        locationId: "loc-1",
      }),
      upsertGhlCallImport: vi.fn().mockResolvedValue(undefined),
    });

    const result = await processGhlWebhookRequest(repository, {
      headers: { token: "secret-token" },
      rawBody: JSON.stringify({
        type: "OutboundMessage",
        locationId: "loc-1",
        messageId: "msg-1",
        conversationId: "conv-1",
        contactId: "contact-1",
        userId: "ghl-user-1",
        dateAdded: "2026-06-18T12:00:00.000Z",
      }),
      env: { GHL_WEBHOOK_TOKEN: "secret-token" },
    });

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(repository.upsertGhlCallImport).toHaveBeenCalledWith({
      orgId: "org-1",
      locationId: "loc-1",
      messageId: "msg-1",
      conversationId: "conv-1",
      contactId: "contact-1",
      ghlUserId: "ghl-user-1",
      messageCreatedAt: new Date("2026-06-18T12:00:00.000Z"),
      status: "pending",
    });
  });

  it("marks app uninstall events disconnected by location without importing messages", async () => {
    const repository = createRepository({
      deleteGhlIntegrationByLocationId: vi.fn().mockResolvedValue(true),
    });

    const result = await processGhlWebhookRequest(repository, {
      headers: { token: "secret-token" },
      rawBody: JSON.stringify({
        type: "AppUninstalled",
        locationId: "loc-1",
      }),
      env: { GHL_WEBHOOK_TOKEN: "secret-token" },
    });

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(repository.deleteGhlIntegrationByLocationId).toHaveBeenCalledWith("loc-1");
    expect(repository.upsertGhlCallImport).not.toHaveBeenCalled();
  });
});
