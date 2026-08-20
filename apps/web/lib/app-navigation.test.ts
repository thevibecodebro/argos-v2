import { describe, expect, it } from "vitest";
import {
  getVisibleBottomTabs,
  getVisibleNavGroups,
  navGroups,
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
});
