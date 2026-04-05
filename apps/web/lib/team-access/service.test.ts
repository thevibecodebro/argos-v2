import { describe, expect, it, vi } from "vitest";
import {
  assignPrimaryManager,
  createTeam,
  setManagerPermissionPreset,
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
  replaceManagerTeamPermissionGrants: vi
    .fn()
    .mockResolvedValue(["view_team_calls", "coach_team_calls", "view_team_analytics"]),
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
});
