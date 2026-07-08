import { beforeEach, describe, expect, it, vi } from "vitest";

const eq = vi.fn((left, right) => ({ op: "eq", left, right }));
const and = vi.fn((...conditions) => ({ op: "and", conditions }));
const gt = vi.fn((left, right) => ({ op: "gt", left, right }));
const isNull = vi.fn((column) => ({ op: "isNull", column }));
const inArray = vi.fn((left, values) => ({ op: "inArray", left, values }));

vi.mock("drizzle-orm", () => ({
  and,
  eq,
  gt,
  inArray,
  isNull,
}));

vi.mock("@argos-v2/db", () => ({
  getDb: vi.fn(),
  invitesTable: {
    acceptedAt: "invites.acceptedAt",
    createdAt: "invites.createdAt",
    email: "invites.email",
    expiresAt: "invites.expiresAt",
    id: "invites.id",
    orgId: "invites.orgId",
    role: "invites.role",
    teamIds: "invites.teamIds",
    token: "invites.token",
  },
  teamMembershipsTable: {},
  teamsTable: {
    id: "teams.id",
    name: "teams.name",
    orgId: "teams.orgId",
    status: "teams.status",
  },
}));

describe("DrizzleInvitesRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes invite email before storing it", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        acceptedAt: null,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        email: "rep@acme.com",
        expiresAt: new Date("2026-05-05T10:00:00.000Z"),
        id: "invite-1",
        orgId: "org-1",
        role: "rep",
        teamIds: null,
        token: "token-1",
      },
    ]);
    const values = vi.fn(() => ({ returning }));
    const insert = vi.fn(() => ({ values }));
    const { DrizzleInvitesRepository } = await import("./supabase-repository");
    const repository = new DrizzleInvitesRepository({ insert } as never);

    await repository.createInvite({
      email: "  Rep@Acme.COM  ",
      expiresAt: new Date("2026-05-05T10:00:00.000Z"),
      orgId: "org-1",
      role: "rep",
      teamIds: null,
      token: "token-1",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "rep@acme.com",
      }),
    );
  });

  it("normalizes invite email before pending invite lookup", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const { DrizzleInvitesRepository } = await import("./supabase-repository");
    const repository = new DrizzleInvitesRepository({ select } as never);

    await repository.findPendingInviteByOrgAndEmail("org-1", "  Rep@Acme.COM  ");

    expect(eq).toHaveBeenCalledWith("invites.email", "rep@acme.com");
  });

  it("finds pending invites by email only when unaccepted and unexpired", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const { DrizzleInvitesRepository } = await import("./supabase-repository");
    const repository = new DrizzleInvitesRepository({ select } as never);

    await repository.findPendingInviteByEmail("  Rep@Acme.COM  ");

    expect(eq).toHaveBeenCalledWith("invites.email", "rep@acme.com");
    expect(isNull).toHaveBeenCalledWith("invites.acceptedAt");
    expect(gt).toHaveBeenCalledWith("invites.expiresAt", expect.any(Date));
    expect(eq).not.toHaveBeenCalledWith("invites.orgId", expect.anything());
  });
});
