import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, getUser } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

import { getAuthenticatedSupabaseUser } from "./get-authenticated-user";

describe("getAuthenticatedSupabaseUser", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser,
      },
    });
    getUser.mockReset();
  });

  it("returns null when Supabase reports a missing auth session", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth session missing!" },
    });

    await expect(getAuthenticatedSupabaseUser()).resolves.toBeNull();
  });

  it("throws unexpected auth errors", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    await expect(getAuthenticatedSupabaseUser()).rejects.toThrow("JWT expired");
  });

  it("returns null when Supabase auth is temporarily unreachable", async () => {
    getUser.mockRejectedValue(
      Object.assign(new Error("fetch failed"), {
        __isAuthError: true,
        status: 0,
      }),
    );

    await expect(getAuthenticatedSupabaseUser()).resolves.toBeNull();
  });

  it("returns the authenticated user when present", async () => {
    const user = { id: "auth-user-1", email: "manager@argos.ai" };
    getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    await expect(getAuthenticatedSupabaseUser()).resolves.toEqual(user);
  });
});
