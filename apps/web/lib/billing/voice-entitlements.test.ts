import { describe, expect, it, vi } from "vitest";
import {
  consumeVoiceMinutes,
  getVoiceEntitlementStatus,
  type VoiceEntitlementsRepository,
} from "./voice-entitlements";

type TestVoiceEntitlementsRepository = VoiceEntitlementsRepository & {
  consumeVoiceCreditGrant: ReturnType<typeof vi.fn>;
  insertVoiceUsageEvent: ReturnType<typeof vi.fn>;
};

function makeRepository(
  overrides: Partial<VoiceEntitlementsRepository> = {},
): TestVoiceEntitlementsRepository {
  return {
    consumeVoiceMinutesAtomically: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { minutesDebited: 1 } }),
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
  it("uses a single atomic repository operation for idempotent balance mutation", async () => {
    const consumeVoiceMinutesAtomically = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { minutesDebited: 3 } });
    const repository = {
      ...makeRepository({
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
      }),
      consumeVoiceMinutesAtomically,
    } as TestVoiceEntitlementsRepository & {
      consumeVoiceMinutesAtomically: typeof consumeVoiceMinutesAtomically;
    };

    await expect(
      consumeVoiceMinutes(repository, "auth-user-1", {
        idempotencyKey: "roleplay:session-1:complete",
        minutes: 2.1,
        source: "roleplay_realtime",
        sessionId: "session-1",
      }),
    ).resolves.toEqual({ ok: true, data: { minutesDebited: 3 } });

    expect(consumeVoiceMinutesAtomically).toHaveBeenCalledWith({
      idempotencyKey: "roleplay:session-1:complete",
      minutes: 3,
      orgId: "org-1",
      sessionId: "session-1",
      source: "roleplay_realtime",
      userId: "auth-user-1",
    });
    expect(repository.consumeVoiceCreditGrant).not.toHaveBeenCalled();
    expect(repository.insertVoiceUsageEvent).not.toHaveBeenCalled();
  });

  it("returns atomic repository idempotency results without direct grant mutation", async () => {
    const consumeVoiceMinutesAtomically = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { minutesDebited: 1 } });
    const repository = makeRepository({ consumeVoiceMinutesAtomically });

    await expect(
      consumeVoiceMinutes(repository, "auth-user-1", {
        idempotencyKey: "roleplay:session-1:start",
        minutes: 1,
        source: "roleplay_realtime",
        sessionId: "session-1",
      }),
    ).resolves.toEqual({ ok: true, data: { minutesDebited: 1 } });

    expect(consumeVoiceMinutesAtomically).toHaveBeenCalledWith({
      idempotencyKey: "roleplay:session-1:start",
      minutes: 1,
      orgId: "org-1",
      sessionId: "session-1",
      source: "roleplay_realtime",
      userId: "auth-user-1",
    });
    expect(repository.consumeVoiceCreditGrant).not.toHaveBeenCalled();
    expect(repository.insertVoiceUsageEvent).not.toHaveBeenCalled();
  });

  it("returns atomic repository exhaustion results", async () => {
    const consumeVoiceMinutesAtomically = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    });
    const repository = makeRepository({
      consumeVoiceMinutesAtomically,
    });

    await expect(
      consumeVoiceMinutes(repository, "auth-user-1", {
        idempotencyKey: "roleplay:session-1:complete",
        minutes: 3,
        source: "roleplay_realtime",
        sessionId: "session-1",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    });

    expect(consumeVoiceMinutesAtomically).toHaveBeenCalledWith({
      idempotencyKey: "roleplay:session-1:complete",
      minutes: 3,
      orgId: "org-1",
      sessionId: "session-1",
      source: "roleplay_realtime",
      userId: "auth-user-1",
    });
  });
});
