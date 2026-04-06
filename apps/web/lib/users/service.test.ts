import { describe, expect, it, vi } from "vitest";
import {
  getCurrentUserDetails,
  listOrganizationMembers,
  removeOrganizationMember,
  updateCurrentUserProfile,
  updateOrganizationMemberRole,
  type UsersRepository,
} from "./service";

function createRepository(
  overrides: Partial<UsersRepository> = {},
): UsersRepository {
  return {
    findCurrentUserByAuthId: vi.fn(),
    findOrganizationMember: vi.fn(),
    findOrganizationMembers: vi.fn(),
    removeOrganizationMember: vi.fn(),
    updateCurrentUserProfile: vi.fn(),
    updateOrganizationMemberRole: vi.fn(),
    ...overrides,
  };
}

const adminUser = {
  id: "user-1",
  email: "jared@argos.ai",
  firstName: "Jared",
  lastName: "Newman",
  profileImageUrl: null,
  role: "admin" as const,
  orgId: "org-1",
  displayNameSet: true,
  org: {
    id: "org-1",
    name: "Argos",
    slug: "argos",
    plan: "trial",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
  },
};

describe("getCurrentUserDetails", () => {
  it("serializes the archived current-user payload", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    const result = await getCurrentUserDetails(repository, "user-1");

    expect(result).toEqual({
      ok: true,
      data: {
        id: "user-1",
        email: "jared@argos.ai",
        firstName: "Jared",
        lastName: "Newman",
        profileImageUrl: null,
        role: "admin",
        orgId: "org-1",
        displayNameSet: true,
        org: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: "2026-04-03T00:00:00.000Z",
        },
      },
    });
  });
});

describe("updateCurrentUserProfile", () => {
  it("trims names and persists displayNameSet", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      updateCurrentUserProfile: vi.fn().mockResolvedValue({
        ...adminUser,
        firstName: "Jared",
        lastName: "Lane",
      }),
    });

    const result = await updateCurrentUserProfile(repository, "user-1", {
      firstName: "  Jared  ",
      lastName: " Lane ",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "user-1",
        email: "jared@argos.ai",
        firstName: "Jared",
        lastName: "Lane",
        profileImageUrl: null,
        role: "admin",
        orgId: "org-1",
        displayNameSet: true,
        org: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: "2026-04-03T00:00:00.000Z",
        },
      },
    });
    expect(repository.updateCurrentUserProfile).toHaveBeenCalledWith("user-1", {
      displayNameSet: true,
      firstName: "Jared",
      lastName: "Lane",
    });
  });
});

describe("listOrganizationMembers", () => {
  it("rejects reps from listing org members", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        role: "rep",
      }),
    });

    const result = await listOrganizationMembers(repository, "user-1");

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("rejects managers from listing the org roster", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        role: "manager",
      }),
    });

    const result = await listOrganizationMembers(repository, "user-1");

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("returns the org member roster for org-wide roles", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        role: "executive",
      }),
      findOrganizationMembers: vi.fn().mockResolvedValue([
        {
          id: "user-2",
          email: "rep@argos.ai",
          firstName: "Riley",
          lastName: "Stone",
          profileImageUrl: null,
          role: "rep",
          callCount: 3,
          joinedAt: new Date("2026-04-01T00:00:00.000Z"),
          primaryManagerId: "manager-1",
        },
      ]),
    });

    const result = await listOrganizationMembers(repository, "user-1");

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "user-2",
          email: "rep@argos.ai",
          firstName: "Riley",
          lastName: "Stone",
          profileImageUrl: null,
          role: "rep",
          callCount: 3,
          joinedAt: "2026-04-01T00:00:00.000Z",
          primaryManagerId: "manager-1",
        },
      ],
    });
  });
});

describe("updateOrganizationMemberRole", () => {
  it("allows admins to update member roles", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      findOrganizationMember: vi.fn().mockResolvedValue({
        id: "user-2",
        orgId: "org-1",
        role: "rep",
      }),
      updateOrganizationMemberRole: vi.fn().mockResolvedValue({
        id: "user-2",
        role: "manager",
      }),
    });

    const result = await updateOrganizationMemberRole(repository, "user-1", "user-2", {
      role: "manager",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "user-2",
        role: "manager",
      },
    });
  });

  it("rejects non-admin role changes", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        role: "manager",
      }),
    });

    const result = await updateOrganizationMemberRole(repository, "user-1", "user-2", {
      role: "manager",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Only admins can change member roles",
    });
  });
});

describe("removeOrganizationMember", () => {
  it("blocks self-removal", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    const result = await removeOrganizationMember(repository, "user-1", "user-1");

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "You cannot remove yourself from the organization",
    });
  });

  it("removes another member from the org", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      findOrganizationMember: vi.fn().mockResolvedValue({
        id: "user-2",
        orgId: "org-1",
        role: "rep",
      }),
      removeOrganizationMember: vi.fn().mockResolvedValue(true),
    });

    const result = await removeOrganizationMember(repository, "user-1", "user-2");

    expect(result).toEqual({
      ok: true,
      data: { success: true },
    });
    expect(repository.removeOrganizationMember).toHaveBeenCalledWith("user-2", "org-1");
  });
});
