import { describe, expect, it, vi } from "vitest";
import { ensureUserProvisioned, type ProvisioningRepository } from "./service";

function createRepository(
  overrides: Partial<ProvisioningRepository> = {},
): ProvisioningRepository {
  return {
    findUserById: vi.fn(),
    createOrganization: vi.fn(),
    createUser: vi.fn(),
    ...overrides,
  };
}

describe("ensureUserProvisioned", () => {
  it("returns the existing user when already provisioned", async () => {
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
  });

  it("creates an org and admin user on first login", async () => {
    const repository = createRepository({
      findUserById: vi.fn().mockResolvedValue(null),
      createOrganization: vi.fn().mockResolvedValue({
        id: "50f0bd60-3d09-4d59-a1a6-a0bc8d3a53e9",
      }),
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
      orgId: "50f0bd60-3d09-4d59-a1a6-a0bc8d3a53e9",
      created: true,
    });

    expect(repository.createOrganization).toHaveBeenCalledWith({
      name: "Rep Riley's Team",
      slug: expect.stringMatching(/^rep-riley-/),
      plan: "trial",
    });

    expect(repository.createUser).toHaveBeenCalledWith({
      id: "7f9cf8d3-0e1b-449b-aa26-8ebbbfd0843a",
      orgId: "50f0bd60-3d09-4d59-a1a6-a0bc8d3a53e9",
      email: "rep@argos.ai",
      role: "admin",
      firstName: "Rep",
      lastName: "Riley",
      displayNameSet: true,
    });
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
