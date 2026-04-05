import { describe, expect, it } from "vitest";
import {
  buildAccessContext,
  canActorViewRep,
  canActorUsePermissionForRep,
  canActorDrillIntoLeaderboardRep,
} from "./service";

describe("access service", () => {
  it("allows a manager to view reps on teams where they hold view_team_calls", () => {
    const access = buildAccessContext({
      actor: { id: "mgr-1", role: "manager", orgId: "org-1" },
      memberships: [
        { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        { teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_calls" },
      ],
    });

    expect(canActorViewRep(access, "rep-1")).toBe(true);
    expect(canActorViewRep(access, "rep-2")).toBe(false);
  });

  it("allows leaderboard visibility org-wide but keeps drilldown scoped", () => {
    const access = buildAccessContext({
      actor: { id: "mgr-1", role: "manager", orgId: "org-1" },
      memberships: [
        { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        { teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_analytics" },
      ],
    });

    expect(access.canSeeLeaderboard).toBe(true);
    expect(canActorDrillIntoLeaderboardRep(access, "rep-1")).toBe(true);
    expect(canActorDrillIntoLeaderboardRep(access, "rep-2")).toBe(false);
  });

  it("treats executives as org-wide viewers", () => {
    const access = buildAccessContext({
      actor: { id: "exec-1", role: "executive", orgId: "org-1" },
      memberships: [],
      grants: [],
    });

    expect(canActorViewRep(access, "rep-1")).toBe(true);
    expect(canActorUsePermissionForRep(access, "view_team_calls", "rep-1")).toBe(true);
  });

  it("does not allow a rep to use manager-only permissions for themselves", () => {
    const access = buildAccessContext({
      actor: { id: "rep-1", role: "rep", orgId: "org-1" },
      memberships: [
        { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    expect(canActorUsePermissionForRep(access, "manage_team_roster", "rep-1")).toBe(false);
  });

  it("ignores grants that belong to another manager", () => {
    const access = buildAccessContext({
      actor: { id: "mgr-1", role: "manager", orgId: "org-1" },
      memberships: [
        { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        { teamId: "team-a", userId: "mgr-2", permissionKey: "view_team_calls" },
      ],
    });

    expect(canActorViewRep(access, "rep-1")).toBe(false);
  });
});
