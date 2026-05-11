import { describe, expect, it, vi } from "vitest";
import {
  consumeVoiceMinutes,
  getVoiceEntitlementStatus,
  type VoiceEntitlementsRepository,
} from "./voice-entitlements";

function makeRepository(overrides: Partial<VoiceEntitlementsRepository> = {}): VoiceEntitlementsRepository {
  return {
    consumeVoiceCreditGrant: vi.fn().mockResolvedValue(undefined),
    findActiveVoiceCreditGrants: vi.fn().mockResolvedValue([]),
    findUserBillingScope: vi.fn().mockResolvedValue({
      orgId: "org-1",
      userId: "auth-user-1",
    }),
    insertVoiceUsageEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("getVoiceEntitlementStatus", () => {
  it("allows voice when active grants have remaining minutes", async () => {
    const repository = makeRepository({
      findActiveVoiceCreditGrants: vi.fn().mockResolvedValue([
        { id: "grant-1", minutesRemaining: 12 },
        { id: "grant-2", minutesRemaining: 0 },
      ]),
    });

    await expect(getVoiceEntitlementStatus(repository, "auth-user-1")).resolves.toEqual({
      ok: true,
      data: {
        availableMinutes: 12,
        orgId: "org-1",
        userId: "auth-user-1",
      },
    });
  });

  it("blocks voice when no active minutes remain", async () => {
    const repository = makeRepository({
      findActiveVoiceCreditGrants: vi.fn().mockResolvedValue([
        { id: "grant-1", minutesRemaining: 0 },
      ]),
    });

    await expect(getVoiceEntitlementStatus(repository, "auth-user-1")).resolves.toEqual({
      ok: false,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    });
  });
});

describe("consumeVoiceMinutes", () => {
  it("debits included minutes before extra packs and records usage", async () => {
    const repository = makeRepository({
      findActiveVoiceCreditGrants: vi.fn().mockResolvedValue([
        {
          id: "included",
          minutesRemaining: 2,
          sourceType: "subscription_included",
        },
        {
          id: "extra",
          minutesRemaining: 10,
          sourceType: "extra_pack",
        },
      ]),
    });

    await expect(
      consumeVoiceMinutes(repository, "auth-user-1", {
        idempotencyKey: "roleplay:session-1:complete",
        minutes: 3,
        source: "roleplay_realtime",
        sessionId: "session-1",
      }),
    ).resolves.toEqual({ ok: true, data: { minutesDebited: 3 } });

    expect(repository.consumeVoiceCreditGrant).toHaveBeenNthCalledWith(1, "included", 2);
    expect(repository.consumeVoiceCreditGrant).toHaveBeenNthCalledWith(2, "extra", 1);
    expect(repository.insertVoiceUsageEvent).toHaveBeenCalledWith({
      idempotencyKey: "roleplay:session-1:complete",
      minutesDebited: 3,
      orgId: "org-1",
      sessionId: "session-1",
      source: "roleplay_realtime",
      userId: "auth-user-1",
    });
  });
});
