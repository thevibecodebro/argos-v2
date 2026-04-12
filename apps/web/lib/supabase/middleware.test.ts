import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, getUserMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("does not throw on public routes when Supabase auth is temporarily unreachable", async () => {
    getUserMock.mockRejectedValue(
      Object.assign(new Error("fetch failed"), {
        __isAuthError: true,
        status: 0,
      }),
    );

    const request = new NextRequest("http://localhost:3000/login");

    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("redirects protected routes to login when auth refresh fails", async () => {
    getUserMock.mockRejectedValue(
      Object.assign(new Error("fetch failed"), {
        __isAuthError: true,
        status: 0,
      }),
    );

    const request = new NextRequest("http://localhost:3000/dashboard");

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard",
    );
  });
});
