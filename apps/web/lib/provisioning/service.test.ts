import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteOnlyProvisioningError } from "./invite-only";
import { ensureUserProvisioned, type ProvisioningRepository } from "./service";

function createRepository(
  overrides: Partial<ProvisioningRepository> = {},
): ProvisioningRepository {
  return {
    findUserById: vi.fn(),
    findPendingInviteByEmail: vi.fn(),
    createUser: vi.fn(),
    ...overrides,
  };
}

describe("ensureUserProvisioned", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the existing user when already provisioned", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue({
        id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
        orgId: "50f0bd60-3d09-4d59-a1a6-a0bc8d3a53e9",
        email: "rep@argos.ai",
        role: "admin",
      }),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: "rep@argos.ai",
      user_metadata: {},
    });

    expect(result).toEqual({
      userId: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: "50f0bd60-3d09-4d59-a1a6-a0bc8d3a53e9",
      created: false,
    });
    expect(repository.findPendingInviteByEmail).not.toHaveBeenCalled();
  });

  it("returns an existing user without an org so onboarding can continue", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue({
        id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
        orgId: null,
        email: "rep@argos.ai",
        role: null,
      }),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: "rep@argos.ai",
      user_metadata: {},
    });

    expect(result).toEqual({
      userId: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: null,
      created: false,
    });
    expect(repository.findPendingInviteByEmail).not.toHaveBeenCalled();
  });

  it("creates only the user record on first login so onboarding can assign the org later", async () => {
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: "rep@argos.ai",
      user_metadata: {
        first_name: "Rep",
        last_name: "Riley",
        full_name: "Rep Riley",
      },
    });

    expect(result).toEqual({
      userId: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: null,
      created: true,
    });

    expect(repository.createUser).toHaveBeenCalledWith({
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: null,
      email: "rep@argos.ai",
      role: null,
      firstName: "Rep",
      lastName: "Riley",
      displayNameSet: true,
    });
  });

  it("blocks first-time users without an invite when invite-only provisioning is enabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      findPendingInviteByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      ensureUserProvisioned(repository, {
        id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
        email: "  Rep@Argos.AI  ",
        user_metadata: {},
      }),
    ).rejects.toEqual(new InviteOnlyProvisioningError("rep@argos.ai"));

    expect(repository.findPendingInviteByEmail).toHaveBeenCalledWith(
      "rep@argos.ai",
    );
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it("allows first-time invited users when invite-only provisioning is enabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      findPendingInviteByEmail: vi.fn().mockResolvedValue({
        id: "invite-1",
        orgId: "50f0bd60-3d09-4d59-a1a6-a0bc8d3a53e9",
        email: "rep@argos.ai",
      }),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: "  Rep@Argos.AI  ",
      user_metadata: {
        first_name: "Rep",
      },
    });

    expect(result).toEqual({
      userId: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: null,
      created: true,
    });
    expect(repository.findPendingInviteByEmail).toHaveBeenCalledWith(
      "rep@argos.ai",
    );
    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "rep@argos.ai",
      }),
    );
  });

  it("allows bootstrap admins without an invite", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "true");
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "owner@argos.ai");
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      findPendingInviteByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(undefined),
    });

    const result = await ensureUserProvisioned(repository, {
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      email: " Owner@Argos.AI ",
      user_metadata: {},
    });

    expect(result).toEqual({
      userId: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: null,
      created: true,
    });
    expect(repository.findPendingInviteByEmail).not.toHaveBeenCalled();
  });

  it("rejects users without an email address", async () => {
    const repository = createRepository();

    await expect(
      ensureUserProvisioned(repository, {
        id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
        email: undefined,
        user_metadata: {},
      }),
    ).rejects.toThrow("Supabase user is missing an email address");
  });
});
