import { describe, expect, it, vi } from "vitest";
import type { VoiceEntitlementsRepository } from "./voice-entitlements";
import { getVoiceBalance } from "./voice-balance";

function makeRepository(
  overrides: Partial<VoiceEntitlementsRepository> = {},
): VoiceEntitlementsRepository {
  return {
    consumeVoiceMinutesAtomically: vi.fn(),
    ensureCoachingVoiceCreditGrant: vi.fn().mockResolvedValue(undefined),
    findActiveSoftwareAccess: vi.fn().mockResolvedValue({
      accessEndsAt: new Date("2026-12-31T00:00:00.000Z"),
      accessStartsAt: new Date("2026-01-01T00:00:00.000Z"),
      billingPlanId: "team",
      package: "team",
      seatCount: 3,
      sourceId: "subscription-1",
      sourceType: "stripe_subscription",
      voiceMinutesPerSeat: 120,
    }),
    findActiveVoiceCreditGrants: vi.fn().mockResolvedValue([]),
    findUserBillingScope: vi.fn().mockResolvedValue({
      orgId: "org-1",
      role: "admin",
      userId: "user-1",
    }),
    findVoiceBalanceGrants: vi.fn().mockResolvedValue([]),
    insertVoiceUsageEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("getVoiceBalance", () => {
  it("combines included and purchased workspace minutes and allows admins to manage them", async () => {
    const repository = makeRepository({
      findVoiceBalanceGrants: vi.fn().mockResolvedValue([
        {
          id: "included",
          minutesGranted: 360,
          minutesRemaining: 80,
          periodEnd: new Date("2026-08-01T00:00:00.000Z"),
          sourceType: "subscription_included",
        },
        {
          id: "pack",
          minutesGranted: 250,
          minutesRemaining: 70,
          sourceType: "extra_pack",
        },
      ]),
    });

    await expect(getVoiceBalance(repository, "user-1")).resolves.toEqual({
      ok: true,
      data: {
        accessEndsAt: "2026-12-31T00:00:00.000Z",
        accessSource: "stripe_subscription",
        billingPlanId: "team",
        canManageBasePlan: true,
        canPurchaseMinutes: true,
        capacityMinutes: 610,
        includedMinutesRemaining: 80,
        isUnlimited: false,
        package: "team",
        purchasedMinutesRemaining: 70,
        remainingPercentage: 25,
        renewalDate: "2026-08-01T00:00:00.000Z",
        seatCount: 3,
        state: "low",
        totalMinutesRemaining: 150,
      },
    });
  });

  it("returns unlimited access for Enterprise without loading pooled grants", async () => {
    const findVoiceBalanceGrants = vi.fn().mockResolvedValue([]);
    const repository = makeRepository({
      findUserBillingScope: vi.fn().mockResolvedValue({
        orgId: "org-enterprise",
        plan: "Enterprise",
        role: "admin",
        userId: "user-1",
      }),
      findVoiceBalanceGrants,
    });

    await expect(getVoiceBalance(repository, "user-1")).resolves.toEqual({
      ok: true,
      data: {
        accessEndsAt: "2026-12-31T00:00:00.000Z",
        accessSource: "stripe_subscription",
        billingPlanId: "team",
        canManageBasePlan: true,
        canPurchaseMinutes: false,
        capacityMinutes: 0,
        includedMinutesRemaining: 0,
        isUnlimited: true,
        package: "team",
        purchasedMinutesRemaining: 0,
        remainingPercentage: 100,
        renewalDate: null,
        seatCount: 3,
        state: "healthy",
        totalMinutesRemaining: 0,
      },
    });
    expect(findVoiceBalanceGrants).not.toHaveBeenCalled();
    expect(repository.ensureCoachingVoiceCreditGrant).not.toHaveBeenCalled();
  });

  it.each([
    [10, 100, "critical"],
    [0, 100, "exhausted"],
  ] as const)(
    "maps %i of %i remaining to %s",
    async (minutesRemaining, minutesGranted, expectedState) => {
      const repository = makeRepository({
        findVoiceBalanceGrants: vi.fn().mockResolvedValue([
          {
            id: "included",
            minutesGranted,
            minutesRemaining,
            sourceType: "subscription_included",
          },
        ]),
      });

      const result = await getVoiceBalance(repository, "user-1");
      expect(result.ok && result.data.state).toBe(expectedState);
    },
  );

  it("lets members view the pool but directs purchases to their organization admin", async () => {
    const repository = makeRepository({
      findUserBillingScope: vi.fn().mockResolvedValue({
        orgId: "org-1",
        role: "rep",
        userId: "user-1",
      }),
      findVoiceBalanceGrants: vi.fn().mockResolvedValue([
        {
          id: "included",
          minutesGranted: 360,
          minutesRemaining: 360,
          sourceType: "subscription_included",
        },
      ]),
    });

    const result = await getVoiceBalance(repository, "user-1");
    expect(result.ok && result.data.canPurchaseMinutes).toBe(false);
    expect(result.ok && result.data.canManageBasePlan).toBe(false);
  });

  it("lazily provisions the current pooled coaching grant", async () => {
    const ensureCoachingVoiceCreditGrant = vi.fn().mockResolvedValue(undefined);
    const repository = makeRepository({
      ensureCoachingVoiceCreditGrant,
      findActiveSoftwareAccess: vi.fn().mockResolvedValue({
        accessEndsAt: new Date("2099-12-31T00:00:00.000Z"),
        accessStartsAt: new Date("2026-01-01T00:00:00.000Z"),
        billingPlanId: "coaching-team",
        package: "team",
        seatCount: 4,
        sourceId: "coaching-1",
        sourceType: "coaching_contract",
        voiceMinutesPerSeat: 120,
      }),
    });

    await getVoiceBalance(repository, "user-1");

    expect(ensureCoachingVoiceCreditGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        billingPlanId: "coaching-team",
        minutesGranted: 480,
        orgId: "org-1",
        sourceId: expect.stringContaining("coaching:coaching-1:"),
        userId: "user-1",
      }),
    );
  });
});
