import { describe, expect, it, vi } from "vitest";
import {
  createOrganizationForUser,
  joinOrganizationForUser,
  type OnboardingRepository,
} from "./service";

function createRepository(
  overrides: Partial<OnboardingRepository> = {},
): OnboardingRepository {
  return {
    assignUserToOrganization: vi.fn(),
    createOrganization: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findOrganizationBySlug: vi.fn(),
    ...overrides,
  };
}

describe("createOrganizationForUser", () => {
  it("creates an organization and assigns the current user as admin", async () => {
    const repository = createRepository({
      createOrganization: vi.fn().mockResolvedValue({
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "trial",
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
      findOrganizationBySlug: vi.fn().mockResolvedValue(null),
    });

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "Argos",
      slug: "argos",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "trial",
        createdAt: "2026-04-03T00:00:00.000Z",
      },
    });
    expect(repository.assignUserToOrganization).toHaveBeenCalledWith({
      orgId: "org-1",
      role: "admin",
      userId: "user-1",
    });
  });

  it("rejects duplicate organization slugs", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: null,
        lastName: null,
        org: null,
      }),
      findOrganizationBySlug: vi.fn().mockResolvedValue({
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "trial",
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "Another Argos",
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Organization slug already taken",
    });
  });
});

describe("joinOrganizationForUser", () => {
  it("joins an existing organization as a rep", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
      findOrganizationBySlug: vi.fn().mockResolvedValue({
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "trial",
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await joinOrganizationForUser(repository, "user-1", {
      slug: "argos",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "org-1",
        name: "Argos",
        slug: "argos",
        plan: "trial",
        createdAt: "2026-04-03T00:00:00.000Z",
      },
    });
    expect(repository.assignUserToOrganization).toHaveBeenCalledWith({
      orgId: "org-1",
      role: "rep",
      userId: "user-1",
    });
  });

  it("rejects missing organizations", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
      findOrganizationBySlug: vi.fn().mockResolvedValue(null),
    });

    const result = await joinOrganizationForUser(repository, "user-1", {
      slug: "missing-org",
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "Organization not found",
    });
  });
});
