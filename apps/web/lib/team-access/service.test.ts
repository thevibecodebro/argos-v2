import { describe, expect, it, vi } from "vitest";
import {
  addTeamManagerMembership,
  addTeamRepMembership,
  assignPrimaryManager,
  createTeam,
  removeTeamMembership,
  setManagerPermissionPreset,
  updateTeamMetadata,
} from "./service";

const repository = {
  createTeam: vi.fn().mockResolvedValue({
    id: "team-a",
    orgId: "org-1",
    name: "Closers",
    description: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  findCurrentUserByAuthId: vi.fn().mockResolvedValue({
    id: "admin-1",
    email: "owner@argos.ai",
    role: "admin",
    firstName: "Ada",
    lastName: "Owner",
    org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
  }),
  upsertPrimaryManagerAssignment: vi.fn().mockResolvedValue({ repId: "rep-1", managerId: "mgr-1" }),
  findOrganizationUserRole: vi.fn(async (_orgId: string, userId: string) => {
    if (userId === "rep-1") return "rep";
    if (userId === "mgr-1") return "manager";
    return null;
  }),
  replaceManagerTeamPermissionGrants: vi
    .fn()
    .mockResolvedValue(["view_team_calls", "coach_team_calls", "view_team_analytics"]),
  findTeamAccessSnapshot: vi.fn().mockResolvedValue({
    teams: [
      {
        id: "team-a",
        name: "Closers",
        description: "Updated description",
        status: "active",
      },
    ],
    managers: [{ id: "mgr-1", name: "Morgan Lane" }],
    reps: [{ id: "rep-1", name: "Riley Stone", primaryManagerId: "mgr-1" }],
    memberships: [
      { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
      { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ],
  }),
  updateTeam: vi.fn().mockResolvedValue({
    id: "team-a",
    orgId: "org-1",
    name: "Closers",
    description: "Updated description",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  addTeamMembership: vi.fn().mockResolvedValue({
    id: "membership-1",
    orgId: "org-1",
    teamId: "team-a",
    userId: "mgr-1",
    membershipType: "manager",
  }),
  removeTeamMembership: vi.fn().mockResolvedValue(true),
};

describe("team access service", () => {
  it("allows admins to create teams", async () => {
    const result = await createTeam(repository as any, "admin-1", {
      name: "Closers",
      description: "",
    });

    expect(result.ok).toBe(true);
  });

  it("assigns a primary manager of record", async () => {
    const result = await assignPrimaryManager(repository as any, "admin-1", {
      repId: "rep-1",
      managerId: "mgr-1",
    });

    expect(result.ok).toBe(true);
    expect(repository.upsertPrimaryManagerAssignment).toHaveBeenCalledWith("org-1", "rep-1", "mgr-1");
  });

  it("materializes a preset into explicit grants", async () => {
    const result = await setManagerPermissionPreset(repository as any, "admin-1", {
      teamId: "team-a",
      managerId: "mgr-1",
      preset: "Coach",
    });

    expect(result.ok).toBe(true);
    expect(repository.replaceManagerTeamPermissionGrants).toHaveBeenCalled();
  });

  it("rejects assigning a non-manager as primary manager", async () => {
    const result = await assignPrimaryManager(repository as any, "admin-1", {
      repId: "rep-1",
      managerId: "rep-1",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "managerId must belong to a manager",
    });
  });

  it("rejects presets for non-manager users", async () => {
    const result = await setManagerPermissionPreset(repository as any, "admin-1", {
      teamId: "team-a",
      managerId: "rep-1",
      preset: "Coach",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "managerId must belong to a manager",
    });
  });

  it("updates team metadata", async () => {
    const result = await updateTeamMetadata(repository as any, "admin-1", {
      teamId: "team-a",
      name: "Closers",
      description: "Updated description",
      status: "active",
    });

    expect(result.ok).toBe(true);
    expect(repository.updateTeam).toHaveBeenCalledWith("org-1", "team-a", {
      name: "Closers",
      description: "Updated description",
      status: "active",
    });
  });

  it("adds a manager membership to a team", async () => {
    const result = await addTeamManagerMembership(repository as any, "admin-1", {
      teamId: "team-a",
      userId: "mgr-1",
    });

    expect(result.ok).toBe(true);
    expect(repository.addTeamMembership).toHaveBeenCalledWith("org-1", "team-a", "mgr-1", "manager");
  });

  it("adds a rep membership to a team", async () => {
    const result = await addTeamRepMembership(repository as any, "admin-1", {
      teamId: "team-a",
      userId: "rep-1",
    });

    expect(result.ok).toBe(true);
    expect(repository.addTeamMembership).toHaveBeenCalledWith("org-1", "team-a", "rep-1", "rep");
  });

  it("removes a team membership", async () => {
    const result = await removeTeamMembership(repository as any, "admin-1", {
      teamId: "team-a",
      userId: "rep-1",
      membershipType: "rep",
    });

    expect(result.ok).toBe(true);
    expect(repository.removeTeamMembership).toHaveBeenCalledWith("org-1", "team-a", "rep-1", "rep");
  });
});
