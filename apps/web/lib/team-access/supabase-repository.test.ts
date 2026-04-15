import { describe, expect, it } from "vitest";
import { SupabaseTeamAccessRepository } from "./supabase-repository";

function createQueryResult(data: unknown) {
  const result = { data, error: null };

  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    then(resolve: (value: typeof result) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  };
}

describe("SupabaseTeamAccessRepository", () => {
  it("hydrates memberships, primary managers, and grants from the correct tables", async () => {
    const supabase = {
      from(table: string) {
        switch (table) {
          case "teams":
            return createQueryResult([
              { id: "team-a", name: "Closers", description: "Sales pod", status: "active" },
            ]);
          case "users":
            return {
              select() {
                return this;
              },
              eq(_field: string, value: string) {
                if (value === "manager") {
                  return createQueryResult([
                    {
                      id: "mgr-1",
                      first_name: "Morgan",
                      last_name: "Lane",
                      email: "morgan@example.com",
                    },
                  ]);
                }

                if (value === "rep") {
                  return createQueryResult([
                    {
                      id: "rep-1",
                      first_name: "Riley",
                      last_name: "Stone",
                      email: "riley@example.com",
                    },
                  ]);
                }

                return this;
              },
              order() {
                return this;
              },
              then(resolve: (value: { data: unknown; error: null }) => unknown) {
                return Promise.resolve({ data: [], error: null }).then(resolve);
              },
            };
          case "rep_manager_assignments":
            return createQueryResult([{ rep_id: "rep-1", manager_id: "mgr-1" }]);
          case "team_memberships":
            return createQueryResult([
              { team_id: "team-a", user_id: "mgr-1", membership_type: "manager" },
              { team_id: "team-a", user_id: "rep-1", membership_type: "rep" },
            ]);
          case "team_permission_grants":
            return createQueryResult([
              { team_id: "team-a", user_id: "mgr-1", permission_key: "view_team_calls" },
            ]);
          default:
            throw new Error(`Unexpected table: ${table}`);
        }
      },
    };

    const repository = new SupabaseTeamAccessRepository(supabase as never);
    const snapshot = await repository.findTeamAccessSnapshot("org-1");

    expect(snapshot.memberships).toEqual([
      { teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
      { teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ]);
    expect(snapshot.reps).toEqual([
      { id: "rep-1", name: "Riley Stone", primaryManagerId: "mgr-1" },
    ]);
    expect(snapshot.grants).toEqual([
      { teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_calls" },
    ]);
  });
});
