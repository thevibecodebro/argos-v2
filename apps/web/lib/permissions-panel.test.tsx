import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  PermissionsPanel,
  applyTeamPresetRequest,
  assignPrimaryManagerRequest,
} from "../components/settings/permissions-panel";

const presets = [
  {
    id: "Coach",
    name: "Coach",
    role: "manager",
    permissions: ["view_team_calls", "coach_team_calls", "view_team_analytics"],
  },
  {
    id: "Training Manager",
    name: "Training Manager",
    role: "manager",
    permissions: ["view_team_training", "manage_team_training", "view_team_analytics"],
  },
];

const teams = [
  {
    id: "team-a",
    name: "Closers",
    description: "Sales pod",
    status: "active",
  },
];

const memberships = [
  {
    teamId: "team-a",
    userId: "mgr-1",
    membershipType: "manager" as const,
  },
];

const managers = [
  {
    id: "mgr-1",
    name: "Morgan Lane",
  },
  {
    id: "mgr-2",
    name: "Jordan Lee",
  },
];

const reps = [
  {
    id: "rep-1",
    name: "Riley Stone",
    primaryManagerId: "mgr-1",
  },
];

const grants = [
  {
    teamId: "team-a",
    userId: "mgr-1",
    permissionKey: "view_team_calls" as const,
  },
  {
    teamId: "team-a",
    userId: "mgr-1",
    permissionKey: "coach_team_calls" as const,
  },
  {
    teamId: "team-a",
    userId: "mgr-1",
    permissionKey: "view_team_analytics" as const,
  },
];

describe("PermissionsPanel", () => {
  it("renders team preset assignments alongside rep primary manager controls", () => {
    const html = renderToStaticMarkup(
      createElement(PermissionsPanel, {
        grants,
        managers,
        memberships,
        presets,
        reps,
        teams,
      }),
    );

    expect(html).toContain("Team Preset Assignments");
    expect(html).toContain("Closers");
    expect(html).toContain("Morgan Lane");
    expect(html).toContain("Coach");
    expect(html).toContain("Primary Manager");
  });

  it("assigns a rep primary manager through the organization API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ managerId: "mgr-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      assignPrimaryManagerRequest(fetchMock as typeof fetch, "rep-1", "mgr-1"),
    ).resolves.toEqual({
      ok: true,
      data: { managerId: "mgr-1" },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/organizations/members/rep-1/primary-manager", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: "mgr-1" }),
    });
  });

  it("applies a manager preset through the team grants API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ grants: ["view_team_calls"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      applyTeamPresetRequest(fetchMock as typeof fetch, "team-a", "mgr-1", "Coach"),
    ).resolves.toEqual({
      ok: true,
      data: { grants: ["view_team_calls"] },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/teams/team-a/grants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: "mgr-1", preset: "Coach" }),
    });
  });
});
