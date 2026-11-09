// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VoiceBalanceCard, VoiceBalanceSummary } from "../components/billing/voice-balance-card";
import type { VoiceBalance } from "./billing/voice-balance";

vi.mock("next/link", () => ({
  default: ({ prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean | null }) =>
    createElement("a", { ...props, "data-link-prefetch": String(prefetch) }),
}));

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
  it("opts both plan checkout links out of automatic prefetch without changing their destinations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "software_access_required", error: "Choose a plan." }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    let root: Root | undefined;
    try {
      await act(async () => { root = createRoot(container); root.render(createElement(VoiceBalanceCard, { returnTo: "/settings" })); });
      const links = [...container.querySelectorAll("a")];
      expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("data-link-prefetch")])).toEqual([
        ["Choose Solo", "/billing/checkout?plan=solo&return_to=%2Fsettings", "false"],
        ["Choose Team", "/billing/checkout?plan=team&return_to=%2Fsettings", "false"],
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/billing/voice-balance", { cache: "no-store" });
    } finally {
      if (root) await act(async () => root!.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });

  it("opts the plan-management link out of prefetch while retaining the portal destination", () => {
    const html = renderToStaticMarkup(createElement(VoiceBalanceSummary, {
      balance: { ...enterpriseBalance, canManageBasePlan: true }, returnTo: "/roleplay",
    }));
    expect(html).toMatch(/<a[^>]*href="\/billing\/portal\?return_to=%2Froleplay"[^>]*data-link-prefetch="false"/);
    expect(html).toContain("Manage plan");
  });

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
