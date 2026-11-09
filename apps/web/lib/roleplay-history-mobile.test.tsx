import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));
vi.mock("@/lib/auth/request-user", () => ({ getCachedAuthenticatedSupabaseUser: async () => ({ id: "rep-1" }) }));
vi.mock("@/lib/access/managed-capabilities-server", () => ({ requireManagedCapabilityForPage: async () => ({ access: {} }) }));
vi.mock("@/lib/access/managed-capabilities", () => ({ hasManagedCapability: () => false }));
vi.mock("@/lib/roleplay/create-repository", () => ({ createRoleplayRepository: () => ({}) }));
vi.mock("@/lib/roleplay/service", () => ({ listRoleplaySessions: async () => ({ ok: true, data: { sessions: [
  { id: "completed-1", status: "complete", origin: "generated_from_call", personaDetails: { name: "Dana", objectionType: "Budget concern" }, overallScore: 82, transcript: [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hello" }], createdAt: "2026-10-01T12:00:00Z" },
  { id: "active-1", status: "active", transcript: [], createdAt: "2026-10-01T12:00:00Z" },
] } }) }));

import RoleplayHistoryPage from "../app/(authenticated)/roleplay/history/page";
import { RoleplayHistoryPanel } from "../components/roleplay-history-panel";
import type { RoleplaySession } from "./roleplay/types";

describe("roleplay history mobile layout", () => {
  it("offers all completed session details and review in a width-constrained mobile list", async () => {
    const html = renderToStaticMarkup(await RoleplayHistoryPage());
    expect(html).toContain('data-roleplay-history-mobile="true"');
    const mobile = html.split('data-roleplay-history-mobile="true"')[1]?.split("</ul>")[0];
    expect(mobile).toContain("Budget concern");
    expect(mobile).toContain("Dana");
    expect(mobile).toContain("82");
    expect(mobile).toContain("01:30");
    expect(mobile).toContain("Oct 1, 2026");
    expect(mobile).toContain("Generated from call");
    expect(mobile).toContain('href="/roleplay?sessionId=completed-1"');
    expect(mobile).not.toContain("active-1");
    expect(html).toContain('aria-label="Completed roleplay sessions"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Est. duration");
    expect(html).not.toContain('data-selected-object-drawer="true"');
  });

  it("distinguishes unavailable scores from a real zero and excludes unfinished sessions", () => {
    const base: Omit<RoleplaySession, "id" | "overallScore"> = {
      repId: "rep-1", orgId: "org-1", status: "complete", origin: "manual",
      persona: "Buyer", personaDetails: null, transcript: [], createdAt: "2026-11-09T12:00:00Z",
      industry: null, difficulty: null, sourceCallId: null, rubricId: null, focusMode: "all",
      focusCategorySlug: null, scenarioSummary: null, scenarioBrief: null, scorecard: null,
      voiceStartedAt: null, voiceCompletedAt: null, voiceMinutesSettled: 0, voiceSettledAt: null,
    };
    const sessions: RoleplaySession[] = [
      { ...base, id: "not-scored", overallScore: null },
      { ...base, id: "zero", overallScore: 0 },
      { ...base, id: "unfinished", status: "active", overallScore: null },
    ];
    const html = renderToStaticMarkup(<RoleplayHistoryPanel sessions={sessions} />);
    expect(html).toContain("Not scored");
    expect(html).toContain('aria-label="0 out of 100"');
    expect(html).toContain('href="/roleplay?sessionId=zero"');
    expect(html).not.toContain("unfinished");
  });

  it("gives an empty history a clear path back to practice", () => {
    const html = renderToStaticMarkup(<RoleplayHistoryPanel sessions={[]} />);
    expect(html).toContain("Your practice history starts here");
    expect(html).toContain("Start practicing");
    expect(html).toContain('href="/roleplay"');
    expect(html).not.toContain("<table");
  });
});
