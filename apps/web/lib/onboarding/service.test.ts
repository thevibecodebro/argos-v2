import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOrganizationForUser,
  joinOrganizationForUser,
  type OnboardingRepository,
} from "./service";

function createRepository(
  overrides: Partial<OnboardingRepository> = {},
): OnboardingRepository {
  return {
    assignUserToOrganization: vi.fn().mockResolvedValue(true),
    createBootstrapOrganizationForUserIfNone: vi.fn(),
    createOrganizationForUser: vi.fn(),
    createOrganization: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findOrganizationBySlug: vi.fn(),
    ...overrides,
  };
}

describe("createOrganizationForUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks organization creation by default when the user is not a bootstrap admin", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
    });

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "Argos",
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Organization creation requires an invite",
    });
    expect(repository.createOrganization).not.toHaveBeenCalled();
    expect(repository.assignUserToOrganization).not.toHaveBeenCalled();
  });

  it("blocks uninvited organization creation before validating organization input", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
    });

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "",
      slug: "Invalid Slug",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Organization creation requires an invite",
    });
    expect(repository.createBootstrapOrganizationForUserIfNone).not.toHaveBeenCalled();
    expect(repository.createOrganization).not.toHaveBeenCalled();
  });

  it("allows a bootstrap admin to create an organization when invite-only is enabled", async () => {
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "OWNER@ARGOS.ai, admin@argos.ai");

    const repository = createRepository({
      createBootstrapOrganizationForUserIfNone: vi.fn().mockResolvedValue({
        status: "created",
        organization: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      }),
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "owner@argos.ai",
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

    expect(result.ok).toBe(true);
    expect(repository.createBootstrapOrganizationForUserIfNone).toHaveBeenCalledWith({
      name: "Argos",
      slug: "argos",
      plan: "trial",
      userId: "user-1",
    });
    expect(repository.createOrganization).not.toHaveBeenCalled();
    expect(repository.assignUserToOrganization).not.toHaveBeenCalled();
  });

  it("blocks a bootstrap admin from creating another organization after bootstrap", async () => {
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "owner@argos.ai");

    const repository = createRepository({
      createBootstrapOrganizationForUserIfNone: vi.fn().mockResolvedValue({
        status: "organization-exists",
      }),
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "owner@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
      findOrganizationBySlug: vi.fn().mockResolvedValue(null),
    });

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "Second Argos",
      slug: "second-argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Bootstrap organization already exists",
    });
    expect(repository.createBootstrapOrganizationForUserIfNone).toHaveBeenCalledWith({
      name: "Second Argos",
      slug: "second-argos",
      plan: "trial",
      userId: "user-1",
    });
    expect(repository.createOrganization).not.toHaveBeenCalled();
    expect(repository.assignUserToOrganization).not.toHaveBeenCalled();
  });

  it("returns conflict when atomic bootstrap finds the user was already claimed", async () => {
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "owner@argos.ai");

    const repository = createRepository({
      createBootstrapOrganizationForUserIfNone: vi.fn().mockResolvedValue({
        status: "user-claimed",
      }),
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "owner@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
    });

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "Argos",
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "User already belongs to an organization",
    });
    expect(repository.createBootstrapOrganizationForUserIfNone).toHaveBeenCalledWith({
      name: "Argos",
      slug: "argos",
      plan: "trial",
      userId: "user-1",
    });
    expect(repository.assignUserToOrganization).not.toHaveBeenCalled();
    expect(repository.createOrganization).not.toHaveBeenCalled();
  });

  it("creates an organization and assigns the current user as admin atomically when invite-only is disabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

    const repository = createRepository({
      createOrganizationForUser: vi.fn().mockResolvedValue({
        status: "created",
        organization: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      }),
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
    expect(repository.createOrganizationForUser).toHaveBeenCalledWith({
      name: "Argos",
      slug: "argos",
      plan: "trial",
      userId: "user-1",
    });
    expect(repository.createOrganization).not.toHaveBeenCalled();
    expect(repository.assignUserToOrganization).not.toHaveBeenCalled();
  });

  it("uses atomic organization creation when invite-only is disabled and the user claim races", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

    const atomicCreateOrganizationForUser = vi.fn().mockResolvedValue({
      status: "user-claimed",
    });
    const createOrganization = vi.fn().mockResolvedValue({
      id: "org-1",
      name: "Argos",
      slug: "argos",
      plan: "trial",
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    const assignUserToOrganization = vi.fn().mockResolvedValue(false);
    const repository = {
      ...createRepository({
        assignUserToOrganization,
        createOrganization,
        findCurrentUserByAuthId: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "user@argos.ai",
          role: null,
          firstName: "Jared",
          lastName: "Newman",
          org: null,
        }),
        findOrganizationBySlug: vi.fn().mockResolvedValue(null),
      }),
      createOrganizationForUser: atomicCreateOrganizationForUser,
    } as OnboardingRepository & {
      createOrganizationForUser: typeof atomicCreateOrganizationForUser;
    };

    const result = await createOrganizationForUser(repository, "user-1", {
      name: "Argos",
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "User already belongs to an organization",
    });
    expect(atomicCreateOrganizationForUser).toHaveBeenCalledWith({
      name: "Argos",
      slug: "argos",
      plan: "trial",
      userId: "user-1",
    });
    expect(createOrganization).not.toHaveBeenCalled();
    expect(assignUserToOrganization).not.toHaveBeenCalled();
  });

  it("rejects duplicate organization slugs", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks organization joins by default", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
    });

    const result = await joinOrganizationForUser(repository, "user-1", {
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Organization joins require an invite",
    });
    expect(repository.findOrganizationBySlug).not.toHaveBeenCalled();
    expect(repository.assignUserToOrganization).not.toHaveBeenCalled();
  });

  it("joins an existing organization as a rep when invite-only is disabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

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

  it("keeps invite-only enabled when ARGOS_INVITE_ONLY is uppercase FALSE", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "FALSE");

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
    });

    const result = await joinOrganizationForUser(repository, "user-1", {
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Organization joins require an invite",
    });
    expect(repository.findOrganizationBySlug).not.toHaveBeenCalled();
  });

  it("keeps invite-only enabled when ARGOS_INVITE_ONLY has surrounding spaces", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", " false ");

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@argos.ai",
        role: null,
        firstName: "Jared",
        lastName: "Newman",
        org: null,
      }),
    });

    const result = await joinOrganizationForUser(repository, "user-1", {
      slug: "argos",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Organization joins require an invite",
    });
    expect(repository.findOrganizationBySlug).not.toHaveBeenCalled();
  });

  it("rejects missing organizations", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

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

  it("returns conflict when the user was claimed before joining", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

    const repository = createRepository({
      assignUserToOrganization: vi.fn().mockResolvedValue(false),
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
      ok: false,
      status: 409,
      error: "User already belongs to an organization",
    });
  });
});
