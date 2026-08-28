import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const requireAuthenticatedManagedCapability = vi.fn();
const createCallsRepository = vi.fn();
const createCallRecordingSignedUrl = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/access/managed-capabilities-server", () => ({
  requireAuthenticatedManagedCapability,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/calls/service", async () => {
  const actual = await vi.importActual<typeof import("./calls/service")>("./calls/service");
  return {
    ...actual,
    createCallRecordingSignedUrl,
  };
});

describe("call recording signed url route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    requireAuthenticatedManagedCapability.mockReset();
    createCallsRepository.mockReset();
    createCallRecordingSignedUrl.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    requireAuthenticatedManagedCapability.mockImplementation(async () => {
      const user = await getAuthenticatedSupabaseUser();
      return user
        ? { ok: true, user, orgId: "org-1", access: { mode: "legacy" } }
        : { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
    });
    createCallsRepository.mockReturnValue({});
  });

  it(
    "returns a private no-store signed recording URL for an authorized caller",
    async () => {
      createCallRecordingSignedUrl.mockResolvedValue({
        ok: true,
        data: {
          url: "https://storage.example/signed-recording-token",
          expiresInSeconds: 300,
        },
      });

      const route = await import("../app/api/calls/[id]/recording-url/route");
      const response = await route.GET(
        new Request("http://localhost:3000/api/calls/call-1/recording-url"),
        { params: Promise.resolve({ id: "call-1" }) },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(createCallRecordingSignedUrl).toHaveBeenCalledWith({}, "auth-user-1", "call-1");
      await expect(response.json()).resolves.toEqual({
        url: "https://storage.example/signed-recording-token",
        expiresInSeconds: 300,
      });
    },
    10_000,
  );

  it("returns an access error without a URL when the existing call access check fails", async () => {
    createCallRecordingSignedUrl.mockResolvedValue({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have access to this rep",
    });

    const route = await import("../app/api/calls/[id]/recording-url/route");
    const response = await route.GET(
      new Request("http://localhost:3000/api/calls/call-1/recording-url"),
      { params: Promise.resolve({ id: "call-1" }) },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      code: "forbidden",
      error: "You do not have access to this rep",
    });
  });

  it("returns a generic 500 error when signed URL creation throws", async () => {
    createCallRecordingSignedUrl.mockRejectedValue(
      new Error("service role key leaked in storage signing failure"),
    );

    const route = await import("../app/api/calls/[id]/recording-url/route");
    const response = await route.GET(
      new Request("http://localhost:3000/api/calls/call-1/recording-url"),
      { params: Promise.resolve({ id: "call-1" }) },
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });
});
