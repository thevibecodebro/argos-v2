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

describe("roleplay history mobile layout", () => {
  it("offers all completed session details and review in a width-constrained mobile list", async () => {
    const html = renderToStaticMarkup(await RoleplayHistoryPage());
    expect(html).toContain('data-forge-mobile-table-cards="true"');
    const mobile = html.split('data-forge-mobile-table-cards="true"')[1]?.split("</article>")[0];
    expect(mobile).toContain("Budget concern");
    expect(mobile).toContain("Dana");
    expect(mobile).toContain("82");
    expect(mobile).toContain("01:30");
    expect(mobile).toContain("Oct 1, 2026");
    expect(mobile).toContain("Generated from call");
    expect(mobile).toContain('href="/roleplay?sessionId=completed-1"');
    expect(mobile).not.toContain("active-1");
    expect(html).toContain('class="hidden md:block"');
    expect(html).toContain('class="min-w-0" data-forge-table="true"');
  });
});
