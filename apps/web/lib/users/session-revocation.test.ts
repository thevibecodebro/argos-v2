import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseAuthSessionRevoker } from "./session-revocation";

const { getServerEnv } = vi.hoisted(() => ({
  getServerEnv: vi.fn(),
}));

vi.mock("@/lib/server-env", () => ({
  getServerEnv,
}));

describe("SupabaseAuthSessionRevoker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    getServerEnv.mockReturnValue({
      supabaseUrl: "https://project.supabase.co",
      supabaseServiceRoleKey: "service-role-key",
    });
  });

  it("posts to the Supabase admin user logout endpoint with service role headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await new SupabaseAuthSessionRevoker().revokeUserSessions(
      "user/id with spaces",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/admin/users/user%2Fid%20with%20spaces/logout",
      {
        method: "POST",
        headers: {
          apikey: "service-role-key",
          authorization: "Bearer service-role-key",
        },
      },
    );
  });

  it("throws with status and truncated response body when Supabase rejects logout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("x".repeat(250)),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new SupabaseAuthSessionRevoker().revokeUserSessions("user-1"),
    ).rejects.toThrow(
      `Failed to revoke Supabase sessions for user-1: 500 ${"x".repeat(200)}`,
    );
  });
});
