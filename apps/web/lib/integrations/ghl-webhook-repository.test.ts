import { describe, expect, it, vi } from "vitest";
import { DrizzleGhlWebhookRepository } from "./ghl-webhook-repository";

function createInsertBuilder() {
  const builder = {
    onConflictDoUpdate: vi.fn(async (_config: unknown) => undefined),
    values: vi.fn(() => builder),
  };

  return builder;
}

describe("DrizzleGhlWebhookRepository", () => {
  it("keeps replayed GHL webhooks from reopening terminal import rows", async () => {
    const insertBuilder = createInsertBuilder();
    const db = {
      insert: vi.fn(() => insertBuilder),
    };
    const repository = new DrizzleGhlWebhookRepository(db as never);

    await repository.upsertGhlCallImport({
      orgId: "00000000-0000-4000-8000-000000000001",
      locationId: "loc-1",
      messageId: "msg-1",
      conversationId: "conv-1",
      contactId: "contact-1",
      ghlUserId: "ghl-user-1",
      messageCreatedAt: new Date("2026-06-18T12:00:00.000Z"),
      status: "pending",
    });

    expect(insertBuilder.onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const conflictConfig = insertBuilder.onConflictDoUpdate.mock.calls[0]?.[0] as
      | { set: { status?: unknown }; setWhere?: unknown }
      | undefined;

    expect(conflictConfig?.set.status).toBe("pending");
    expect(conflictConfig?.setWhere).toBeDefined();
  });
});
