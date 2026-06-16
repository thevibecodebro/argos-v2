import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createUsersRepository = vi.fn();
const createTeamAccessRepository = vi.fn();
const createEffectiveTenantUsersRepository = vi.fn();
const createEffectiveTenantTeamAccessRepository = vi.fn();
const listOrganizationMembers = vi.fn();
const createTeam = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/team-access/create-repository", () => ({
  createTeamAccessRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantUsersRepository,
  createEffectiveTenantTeamAccessRepository,
}));

vi.mock("@/lib/users/service", () => ({
  listOrganizationMembers,
}));

vi.mock("@/lib/team-access/service", () => ({
  createTeam,
}));

describe("platform effective tenant settings routes", () => {
  const rawUsersRepository = { name: "raw-users-repository" };
  const effectiveUsersRepository = { name: "effective-users-repository" };
  const rawTeamAccessRepository = { name: "raw-team-access-repository" };
  const effectiveTeamAccessRepository = { name: "effective-team-access-repository" };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createUsersRepository.mockReset();
    createTeamAccessRepository.mockReset();
    createEffectiveTenantUsersRepository.mockReset();
    createEffectiveTenantTeamAccessRepository.mockReset();
    listOrganizationMembers.mockReset();
    createTeam.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "staff-1" });
    createUsersRepository.mockReturnValue(rawUsersRepository);
    createTeamAccessRepository.mockReturnValue(rawTeamAccessRepository);
    createEffectiveTenantUsersRepository.mockResolvedValue(effectiveUsersRepository);
    createEffectiveTenantTeamAccessRepository.mockResolvedValue(effectiveTeamAccessRepository);
    listOrganizationMembers.mockResolvedValue({ ok: true, data: [] });
    createTeam.mockResolvedValue({
      ok: true,
      data: { id: "team-1", name: "Inbound", description: null, status: "active" },
    });
  });

  it("lists organization members with the launched organization context", async () => {
    const route = await import("../app/api/organizations/members/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(createEffectiveTenantUsersRepository).toHaveBeenCalledWith(
      rawUsersRepository,
      "staff-1",
    );
    expect(listOrganizationMembers).toHaveBeenCalledWith(
      effectiveUsersRepository,
      "staff-1",
    );
  });

  it("creates teams with the launched organization context", async () => {
    const route = await import("../app/api/teams/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/teams", {
        body: JSON.stringify({ name: "Inbound", description: null }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(createEffectiveTenantTeamAccessRepository).toHaveBeenCalledWith(
      rawTeamAccessRepository,
      "staff-1",
    );
    expect(createTeam).toHaveBeenCalledWith(effectiveTeamAccessRepository, "staff-1", {
      name: "Inbound",
      description: null,
    });
  });
});
