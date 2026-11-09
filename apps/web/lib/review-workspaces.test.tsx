import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CallsWorkspace, type CallsWorkspaceProps } from "../components/calls-workspace";
import { HighlightsWorkspace } from "../components/highlights-workspace";
import { DashboardWorkspace } from "../components/dashboard-workspace";
import { getCallsWorkspaceQuery } from "../components/calls-workspace-query";
import type { CallHighlight, CallSummary } from "./calls/service";

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => createElement("a", { ...props, "data-test-next-link": "true" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const call: CallSummary = { id: "call-fixture", status: "complete", overallScore: null, durationSeconds: 0, callTopic: "Long conversation with a skeptical buyer", repId: "rep", repFirstName: "Dana", repLastName: "Mercer", createdAt: "2026-11-09T12:00:00Z" };
const props: CallsWorkspaceProps = { calls: [call], total: 1, canSeeRep: true, scoringEnabled: true, canUpload: true, canDelete: true, hasActiveFilters: false, views: [{ href: "/calls", label: "All calls", active: true }], page: 0, totalPages: 1, previousHref: "/calls", nextHref: "/calls?offset=20" };

describe("Review workspaces", () => {
  it("renders calls without selecting the first row or duplicating its details", () => {
    const html = renderToStaticMarkup(createElement(CallsWorkspace, props));
    expect(html).toContain('href="/calls/call-fixture"');
    expect(html).toContain('data-calls-primary-table="true"');
    expect(html).toContain('data-mobile-call-card="true"');
    expect(html).toContain("0:00");
    expect(html).toContain("—");
    expect(html).not.toContain("Selected row");
    expect(html).not.toContain("preview-drawer");
  });

  it("keeps Review primary and authorized deletion behind More actions in both recording layouts", () => {
    const html = renderToStaticMarkup(createElement(CallsWorkspace, props));
    const desktop = html.split('<tbody>')[1]!.split('</tbody>')[0]!;
    const mobile = html.split('data-mobile-call-card="true"')[1]!;
    for (const layout of [desktop, mobile]) {
      expect(layout).toContain('aria-label="More actions for Long conversation with a skeptical buyer"');
      expect(layout).toContain('aria-haspopup="menu"');
      expect(layout).not.toContain('aria-label="Delete recording');
      expect(layout.indexOf('aria-label="Review ')).toBeLessThan(layout.indexOf('aria-label="More actions for '));
      expect(layout).toContain('aria-label="Review Long conversation with a skeptical buyer"');
      expect(layout).toContain('href="/calls/call-fixture"');
    }
    const readOnly = renderToStaticMarkup(createElement(CallsWorkspace, { ...props, canDelete: false }));
    expect(readOnly).not.toContain('aria-label="Delete recording');
    expect(readOnly).not.toContain('aria-label="More actions for ');
    expect(readOnly).toContain('href="/calls/call-fixture"');
  });

  it.each([true, false])("uses native navigation only for saved views and Clear filters (recordings=%s)", (hasCalls) => {
    const html = renderToStaticMarkup(createElement(CallsWorkspace, {
      ...props, calls: hasCalls ? [call] : [], total: hasCalls ? 1 : 0,
      hasActiveFilters: true, totalPages: 3,
      views: [{ href: "/calls?search=budget&sort=createdAt%3Aasc", label: "All calls", active: true }],
    }));
    const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    const native = anchors.filter(([, , label]) => label === "All calls" || label === "Clear filters");
    expect(native).toHaveLength(hasCalls ? 2 : 3);
    for (const [, attributes] of native) expect(attributes).not.toContain("data-test-next-link");
    expect(native[0]![1]).toContain('href="/calls?search=budget&amp;sort=createdAt%3Aasc"');
    for (const [, attributes, label] of anchors) {
      if (label !== "All calls" && label !== "Clear filters") expect(attributes).toContain('data-test-next-link="true"');
    }
    expect(html).toContain('data-test-next-link="true"');
  });

  it("removes forbidden upload, rep, and score affordances in recording-only mode", () => {
    const html = renderToStaticMarkup(createElement(CallsWorkspace, { ...props, canUpload: false, canSeeRep: false, scoringEnabled: false }));
    expect(html).not.toContain('href="/upload"');
    expect(html).not.toContain("Dana Mercer");
    expect(html).not.toContain('>Score<');
    expect(html).toContain("Recordings");
  });

  it("announces errors instead of presenting a failed query as an empty library", () => {
    const html = renderToStaticMarkup(createElement(CallsWorkspace, { ...props, calls: [], total: 0, error: "Please reload." }));
    expect(html).toContain("Calls unavailable");
    expect(html).toContain("Please reload.");
    expect(html).not.toContain("No recordings yet");
  });

  it("keeps pagination real and avoids disabled links that still navigate", () => {
    const html = renderToStaticMarkup(createElement(CallsWorkspace, { ...props, total: 42, totalPages: 3 }));
    expect(html).toContain('aria-label="Call pages"');
    expect(html).toContain('href="/calls?offset=20"');
    expect(html).not.toContain('aria-disabled="true"');
    expect(html).toContain("Page 1 of 3");
  });

  it("shows full highlight recommendations and notes beside their source link", () => {
    const highlight: CallHighlight = { id: "moment", callId: call.id, timestampSeconds: 65, category: "Discovery", observation: "Buyer asked for evidence.", recommendation: "Confirm the cost of the current process.", severity: "improvement", highlightNote: "Use this question next time.", createdAt: call.createdAt, callTopic: call.callTopic, callCreatedAt: call.createdAt, repId: call.repId, repFirstName: null, repLastName: null };
    const html = renderToStaticMarkup(createElement(HighlightsWorkspace, { highlights: [highlight] }));
    expect(html).toContain("Confirm the cost of the current process.");
    expect(html).toContain("Use this question next time.");
    expect(html).toContain("Open source call");
    expect(html).toContain("At 1:05");
    expect(html).not.toContain('data-highlight-row="selected"');
    expect(html).not.toContain("preview-drawer");
  });

  it.each([false, true])("hides admin-only dashboard targets from manager/executive views (executive=%s)", (isExecutive) => {
    const html = renderToStaticMarkup(createElement(DashboardWorkspace, { badges: [], executiveDashboard: null, isExecutive, isManager: true, managerDashboard: null, repDashboard: null, setupStatus: { orgSlug: "fixture", repsCount: 1, callsCount: 1, roleplayCount: 1 }, canBrand: true, canManageWorkspace: false }));
    expect(html).not.toContain('href="/settings/branding"');
    expect(html).not.toContain('href="/settings/people"');
    expect(html).not.toContain("Invite your team");
  });

  it("allows admin workspace setup but still respects branding capability", () => {
    const base = { badges: [], executiveDashboard: null, isExecutive: false, isManager: true, managerDashboard: null, repDashboard: null, setupStatus: { orgSlug: "fixture", repsCount: 1, callsCount: 1, roleplayCount: 1 }, canManageWorkspace: true };
    const html = renderToStaticMarkup(createElement(DashboardWorkspace, { ...base, canBrand: true }));
    expect(html).toContain('href="/settings/people"');
    expect(html).toContain('href="/settings/branding"');
    const restricted = renderToStaticMarkup(createElement(DashboardWorkspace, { ...base, canBrand: false }));
    expect(restricted).toContain('href="/settings/people"');
    expect(restricted).not.toContain('href="/settings/branding"');
    const complete = renderToStaticMarkup(createElement(DashboardWorkspace, { ...base, canManageWorkspace: false, setupStatus: { ...base.setupStatus, repsCount: 2 } }));
    expect(complete).toContain("Team invited · Complete");
    expect(complete).not.toContain('href="/settings/people"');
  });

  it("puts dashboard attention before summary and hides unavailable action targets", () => {
    const html = renderToStaticMarkup(createElement(DashboardWorkspace, { badges: [], executiveDashboard: null, isExecutive: false, isManager: true, managerDashboard: null, repDashboard: null, setupStatus: null, canUpload: false, canTrain: false, canPractice: false, canBrand: false }));
    expect(html.indexOf('data-dashboard-queue-table="true"')).toBeLessThan(html.indexOf('data-dashboard-summary="true"'));
    expect(html).not.toContain('href="/upload"');
    expect(html).not.toContain('href="/training"');
    expect(html).not.toContain('href="/roleplay"');
    expect(html).not.toContain('href="/settings/branding"');
    expect(html).not.toContain('data-dashboard-queue-row="selected"');
  });
});

describe("Calls workspace query", () => {
  it("preserves search and sort when changing the saved view or page", () => {
    const query = getCallsWorkspaceQuery({ search: "budget", status: "complete", maxScore: "79", sort: "createdAt:asc", offset: "20" }, true, 42);
    expect(query.page).toBe(1);
    expect(query.totalPages).toBe(3);
    expect(query.views.find((view) => view.label === "Needs review")?.active).toBe(true);
    expect(query.nextHref).toContain("search=budget");
    expect(query.nextHref).toContain("offset=40");
    expect(query.previousHref).not.toContain("offset=20");
    expect(query.hasActiveFilters).toBe(true);
  });
  it("discards score filters and sorting without scoring permission", () => {
    const query = getCallsWorkspaceQuery({ minScore: "85", sort: "overallScore:desc" }, false);
    expect(query.filters.minScore).toBeUndefined();
    expect(query.filters.sortBy).toBe("createdAt");
    expect(query.views.map((view) => view.label)).toEqual(["All recordings", "Processing", "Ready", "Needs attention"]);
    expect(query.nextHref).not.toContain("minScore");
    expect(query.nextHref).not.toContain("overallScore");
  });
});
