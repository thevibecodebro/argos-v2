import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HighlightsPage from "../app/(authenticated)/highlights/page";
import LeaderboardPage from "../app/(authenticated)/leaderboard/page";

vi.mock("@/lib/auth/request-user", () => ({ getCachedAuthenticatedSupabaseUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/access/managed-capabilities-server", () => ({ requireManagedCapabilityForPage: async () => ({}) }));
vi.mock("@/lib/platform/effective-request", () => ({ createEffectiveTenantRepository: async () => ({}) }));
vi.mock("@/lib/calls/create-repository", () => ({ createCallsRepository: () => ({}) }));
vi.mock("@/lib/dashboard/create-repository", () => ({ createDashboardRepository: () => ({}) }));
vi.mock("@/lib/calls/service", () => ({ listHighlights: async () => ({ ok: true, data: { highlights: [
  { id: "highlight-1", callId: "call-1", category: "Discovery", severity: "medium", observation: "Clarify the buyer's timeline.", recommendation: "Ask what happens if the deadline slips.", highlightNote: "Practice the follow-up question.", callTopic: "Northwind discovery", callCreatedAt: "2026-09-30T12:00:00.000Z" },
  { id: "highlight-2", callId: "call-2", category: "Closing", severity: null, observation: "Confirm the next step.", recommendation: null, highlightNote: "Agree on an owner.", callTopic: "Contoso review", callCreatedAt: "2026-09-29T12:00:00.000Z" },
] } }) }));
vi.mock("@/lib/dashboard/service", () => ({ getDashboardLeaderboard: async () => ({
  topQuality: [{ userId: "rep-1", firstName: "Mina", lastName: "Cross", rank: 1, value: 68 }],
  topVolume: [{ userId: "rep-1", firstName: "Mina", lastName: "Cross", rank: 1, value: 9 }],
  mostImproved: [{ userId: "rep-1", firstName: "Mina", lastName: "Cross", rank: 1, value: -3 }],
}) }));

describe("mobile work rows", () => {
  it("provides every highlight's source and secondary evidence without a horizontal table", async () => {
    const html = renderToStaticMarkup(await HighlightsPage());
    const mobile = html.split('data-forge-mobile-table-cards="true"')[1]!.split("</section>")[0]!;
    expect(mobile).toContain('href="/calls/call-1"');
    expect(mobile).toContain('href="/calls/call-2"');
    expect(mobile).toContain("Clarify the buyer&#x27;s timeline.");
    expect(mobile).toContain("Agree on an owner.");
    expect(mobile).toContain("Recommendation &amp; note");
    expect(mobile).toContain("Ask what happens if the deadline slips.");
    expect(mobile).not.toContain("<table");
  });

  it("preserves rank, quality, volume, movement, and review action in phone rows", async () => {
    const html = renderToStaticMarkup(await LeaderboardPage());
    const mobile = html.split('data-forge-mobile-table-cards="true"')[1]!.split("</section>")[0]!;
    expect(mobile).toContain('href="/team/rep-1"');
    expect(mobile).toContain("Mina Cross");
    expect(mobile).toContain("#1");
    expect(mobile).toContain(">68<");
    expect(mobile).toContain(">9<");
    expect(mobile).toContain(">-3<");
    expect(mobile).not.toContain("+-3");
    expect(mobile).toContain("Needs review");
    expect(mobile).not.toContain("<table");
  });
});
