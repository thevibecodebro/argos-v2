import { describe, expect, it } from "vitest";
import {
  repManagerAssignmentsTable,
  teamMembershipsTable,
  teamPermissionGrantsTable,
  teamsTable,
} from "@argos-v2/db";

describe("team access schema exports", () => {
  it("exports the new access tables", () => {
    expect(teamsTable).toBeTruthy();
    expect(teamMembershipsTable).toBeTruthy();
    expect(repManagerAssignmentsTable).toBeTruthy();
    expect(teamPermissionGrantsTable).toBeTruthy();
  });
});
