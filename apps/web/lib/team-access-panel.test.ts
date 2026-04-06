import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamAccessPanel } from "../components/settings/team-access-panel";

describe("TeamAccessPanel", () => {
  it("renders teams, manager presets, and primary manager controls", () => {
    const html = renderToStaticMarkup(
      createElement(TeamAccessPanel, {
        canManage: true,
        teams: [{ id: "team-a", name: "Closers", description: null, status: "active" }],
        managers: [{ id: "mgr-1", name: "Morgan Lane" }],
        memberships: [
          { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
          { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        ],
        reps: [{ id: "rep-1", name: "Riley Stone", primaryManagerId: "mgr-1" }],
      }),
    );

    expect(html).toContain("Team Access");
    expect(html).toContain("Closers");
    expect(html).toContain("Primary manager");
    expect(html).toContain("Coach");
    expect(html).toContain("Create team");
    expect(html).toContain("Add manager");
  });
});
