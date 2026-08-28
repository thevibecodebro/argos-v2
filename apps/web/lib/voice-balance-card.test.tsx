import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VoiceBalanceSummary } from "../components/billing/voice-balance-card";
import type { VoiceBalance } from "./billing/voice-balance";

const enterpriseBalance: VoiceBalance = {
  accessEndsAt: "2026-12-31T00:00:00.000Z",
  accessSource: "coaching_contract",
  billingPlanId: "coaching-team",
  canManageBasePlan: false,
  canPurchaseMinutes: false,
  capacityMinutes: 0,
  includedMinutesRemaining: 0,
  isUnlimited: true,
  package: "team",
  purchasedMinutesRemaining: 0,
  remainingPercentage: 100,
  renewalDate: null,
  seatCount: 12,
  state: "healthy",
  totalMinutesRemaining: 0,
};

describe("VoiceBalanceSummary", () => {
  it("renders Enterprise as unlimited without pooled-minute controls", () => {
    const html = renderToStaticMarkup(
      createElement(VoiceBalanceSummary, {
        balance: enterpriseBalance,
        returnTo: "/roleplay",
      }),
    );

    expect(html).toContain('data-voice-balance-state="unlimited"');
    expect(html).toContain("Unlimited");
    expect(html).toContain("Unlimited live voice included");
    expect(html.toLowerCase()).not.toContain("pooled");
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("Buy minutes");
    expect(html).not.toContain("Contact your organization admin to buy more minutes");
  });
});
