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

  it("redirects anonymous platform routes to login", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/platform");

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fplatform",
    );
  });

  it("matches platform routes in Next middleware", async () => {
    const { config } = await import("../../middleware");

    expect(config.matcher).toContain("/platform/:path*");
  });

  it("skips Supabase auth work for routes outside the auth surface", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/privacy-policy");

    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("keeps the public homepage available for authenticated users", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/");

    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
