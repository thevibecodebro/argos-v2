import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, signOut } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("auth invite-required route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createSupabaseServerClient.mockReset();
    signOut.mockReset();
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        signOut,
      },
    });
  });

  it("signs out and redirects to the invite-required auth error", async () => {
    const route = await import("../app/auth/invite-required/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/invite-required"),
    );

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/auth/error?reason=invite_required",
    );
  });
});
