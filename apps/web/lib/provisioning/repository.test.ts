import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

function createInviteQuery(result: {
  data: { id: string; org_id: string; email: string } | null;
  error: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn(() => ({ maybeSingle }));
  const gt = vi.fn(() => ({ limit }));
  const is = vi.fn(() => ({ gt }));
  const eq = vi.fn(() => ({ is }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from },
    from,
    select,
    eq,
    is,
    gt,
    limit,
    maybeSingle,
  };
}

describe("SupabaseProvisioningRepository", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createSupabaseAdminClient.mockReset();
  });

  it("queries pending invites by normalized email and maps the row", async () => {
    const query = createInviteQuery({
      data: {
        id: "invite-1",
        org_id: "org-1",
        email: "rep@argos.ai",
      },
      error: null,
    });
    createSupabaseAdminClient.mockReturnValue(query.client);
    const { SupabaseProvisioningRepository } = await import("./repository");
    const repository = new SupabaseProvisioningRepository();

    const result = await repository.findPendingInviteByEmail(
      "  Rep@Argos.AI  ",
    );

    expect(query.from).toHaveBeenCalledWith("invites");
    expect(query.select).toHaveBeenCalledWith("id, org_id, email");
    expect(query.eq).toHaveBeenCalledWith("email", "rep@argos.ai");
    expect(query.is).toHaveBeenCalledWith("accepted_at", null);
    expect(query.gt).toHaveBeenCalledWith(
      "expires_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(query.maybeSingle).toHaveBeenCalledOnce();
    expect(result).toEqual({
      id: "invite-1",
      orgId: "org-1",
      email: "rep@argos.ai",
    });
  });

  it("returns null when no pending invite exists", async () => {
    const query = createInviteQuery({
      data: null,
      error: null,
    });
    createSupabaseAdminClient.mockReturnValue(query.client);
    const { SupabaseProvisioningRepository } = await import("./repository");
    const repository = new SupabaseProvisioningRepository();

    await expect(
      repository.findPendingInviteByEmail("rep@argos.ai"),
    ).resolves.toBeNull();
  });

  it("throws Supabase errors from pending invite lookup", async () => {
    const query = createInviteQuery({
      data: null,
      error: { message: "database unavailable" },
    });
    createSupabaseAdminClient.mockReturnValue(query.client);
    const { SupabaseProvisioningRepository } = await import("./repository");
    const repository = new SupabaseProvisioningRepository();

    await expect(
      repository.findPendingInviteByEmail("rep@argos.ai"),
    ).rejects.toThrow("database unavailable");
  });
});
