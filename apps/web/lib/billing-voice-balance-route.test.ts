import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedManagedCapability = vi.fn();
const getVoiceBalance = vi.fn();
const createEffectiveTenantBillingRepository = vi.fn();
const rawBillingRepository = { billing: "raw" };
const effectiveBillingRepository = { billing: "effective" };

vi.mock("@/lib/access/managed-capabilities-server", () => ({
  requireAuthenticatedManagedCapability,
}));

vi.mock("@/lib/billing/repository", () => ({
  DrizzleBillingRepository: vi.fn(() => rawBillingRepository),
}));

vi.mock("@/lib/billing/voice-balance", () => ({
  getVoiceBalance,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantBillingRepository,
}));

describe("voice balance route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedManagedCapability.mockResolvedValue({
      ok: true,
      orgId: "org-enterprise",
      access: { mode: "managed" },
      user: { id: "staff-user" },
    });
    createEffectiveTenantBillingRepository.mockResolvedValue(
      effectiveBillingRepository,
    );
    getVoiceBalance.mockResolvedValue({
      ok: true,
      data: { isUnlimited: true },
    });
  });

  it("resolves billing against the selected platform organization", async () => {
    const route = await import("../app/api/billing/voice-balance/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ isUnlimited: true });
    expect(createEffectiveTenantBillingRepository).toHaveBeenCalledWith(
      rawBillingRepository,
      "staff-user",
    );
    expect(getVoiceBalance).toHaveBeenCalledWith(
      effectiveBillingRepository,
      "staff-user",
    );
  });
});
