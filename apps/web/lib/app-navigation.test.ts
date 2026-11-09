import { describe, expect, it } from "vitest";
import { normalizeManagedCapabilities, type EffectiveOrganizationCapabilities, type ManagedCapabilityKey } from "@/lib/access/managed-capabilities";

function managed(...capabilities: ManagedCapabilityKey[]): EffectiveOrganizationCapabilities {
  return { capabilities, grantId: "test-grant", mode: "managed", version: 1 };
}
import {
  getVisibleBottomTabs,
  getVisibleNavGroups,
  navGroups,
  isBottomTabActive,
  getBottomTabLayout,
  isNavigationRouteActive,
} from "../components/app-navigation";

describe("getVisibleNavGroups", () => {
  it("shows Review, Coach, People and System to managers", () => {
    const labels = getVisibleNavGroups("manager").map((group) => group.label);
    expect(labels).toEqual(["Review", "Coach", "People", "System"]);
  });

  it("hides the People group from reps", () => {
    const labels = getVisibleNavGroups("rep").map((group) => group.label);
    expect(labels).toEqual(["Review", "Coach", "System"]);
    expect(labels).not.toContain("People");
  });

  it("exposes notifications and settings through the System group", () => {
    const system = navGroups.find((group) => group.label === "System");
    expect(system?.items.map((item) => item.href)).toEqual([
      "/notifications",
      "/settings",
    ]);
  });

  it("shows only enabled managed features and hides call-performance navigation", () => {
    const access = {
      capabilities: ["training", "roleplay", "roleplay_voice", "practice_reporting", "workspace_branding"],
      grantId: "grant-1",
      mode: "managed" as const,
      version: 1,
    } satisfies import("@/lib/access/managed-capabilities").EffectiveOrganizationCapabilities;
    const items = getVisibleNavGroups("manager", access).flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect(items).toContain("/training");
    expect(items).toContain("/roleplay");
    expect(items).toContain("/settings");
    expect(items).not.toContain("/dashboard");
    expect(items).not.toContain("/team");
    expect(items).not.toContain("/calls");
    expect(items).not.toContain("/highlights");
    expect(items).not.toContain("/leaderboard");
    expect(getVisibleBottomTabs(access).map((item) => item.href)).toEqual([
      "/training",
      "/settings",
    ]);
  });

  it("preserves the current navigation for legacy organizations", () => {
    const access = {
      capabilities: [],
      grantId: null,
      mode: "legacy" as const,
      version: null,
    };

    expect(getVisibleBottomTabs(access)).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "/upload" }),
    ]));
    expect(getVisibleNavGroups("manager", access).flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: "/calls" })]),
    );
  });
  it("gates analytics destinations separately from call scoring", () => {
    const scoring = managed("call_upload", "call_scoring");
    expect(normalizeManagedCapabilities(scoring.capabilities).ok).toBe(true);
    const scoringLinks = getVisibleNavGroups("manager", scoring).flatMap((group) => group.items.map((item) => item.href));
    expect(scoringLinks).toContain("/calls");
    expect(scoringLinks).not.toContain("/dashboard");
    expect(scoringLinks).not.toContain("/team");
    expect(getVisibleBottomTabs(scoring).map((tab) => tab.href)).not.toContain("/dashboard");
    const analytics = managed("call_upload", "call_scoring", "call_analytics");
    expect(normalizeManagedCapabilities(analytics.capabilities).ok).toBe(true);
    expect(getVisibleNavGroups("manager", analytics).flatMap((group) => group.items.map((item) => item.href))).toEqual(expect.arrayContaining(["/dashboard", "/calls", "/team"]));
    expect(getVisibleBottomTabs(analytics).map((tab) => tab.href)).toContain("/dashboard");
    expect(getVisibleNavGroups("rep", analytics).flatMap((group) => group.items.map((item) => item.href))).not.toContain("/team");
  });

  it.each(["call_upload", "call_ingestion"] as const)("shows Calls for a valid %s-only grant", (capability) => {
    expect(normalizeManagedCapabilities([capability]).ok).toBe(true);
    const access = managed(capability);
    const links = getVisibleNavGroups("manager", access).flatMap((group) => group.items.map((item) => item.href));
    expect(links).toContain("/calls");
    expect(links).not.toContain("/dashboard");
    expect(links).not.toContain("/team");
    const tabs = getVisibleBottomTabs(access).map((tab) => tab.href);
    expect(tabs).toContain("/calls");
    expect(tabs.includes("/upload")).toBe(capability === "call_upload");
    expect(tabs).not.toContain("/dashboard");
  });

  it("keeps Coach available to roleplay-only users and defaults to training when available", () => {
    expect(getVisibleBottomTabs(managed("roleplay")).find((tab) => tab.label === "Coach")?.href).toBe("/roleplay");
    expect(getVisibleBottomTabs(managed("training", "roleplay")).find((tab) => tab.label === "Coach")?.href).toBe("/training");
    expect(getVisibleBottomTabs(managed("training")).find((tab) => tab.label === "Coach")?.href).toBe("/training");
    expect(getVisibleBottomTabs(managed()).find((tab) => tab.label === "Coach")).toBeUndefined();
  });

  it("partitions a four-tab capability set around the Upload center slot", () => {
    const access = managed("call_upload", "call_scoring", "training");
    expect(normalizeManagedCapabilities(access.capabilities).ok).toBe(true);
    const tabs = getVisibleBottomTabs(access);
    expect(tabs.map((tab) => tab.href)).toEqual(["/calls", "/upload", "/training", "/settings"]);
    const layout = getBottomTabLayout(tabs);
    expect(layout.before.map((tab) => tab.href)).toEqual(["/calls"]);
    expect(layout.centerTab?.href).toBe("/upload");
    expect(layout.after.map((tab) => tab.href)).toEqual(["/training", "/settings"]);
    const fullLayout = getBottomTabLayout(getVisibleBottomTabs());
    expect(fullLayout.before).toHaveLength(2);
    expect(fullLayout.after).toHaveLength(2);
    const practiceLayout = getBottomTabLayout(getVisibleBottomTabs(managed("roleplay")));
    expect(practiceLayout.centerTab).toBeNull();
    expect(practiceLayout.before.map((tab) => tab.href)).toEqual(["/roleplay", "/settings"]);
    expect(practiceLayout.after).toEqual([]);
  });

  it("selects Coach across both coaching routes without matching misleading prefixes", () => {
    const coach = getVisibleBottomTabs().find((tab) => tab.label === "Coach")!;
    for (const pathname of ["/training", "/training/builder", "/roleplay", "/roleplay/history"]) expect(isBottomTabActive(pathname, coach)).toBe(true);
    for (const pathname of ["/training-ground", "/roleplays", "/calls"]) expect(isBottomTabActive(pathname, coach)).toBe(false);
    expect(isNavigationRouteActive("/calls/123", "/calls")).toBe(true);
    expect(isNavigationRouteActive("/calls-archive", "/calls")).toBe(false);
  });

});
