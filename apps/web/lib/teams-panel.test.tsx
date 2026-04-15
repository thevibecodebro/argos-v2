import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  TeamsPanel,
  addTeamMembershipRequest,
  createTeamRequest,
  removeTeamMembershipRequest,
  updateTeamRequest,
} from "../components/settings/teams-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const teams = [
  {
    id: "team-a",
    name: "Closers",
    description: "Sales pod",
    status: "active" as const,
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
  },
  {
    id: "rep-2",
    name: "Avery Chen",
  },
];

const memberships = [
  {
    teamId: "team-a",
    userId: "mgr-1",
    membershipType: "manager" as const,
  },
  {
    teamId: "team-a",
    userId: "rep-1",
    membershipType: "rep" as const,
  },
];

describe("TeamsPanel", () => {
  it("renders an explicit team editor without the derived primary manager framing", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsPanel, {
        teams,
        managers,
        reps,
        memberships,
      }),
    );

    expect(html).toContain("Create team");
    expect(html).toContain("Team name");
    expect(html).toContain("Status");
    expect(html).toContain("Managers");
    expect(html).toContain("Reps");
    expect(html).toContain("/settings/permissions");
    expect(html).not.toContain("Primary Manager");
  });

  it("creates teams through the teams API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "team-b", name: "New Team", description: null, status: "active" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(createTeamRequest(fetchMock as typeof fetch, { name: "New Team", description: "" })).resolves.toEqual({
      ok: true,
      data: { id: "team-b", name: "New Team", description: null, status: "active" },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Team", description: "" }),
    });
  });

  it("updates team metadata through the team PATCH API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "team-a", name: "Closers", description: "Updated", status: "archived" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      updateTeamRequest(fetchMock as typeof fetch, "team-a", {
        name: "Closers",
        description: "Updated",
        status: "archived",
      }),
    ).resolves.toEqual({
      ok: true,
      data: { id: "team-a", name: "Closers", description: "Updated", status: "archived" },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/teams/team-a", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Closers",
        description: "Updated",
        status: "archived",
      }),
    });
  });

  it("adds managers and reps to a team through the membership API", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );

    await addTeamMembershipRequest(fetchMock as typeof fetch, "team-a", {
      userId: "mgr-2",
      membershipType: "manager",
    });
    await addTeamMembershipRequest(fetchMock as typeof fetch, "team-a", {
      userId: "rep-2",
      membershipType: "rep",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/teams/team-a/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "mgr-2", membershipType: "manager" }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/teams/team-a/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "rep-2", membershipType: "rep" }),
    });
  });

  it("removes managers and reps from a team through the membership API", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );

    await removeTeamMembershipRequest(fetchMock as typeof fetch, "team-a", {
      userId: "mgr-1",
      membershipType: "manager",
    });
    await removeTeamMembershipRequest(fetchMock as typeof fetch, "team-a", {
      userId: "rep-1",
      membershipType: "rep",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/teams/team-a/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "mgr-1", membershipType: "manager" }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/teams/team-a/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "rep-1", membershipType: "rep" }),
    });
  });
});
