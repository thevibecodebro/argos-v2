import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, signOut } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("auth signout route", () => {
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

  it("signs out with POST and redirects with see-other semantics", async () => {
    const route = await import("../app/auth/signout/route");
    const response = await route.POST(new Request("https://app.argos.ai/auth/signout", { method: "POST" }));

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://app.argos.ai/login");
  });

  it("handles legacy GET signout links without crashing", async () => {
    const route = await import("../app/auth/signout/route");
    const response = await route.GET(new Request("https://app.argos.ai/auth/signout"));

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://app.argos.ai/login");
  });
});
