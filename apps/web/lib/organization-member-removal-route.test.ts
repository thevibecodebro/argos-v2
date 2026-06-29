import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createUsersRepository = vi.fn();
const createEffectiveTenantUsersRepository = vi.fn();
const removeOrganizationMember = vi.fn();
const revokerInstance = {
  revokeUserSessions: vi.fn(),
};
const SupabaseAuthSessionRevoker = vi.fn(() => revokerInstance);

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantUsersRepository,
}));

vi.mock("@/lib/users/service", () => ({
  removeOrganizationMember,
  updateOrganizationMemberRole: vi.fn(),
}));

vi.mock("@/lib/users/session-revocation", () => ({
  SupabaseAuthSessionRevoker,
}));

describe("organization member removal route", () => {
  const rawRepository = { name: "raw-users-repository" };
  const effectiveRepository = { name: "effective-users-repository" };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createUsersRepository.mockReset();
    createEffectiveTenantUsersRepository.mockReset();
    removeOrganizationMember.mockReset();
    revokerInstance.revokeUserSessions.mockReset();
    SupabaseAuthSessionRevoker.mockClear();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "admin-1" });
    createUsersRepository.mockReturnValue(rawRepository);
    createEffectiveTenantUsersRepository.mockResolvedValue(effectiveRepository);
    removeOrganizationMember.mockResolvedValue({
      ok: true,
      data: { success: true },
    });
  });

  it("passes reason, ticket, and session revoker to member removal service", async () => {
    const route = await import(
      "../app/api/organizations/members/[userId]/route"
    );

    const response = await route.DELETE(
      new Request("http://localhost:3000/api/organizations/members/user-2", {
        body: JSON.stringify({
          reason: "Employee left customer account",
          ticketId: "SUP-123",
        }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "user-2" }) },
    );

    expect(response.status).toBe(200);
    expect(createEffectiveTenantUsersRepository).toHaveBeenCalledWith(
      rawRepository,
      "admin-1",
    );
    expect(SupabaseAuthSessionRevoker).toHaveBeenCalledTimes(1);
    expect(removeOrganizationMember).toHaveBeenCalledWith(
      effectiveRepository,
      "admin-1",
      "user-2",
      {
        reason: "Employee left customer account",
        ticketId: "SUP-123",
        sessionRevoker: revokerInstance,
      },
    );
  });

  it("accepts an empty JSON delete body", async () => {
    const route = await import(
      "../app/api/organizations/members/[userId]/route"
    );

    const response = await route.DELETE(
      new Request("http://localhost:3000/api/organizations/members/user-2", {
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "user-2" }) },
    );

    expect(response.status).toBe(200);
    expect(removeOrganizationMember).toHaveBeenCalledWith(
      effectiveRepository,
      "admin-1",
      "user-2",
      {
        reason: undefined,
        ticketId: undefined,
        sessionRevoker: revokerInstance,
      },
    );
  });

  it("returns 400 for malformed JSON delete bodies", async () => {
    const route = await import(
      "../app/api/organizations/members/[userId]/route"
    );

    const response = await route.DELETE(
      new Request("http://localhost:3000/api/organizations/members/user-2", {
        body: "{",
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "user-2" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body",
    });
    expect(removeOrganizationMember).not.toHaveBeenCalled();
  });

  it("returns 400 for non-object JSON delete bodies", async () => {
    const route = await import(
      "../app/api/organizations/members/[userId]/route"
    );

    const response = await route.DELETE(
      new Request("http://localhost:3000/api/organizations/members/user-2", {
        body: "null",
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "user-2" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "JSON body must be an object",
    });
    expect(removeOrganizationMember).not.toHaveBeenCalled();
  });
});
