import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseAuthSessionRevoker } from "./session-revocation";

const { createSupabaseAdminClient, updateUserById } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  updateUserById: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

describe("SupabaseAuthSessionRevoker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createSupabaseAdminClient.mockReset();
    updateUserById.mockReset();
    createSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById,
        },
      },
    });
  });

  it("suspends Supabase auth access through the supported admin user API", async () => {
    updateUserById.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    await new SupabaseAuthSessionRevoker().revokeUserSessions("user-1");

    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      ban_duration: "876000h",
    });
  });

  it("throws when Supabase rejects auth access suspension", async () => {
    updateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "auth service unavailable" },
    });

    await expect(
      new SupabaseAuthSessionRevoker().revokeUserSessions("user-1"),
    ).rejects.toThrow("Failed to suspend Supabase auth access for user-1: auth service unavailable");
  });
});
