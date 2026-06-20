import { describe, expect, it } from "vitest";
import { getVisibleNavGroups, navGroups } from "../components/app-navigation";

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
});
